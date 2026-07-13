import {z} from "zod";

import type {Qualification, Role} from "../domain/contracts.ts";
import {
  readMockDatabase,
  resetMockDatabase,
  type MockAccount,
  type MockDatabase,
  phoneNumberSchema,
  type StorageLike,
  writeMockDatabase,
} from "../mock/database.ts";
import {resetMockRuntime, runMockOperation} from "../mock/runtime.ts";

export type SessionAccount = Pick<
  MockAccount,
  | "id"
  | "displayName"
  | "email"
  | "phoneNumber"
  | "roles"
  | "verificationStatus"
  | "grants"
>;
export type IdentityRole = Extract<Role, "supplier" | "vendor" | "funder">;

export interface RegisterInput {
  displayName: string;
  email: string;
  phoneNumber: string;
  password: string;
  sliderVerified: boolean;
}

export type LoginInput =
  | {
      method: "password";
      identifier: string;
      password: string;
      sliderVerified: boolean;
    }
  | {method: "sms"; phoneNumber: string; code: string};

export type AuthContext = {
  storage?: StorageLike;
  clientKey?: string;
  now?: number;
};

const SMS_CODE = "246810";
const SMS_RESEND_MS = 60_000;
const SMS_TTL_MS = 5 * 60_000;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_COOLDOWN_MS = 60_000;

const requiredText = z.string().trim().min(1, "请填写完整资料");
const creditCode = z
  .string()
  .trim()
  .length(18, "统一社会信用代码应为 18 位")
  .transform((value) => value.toUpperCase());
const accountNumber = z
  .string()
  .trim()
  .regex(/^\d{8,32}$/, "银行账号应为 8 至 32 位数字");
const identityDocumentNumber = z
  .string()
  .trim()
  .regex(/^(?:\d{15}|\d{17}[\dXx])$/, "请输入有效的证件号");

export const verificationInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("personal"),
    legalName: requiredText,
    identityNumber: identityDocumentNumber,
    phoneNumber: z
      .string()
      .trim()
      .regex(/^1\d{10}$/, "请输入有效的手机号"),
    faceVerified: z.literal(true, {error: "请确认已完成人脸核验"}),
  }),
  z.object({
    kind: z.literal("enterprise"),
    companyName: requiredText,
    creditCode,
    representative: requiredText,
    representativeIdNumber: identityDocumentNumber,
    businessLicenseFileName: requiredText,
    bankName: requiredText,
    accountName: requiredText,
    accountNumber,
  }),
]);

const identityEnterpriseFields = {
  companyName: requiredText,
  creditCode,
  representative: requiredText,
  representativeIdNumber: identityDocumentNumber,
  businessLicenseFileName: requiredText,
  contactMethod: requiredText,
  bankName: requiredText,
  accountName: requiredText,
  accountNumber,
};

export const identityApplicationInputSchema = z.discriminatedUnion(
  "requestedRole",
  [
    z.object({
      requestedRole: z.literal("supplier"),
      ...identityEnterpriseFields,
      facilityAddress: requiredText,
      hasIdcLicense: z.literal(true, {error: "请确认已具备 IDC 经营资质"}),
      powerDescription: requiredText,
      coolingDescription: requiredText,
    }),
    z.object({requestedRole: z.literal("vendor"), ...identityEnterpriseFields}),
    z.object({requestedRole: z.literal("funder"), ...identityEnterpriseFields}),
  ],
);

export type VerificationInput = z.infer<typeof verificationInputSchema>;
export type IdentityApplicationInput = z.infer<
  typeof identityApplicationInputSchema
>;

export async function listDemoAccounts(storage?: StorageLike) {
  return runMockOperation(() =>
    readMockDatabase(storage).accounts.filter(({isDemo}) => isDemo).map(publicAccount),
  );
}

export async function getAccount(accountId: string, storage?: StorageLike) {
  return runMockOperation(() => {
    const account = readMockDatabase(storage).accounts.find(
      ({id}) => id === accountId,
    );
    return account ? publicAccount(account) : null;
  });
}

export async function login(
  input: LoginInput,
  context: AuthContext = {},
) {
  return runMockOperation(() => {
    const database = readMockDatabase(context.storage);
    const now = currentTime(context);
    if (input.method === "password") {
      if (!input.sliderVerified) throw new Error("请先完成安全验证");
      const identifier = input.identifier.trim().toLowerCase();
      const account = database.accounts.find(
        (candidate) =>
          (candidate.email.toLowerCase() === identifier ||
            candidate.phoneNumber === identifier),
      );
      const guardKeys = loginGuardKeys(account, identifier, context);
      assertLoginAvailable(database, guardKeys, now);
      if (!account || account.password !== input.password) {
        failLogin(
          database,
          guardKeys,
          now,
          context.storage,
          "账号或凭证不正确",
        );
      }
      clearLoginFailures(database, guardKeys, context.storage);
      return publicAccount(account);
    }

    const phoneNumber = parsePhoneNumber(input.phoneNumber);
    const challenge = database.smsChallenges.find(
      (candidate) =>
        candidate.phoneNumber === phoneNumber && candidate.expiresAtMs > now,
    );
    const account = database.accounts.find(
      (candidate) => candidate.phoneNumber === phoneNumber,
    );
    const guardKeys = loginGuardKeys(account, phoneNumber, context);
    assertLoginAvailable(database, guardKeys, now);
    if (!challenge || input.code.trim() !== SMS_CODE || !account) {
      failLogin(
        database,
        guardKeys,
        now,
        context.storage,
        "验证码无效或已过期",
      );
    }
    writeMockDatabase(
      {
        ...database,
        smsChallenges: database.smsChallenges.filter(
          (candidate) => candidate !== challenge,
        ),
        loginAttempts: database.loginAttempts.filter(
          (attempt) => !guardKeys.includes(attempt.key),
        ),
      },
      context.storage,
    );
    return publicAccount(account);
  });
}

export async function requestSmsCode(
  input: {phoneNumber: string; sliderVerified: boolean},
  context: AuthContext = {},
) {
  return runMockOperation(() => {
    if (!input.sliderVerified) throw new Error("请先完成安全验证");
    const phoneNumber = parsePhoneNumber(input.phoneNumber);
    const database = readMockDatabase(context.storage);
    const now = currentTime(context);
    const clientKey = mockClientKey(context);
    const existing = database.smsChallenges.find(
      (challenge) =>
        challenge.phoneNumber === phoneNumber || challenge.clientKey === clientKey,
    );
    if (existing && existing.resendAtMs > now) {
      const seconds = Math.ceil((existing.resendAtMs - now) / 1_000);
      throw new Error(`请 ${seconds} 秒后重新获取`);
    }

    writeMockDatabase(
      {
        ...database,
        smsChallenges: [
          ...database.smsChallenges.filter(
            (challenge) =>
              challenge.phoneNumber !== phoneNumber &&
              challenge.clientKey !== clientKey,
          ),
          {
            phoneNumber,
            clientKey,
            expiresAtMs: now + SMS_TTL_MS,
            resendAtMs: now + SMS_RESEND_MS,
          },
        ],
      },
      context.storage,
    );
    return {
      previewCode: SMS_CODE,
      resendAfterSeconds: SMS_RESEND_MS / 1_000,
    };
  });
}

export async function register(
  input: RegisterInput,
  storage?: StorageLike,
) {
  return runMockOperation(() => {
    if (!input.sliderVerified) throw new Error("请先完成安全验证");
    const database = readMockDatabase(storage);
    const email = input.email.trim().toLowerCase();
    const phoneNumber = parsePhoneNumber(input.phoneNumber);
    if (database.accounts.some((account) => account.email.toLowerCase() === email)) {
      throw new Error("该邮箱已注册");
    }
    if (database.accounts.some((account) => account.phoneNumber === phoneNumber)) {
      throw new Error("该手机号已注册");
    }

    const account: MockAccount = {
      id: createId("account"),
      displayName: input.displayName.trim(),
      email,
      phoneNumber,
      password: input.password,
      isDemo: false,
      roles: ["buyer"],
      verificationStatus: "unverified",
      grants: [],
    };
    writeMockDatabase(
      {...database, accounts: [...database.accounts, account]},
      storage,
    );
    return publicAccount(account);
  });
}

export async function verifyAccount(
  accountId: string,
  input: VerificationInput,
  storage?: StorageLike,
) {
  return runMockOperation(() => {
    const database = readMockDatabase(storage);
    const account = requiredAccount(database.accounts, accountId);
    if (account.verificationStatus === "verified") {
      throw new Error("当前账户已完成认证");
    }
    if (account.verificationStatus === "pending") {
      throw new Error("企业认证正在审核中");
    }

    const parsed = parseVerificationInput(input);
    const submittedAt = new Date().toISOString();
    const qualification = createVerificationQualification(
      account,
      parsed,
      submittedAt,
    );
    const verificationStatus =
      parsed.kind === "personal" ? "verified" : "pending";
    const updated: MockAccount = {...account, verificationStatus};
    writeMockDatabase(
      {
        ...database,
        accounts: database.accounts.map((candidate) =>
          candidate.id === accountId ? updated : candidate,
        ),
        qualifications: [...database.qualifications, qualification],
      },
      storage,
    );
    return publicAccount(updated);
  });
}

export async function applyForIdentity(
  accountId: string,
  input: IdentityApplicationInput,
  storage?: StorageLike,
) {
  return runMockOperation(() => {
    const database = readMockDatabase(storage);
    const account = requiredAccount(database.accounts, accountId);
    const parsed = parseIdentityApplicationInput(input);
    const {requestedRole} = parsed;
    if (account.verificationStatus !== "verified") {
      throw new Error("请先完成实名认证");
    }
    if (account.roles.includes(requestedRole)) {
      throw new Error("当前账户已具备该身份");
    }
    if (
      database.identityApplications.some(
        (application) =>
          application.accountId === accountId &&
          application.requestedRole === requestedRole &&
          application.status === "pending",
      )
    ) {
      throw new Error("该身份申请正在审核中");
    }

    const submittedAt = new Date().toISOString();
    const qualification = createIdentityQualification(accountId, parsed);
    const application = {
      id: createId("application"),
      accountId,
      requestedRole,
      qualificationId: qualification.id,
      status: "pending" as const,
      submittedAt,
    };
    writeMockDatabase(
      {
        ...database,
        qualifications: [...database.qualifications, qualification],
        identityApplications: [...database.identityApplications, application],
      },
      storage,
    );
    return application;
  });
}

export async function listIdentityApplications(
  accountId: string,
  storage?: StorageLike,
) {
  return runMockOperation(() =>
    readMockDatabase(storage).identityApplications.filter(
      (application) => application.accountId === accountId,
    ),
  );
}

export async function resetDemo(storage?: StorageLike) {
  resetMockRuntime();
  return resetMockDatabase(storage).accounts.map(publicAccount);
}

function publicAccount(account: MockAccount): SessionAccount {
  return {
    id: account.id,
    displayName: account.displayName,
    email: account.email,
    phoneNumber: account.phoneNumber,
    roles: account.roles,
    verificationStatus: account.verificationStatus,
    grants: account.grants,
  };
}

function parsePhoneNumber(value: string) {
  const result = phoneNumberSchema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "请输入有效的手机号");
  }
  return result.data;
}

function currentTime(context: AuthContext) {
  return context.now ?? Date.now();
}

function loginGuardKeys(
  account: MockAccount | undefined,
  identifier: string,
  context: AuthContext,
) {
  return [
    account ? `account:${account.id}` : `identifier:${identifier}`,
    `client:${mockClientKey(context)}`,
  ];
}

function mockClientKey(context: AuthContext) {
  // ponytail: the browser key models one client; B0 must use server-derived IP and shared storage.
  return context.clientKey ?? "browser";
}

function assertLoginAvailable(
  database: MockDatabase,
  guardKeys: readonly string[],
  now: number,
) {
  const cooldownUntilMs = Math.max(
    0,
    ...database.loginAttempts
      .filter(
        (attempt) =>
          guardKeys.includes(attempt.key) &&
          attempt.cooldownUntilMs !== null &&
          attempt.cooldownUntilMs > now,
      )
      .map((attempt) => attempt.cooldownUntilMs ?? 0),
  );
  if (cooldownUntilMs > now) {
    throw cooldownError(cooldownUntilMs, now);
  }
}

function failLogin(
  database: MockDatabase,
  guardKeys: readonly string[],
  now: number,
  storage: StorageLike | undefined,
  message: string,
): never {
  let cooldownUntilMs = 0;
  const untouched = database.loginAttempts.filter(
    (attempt) => !guardKeys.includes(attempt.key),
  );
  const updated = guardKeys.map((key) => {
    const existing = database.loginAttempts.find((attempt) => attempt.key === key);
    const failures =
      existing?.cooldownUntilMs && existing.cooldownUntilMs <= now
        ? 1
        : (existing?.failures ?? 0) + 1;
    const nextCooldown =
      failures >= MAX_LOGIN_FAILURES ? now + LOGIN_COOLDOWN_MS : null;
    cooldownUntilMs = Math.max(cooldownUntilMs, nextCooldown ?? 0);
    return {key, failures, cooldownUntilMs: nextCooldown};
  });
  writeMockDatabase(
    {...database, loginAttempts: [...untouched, ...updated]},
    storage,
  );
  if (cooldownUntilMs > now) throw cooldownError(cooldownUntilMs, now);
  throw new Error(message);
}

function clearLoginFailures(
  database: MockDatabase,
  guardKeys: readonly string[],
  storage: StorageLike | undefined,
) {
  if (!database.loginAttempts.some((attempt) => guardKeys.includes(attempt.key))) {
    return;
  }
  writeMockDatabase(
    {
      ...database,
      loginAttempts: database.loginAttempts.filter(
        (attempt) => !guardKeys.includes(attempt.key),
      ),
    },
    storage,
  );
}

function cooldownError(cooldownUntilMs: number, now: number) {
  const seconds = Math.ceil((cooldownUntilMs - now) / 1_000);
  return new Error(`尝试次数过多，请 ${seconds} 秒后重试`);
}

function parseVerificationInput(input: VerificationInput) {
  const result = verificationInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "认证资料不完整");
  }
  return result.data;
}

function parseIdentityApplicationInput(input: IdentityApplicationInput) {
  const result = identityApplicationInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "资质资料不完整");
  }
  return result.data;
}

function createVerificationQualification(
  account: MockAccount,
  input: VerificationInput,
  submittedAt: string,
): Qualification {
  if (input.kind === "personal") {
    return {
      id: createId("qualification"),
      accountId: account.id,
      kind: "personal",
      subjectName: input.legalName,
      unifiedSocialCreditCode: null,
      region: null,
      contactName: input.legalName,
      contactMethod: maskPhone(input.phoneNumber),
      legalRepresentative: null,
      settlementAccount: null,
      facilityProfile: null,
      documents: [
        {
          kind: "identityCard",
          number: maskIdentityNumber(input.identityNumber),
          attachmentName: "在线身份信息",
          expiresAt: null,
        },
        {
          kind: "faceVerification",
          number: "confirmed",
          attachmentName: "人脸核验确认",
          expiresAt: null,
        },
      ],
      status: "approved",
      review: {
        reviewerId: "mock-personal-verifier",
        reviewedAt: submittedAt,
        reason: null,
      },
      merchantOnboardingStatus: "notStarted",
      expiresAt: null,
    };
  }

  return {
    id: createId("qualification"),
    accountId: account.id,
    kind: "enterprise",
    subjectName: input.companyName,
    unifiedSocialCreditCode: input.creditCode,
    region: null,
    contactName: input.representative,
    contactMethod: account.email,
    legalRepresentative: {
      name: input.representative,
      idDocumentHint: maskIdentityNumber(input.representativeIdNumber),
    },
    settlementAccount: {
      accountName: input.accountName,
      bankName: input.bankName,
      accountNumberHint: maskAccountNumber(input.accountNumber),
    },
    facilityProfile: null,
    documents: [
      {
        kind: "businessLicense",
        number: input.creditCode,
        attachmentName: input.businessLicenseFileName,
        expiresAt: null,
      },
    ],
    status: "pending",
    review: null,
    merchantOnboardingStatus: "pending",
    expiresAt: null,
  };
}

function createIdentityQualification(
  accountId: string,
  input: IdentityApplicationInput,
): Qualification {
  return {
    id: createId("qualification"),
    accountId,
    kind: input.requestedRole,
    subjectName: input.companyName,
    unifiedSocialCreditCode: input.creditCode,
    region: null,
    contactName: input.representative,
    contactMethod: maskContactMethod(input.contactMethod),
    legalRepresentative: {
      name: input.representative,
      idDocumentHint: maskIdentityNumber(input.representativeIdNumber),
    },
    settlementAccount: {
      accountName: input.accountName,
      bankName: input.bankName,
      accountNumberHint: maskAccountNumber(input.accountNumber),
    },
    facilityProfile:
      input.requestedRole === "supplier"
        ? {
            address: input.facilityAddress,
            hasIdcLicense: input.hasIdcLicense,
            powerDescription: input.powerDescription,
            coolingDescription: input.coolingDescription,
          }
        : null,
    documents: [
      {
        kind: "businessLicense",
        number: input.creditCode,
        attachmentName: input.businessLicenseFileName,
        expiresAt: null,
      },
    ],
    status: "pending",
    review: null,
    merchantOnboardingStatus: "pending",
    expiresAt: null,
  };
}

function maskIdentityNumber(value: string) {
  return `${value.slice(0, 3)}${"*".repeat(value.length - 7)}${value.slice(-4)}`;
}

function maskPhone(value: string) {
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function maskAccountNumber(value: string) {
  return `****${value.slice(-4)}`;
}

function maskContactMethod(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 7 && /^\+?[\d\s-]+$/.test(value)
    ? `${digits.slice(0, 3)}****${digits.slice(-4)}`
    : value;
}

function requiredAccount(accounts: MockAccount[], accountId: string) {
  const account = accounts.find(({id}) => id === accountId);
  if (!account) throw new Error("账户不存在，请重新登录");
  return account;
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

import {z} from "zod";

import {
  accountSchema,
  qualificationSchema,
  roleSchema,
} from "../domain/contracts.ts";
import {capabilities} from "../domain/permissions.ts";

export const MOCK_DATABASE_VERSION = 3 as const;
export const MOCK_DATABASE_STORAGE_KEY = "compute-exchange:mock-db";

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^1\d{10}$/, "请输入有效的手机号");

const mockAccountSchema = accountSchema.extend({
  email: z.string().email(),
  phoneNumber: phoneNumberSchema,
  password: z.string().min(8),
  isDemo: z.boolean(),
  grants: z.array(z.enum(capabilities)).default([]),
});

const identityApplicationSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  requestedRole: roleSchema.exclude(["guest", "buyer", "operator", "admin"]),
  qualificationId: z.string().min(1),
  status: z.literal("pending"),
  submittedAt: z.string().datetime({offset: true}),
});

const smsChallengeSchema = z.object({
  phoneNumber: phoneNumberSchema,
  clientKey: z.string().min(1),
  expiresAtMs: z.number().int().nonnegative(),
  resendAtMs: z.number().int().nonnegative(),
});

const loginAttemptSchema = z.object({
  key: z.string().min(1),
  failures: z.number().int().nonnegative(),
  cooldownUntilMs: z.number().int().nonnegative().nullable(),
});

const mockDatabaseSchema = z.object({
  version: z.literal(MOCK_DATABASE_VERSION),
  accounts: z.array(mockAccountSchema).min(1),
  qualifications: z.array(qualificationSchema),
  identityApplications: z.array(identityApplicationSchema),
  smsChallenges: z.array(smsChallengeSchema),
  loginAttempts: z.array(loginAttemptSchema),
});

export type MockAccount = z.infer<typeof mockAccountSchema>;
export type IdentityApplication = z.infer<typeof identityApplicationSchema>;
export type MockDatabase = z.infer<typeof mockDatabaseSchema>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const storageMirrors = new WeakMap<StorageLike, MockDatabase>();
const storageFallbacks = new WeakSet<StorageLike>();
let browserMemoryDatabase: MockDatabase | null = null;

const operatorGrants = capabilities.filter(
  (capability) =>
    capability !== "manageAccess" && capability !== "manageCompliance",
);

export function createSeedDatabase(): MockDatabase {
  return {
    version: MOCK_DATABASE_VERSION,
    accounts: [
      {
        id: "account-buyer",
        displayName: "采购中心",
        email: "buyer@compute.local",
        phoneNumber: "13800000001",
        password: "demo1234",
        isDemo: true,
        roles: ["buyer"],
        verificationStatus: "verified",
        grants: [],
      },
      {
        id: "account-supplier",
        displayName: "昆仑算力",
        email: "supplier@compute.local",
        phoneNumber: "13800000002",
        password: "demo1234",
        isDemo: true,
        roles: ["supplier", "buyer"],
        verificationStatus: "verified",
        grants: [],
      },
      {
        id: "account-vendor",
        displayName: "锐驰设备",
        email: "vendor@compute.local",
        phoneNumber: "13800000003",
        password: "demo1234",
        isDemo: true,
        roles: ["vendor", "buyer"],
        verificationStatus: "verified",
        grants: [],
      },
      {
        id: "account-funder",
        displayName: "远望资本",
        email: "funder@compute.local",
        phoneNumber: "13800000004",
        password: "demo1234",
        isDemo: true,
        roles: ["funder", "buyer"],
        verificationStatus: "verified",
        grants: [],
      },
      {
        id: "account-operator",
        displayName: "平台运营",
        email: "operator@compute.local",
        phoneNumber: "13800000005",
        password: "demo1234",
        isDemo: true,
        roles: ["operator"],
        verificationStatus: "verified",
        grants: operatorGrants,
      },
      {
        id: "account-admin",
        displayName: "系统管理员",
        email: "admin@compute.local",
        phoneNumber: "13800000006",
        password: "demo1234",
        isDemo: true,
        roles: ["admin"],
        verificationStatus: "verified",
        grants: capabilities.slice(),
      },
    ],
    qualifications: [],
    identityApplications: [],
    smsChallenges: [],
    loginAttempts: [],
  };
}

export function parseDatabaseSnapshot(
  serialized: string | null | undefined,
): MockDatabase {
  if (!serialized) return createSeedDatabase();

  try {
    const result = mockDatabaseSchema.safeParse(JSON.parse(serialized));
    return result.success ? result.data : createSeedDatabase();
  } catch {
    return createSeedDatabase();
  }
}

export function readMockDatabase(storage?: StorageLike): MockDatabase {
  const target = storage ?? browserStorage();
  if (!target) return browserMemoryDatabase ?? createSeedDatabase();
  const mirror = storageMirrors.get(target);
  if (storageFallbacks.has(target) && mirror) return mirror;
  try {
    const serialized = target.getItem(MOCK_DATABASE_STORAGE_KEY);
    return parseDatabaseSnapshot(serialized);
  } catch {
    return mirror ?? browserMemoryDatabase ?? createSeedDatabase();
  }
}

export function writeMockDatabase(
  database: MockDatabase,
  storage?: StorageLike,
): MockDatabase {
  const parsed = mockDatabaseSchema.parse(database);
  if (!storage && typeof window !== "undefined") browserMemoryDatabase = parsed;
  const target = storage ?? browserStorage();
  if (!target) return parsed;
  storageMirrors.set(target, parsed);
  try {
    target.setItem(MOCK_DATABASE_STORAGE_KEY, JSON.stringify(parsed));
    storageFallbacks.delete(target);
  } catch {
    storageFallbacks.add(target);
  }
  return parsed;
}

export function resetMockDatabase(storage?: StorageLike): MockDatabase {
  const seed = createSeedDatabase();
  if (!storage && typeof window !== "undefined") browserMemoryDatabase = seed;
  const target = storage ?? browserStorage();
  if (!target) return seed;
  storageMirrors.set(target, seed);
  try {
    target.setItem(MOCK_DATABASE_STORAGE_KEY, JSON.stringify(seed));
    storageFallbacks.delete(target);
  } catch {
    storageFallbacks.add(target);
  }
  return seed;
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {homeForRole} from "../domain/routes.ts";
import {
  resolveActiveRole,
  safeNextPath,
} from "../auth/session.ts";
import {
  applyForIdentity,
  getAccount,
  listDemoAccounts,
  login,
  requestSmsCode,
  register,
  resetDemo,
  verifyAccount,
} from "../auth/service.ts";
import {
  createSeedDatabase,
  parseDatabaseSnapshot,
  readMockDatabase,
  resetMockDatabase,
  type StorageLike,
  writeMockDatabase,
} from "./database.ts";
import {
  failNextMockOperation,
  resetMockRuntime,
  runMockOperation,
  setMockLatency,
} from "./runtime.ts";

describe("mock session contract", () => {
  it("accepts only internal post-login destinations", () => {
    assert.equal(safeNextPath("/console/buyer?tab=orders"), "/console/buyer?tab=orders");
    assert.equal(safeNextPath("//example.com"), null);
    assert.equal(safeNextPath("https://example.com"), null);
    assert.equal(safeNextPath("/\\example.com"), null);
    assert.equal(safeNextPath("/..//evil.com"), null);
    assert.equal(safeNextPath("/%2e%2e//evil.com"), null);
  });

  it("keeps an available active role and falls back deterministically", () => {
    assert.equal(resolveActiveRole(["buyer", "supplier"], "supplier"), "supplier");
    assert.equal(resolveActiveRole(["buyer", "supplier"], "admin"), "buyer");
    assert.equal(homeForRole(resolveActiveRole(["operator"], null)), "/admin");
  });
});

describe("versioned mock database", () => {
  it("provides unique seed accounts for every A1 workspace", () => {
    const database = createSeedDatabase();
    const emails = database.accounts.map(({email}) => email);

    assert.equal(new Set(emails).size, emails.length);
    for (const role of ["buyer", "supplier", "vendor", "funder", "operator", "admin"] as const) {
      assert.equal(
        database.accounts.some(({roles}) => roles.includes(role)),
        true,
      );
    }
    for (const account of database.accounts) {
      assert.equal(
        homeForRole(resolveActiveRole(account.roles, null)),
        homeForRole(account.roles[0]),
      );
    }
  });

  it("falls back to a valid seed when persisted data is corrupt", () => {
    assert.deepEqual(parseDatabaseSnapshot("not-json"), createSeedDatabase());
    assert.deepEqual(
      parseDatabaseSnapshot(JSON.stringify({version: 99, accounts: []})),
      createSeedDatabase(),
    );
  });

  it("keeps mock operations usable when browser storage is unavailable", () => {
    const unavailableStorage: StorageLike = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    const seed = createSeedDatabase();

    assert.deepEqual(readMockDatabase(unavailableStorage), seed);
    assert.deepEqual(writeMockDatabase(seed, unavailableStorage), seed);
    assert.deepEqual(resetMockDatabase(unavailableStorage), seed);
  });
});

describe("deterministic mock runtime", () => {
  it("fails exactly the next operation and resets cleanly", async () => {
    setMockLatency(0);
    failNextMockOperation("模拟服务不可用");

    await assert.rejects(runMockOperation(() => "first"), /模拟服务不可用/);
    assert.equal(await runMockOperation(() => "second"), "second");

    resetMockRuntime();
    setMockLatency(0);
    assert.equal(await runMockOperation(() => "third"), "third");
  });
});

describe("mock authentication service", () => {
  it("keeps session state usable when persistent storage is unavailable", async () => {
    const storage = createUnavailableStorage();
    setMockLatency(0);

    const registered = await register(
      {
        displayName: "内存回退账户",
        email: "memory-fallback@example.com",
        phoneNumber: "13800138015",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );
    assert.equal((await getAccount(registered.id, storage))?.id, registered.id);

    const delivery = await requestSmsCode(
      {phoneNumber: registered.phoneNumber, sliderVerified: true},
      {clientKey: "memory-fallback", now: 50_000, storage},
    );
    assert.equal(
      (
        await login(
          {
            method: "sms",
            phoneNumber: registered.phoneNumber,
            code: delivery.previewCode,
          },
          {clientKey: "memory-fallback", now: 51_000, storage},
        )
      ).id,
      registered.id,
    );
  });

  it("keeps newer session writes ahead of a stale read-only snapshot", async () => {
    const storage = createReadOnlyStorage(createSeedDatabase());
    setMockLatency(0);

    const registered = await register(
      {
        displayName: "只读回退账户",
        email: "read-only-fallback@example.com",
        phoneNumber: "13800138016",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );

    assert.equal((await getAccount(registered.id, storage))?.id, registered.id);
  });

  it("registers one unique phone number without exposing internal account fields", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);

    const account = await register(
      {
        displayName: "北辰科技",
        email: "phone@beichen.example",
        phoneNumber: "13800138001",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );

    assert.equal(account.phoneNumber, "13800138001");
    assert.equal("password" in account, false);
    assert.equal("isDemo" in account, false);

    await assert.rejects(
      register(
        {
          displayName: "重复手机号",
          email: "other@beichen.example",
          phoneNumber: "13800138001",
          password: "secure123",
          sliderVerified: true,
        },
        storage,
      ),
      /手机号已注册/,
    );
  });

  it("requires the slider before creating an account", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);

    await assert.rejects(
      register(
        {
          displayName: "未验证账户",
          email: "unchecked@example.com",
          phoneNumber: "13800138009",
          password: "secure123",
          sliderVerified: false,
        },
        storage,
      ),
      /安全验证/,
    );
  });

  it("requires the slider before password login and accepts email or phone", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);

    await assert.rejects(
      login(
        {
          method: "password",
          identifier: "buyer@compute.local",
          password: "demo1234",
          sliderVerified: false,
        },
        {clientKey: "client-a", now: 1_000, storage},
      ),
      /安全验证/,
    );

    assert.equal(
      (
        await login(
          {
            method: "password",
            identifier: "13800000001",
            password: "demo1234",
            sliderVerified: true,
          },
          {clientKey: "client-a", now: 1_000, storage},
        )
      ).id,
      "account-buyer",
    );
    assert.equal(
      (
        await login(
          {
            method: "password",
            identifier: "SUPPLIER@COMPUTE.LOCAL",
            password: "demo1234",
            sliderVerified: true,
          },
          {clientKey: "client-a", now: 1_000, storage},
        )
      ).id,
      "account-supplier",
    );
  });

  it("sends a one-time SMS code after slider verification and consumes it on login", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);

    await assert.rejects(
      requestSmsCode(
        {phoneNumber: "13800000001", sliderVerified: false},
        {clientKey: "client-sms", now: 2_000, storage},
      ),
      /安全验证/,
    );

    const delivery = await requestSmsCode(
      {phoneNumber: "13800000001", sliderVerified: true},
      {clientKey: "client-sms", now: 2_000, storage},
    );
    assert.equal(delivery.previewCode, "246810");
    assert.equal(delivery.resendAfterSeconds, 60);

    const account = await login(
      {method: "sms", phoneNumber: "13800000001", code: delivery.previewCode},
      {clientKey: "client-sms", now: 3_000, storage},
    );
    assert.equal(account.id, "account-buyer");

    await assert.rejects(
      login(
        {method: "sms", phoneNumber: "13800000001", code: delivery.previewCode},
        {clientKey: "client-sms", now: 3_000, storage},
      ),
      /验证码无效或已过期/,
    );
  });

  it("cools down an account after five consecutive failed logins", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    const failedLogin = (now: number, password = "wrong-pass") =>
      login(
        {
          method: "password",
          identifier: "buyer@compute.local",
          password,
          sliderVerified: true,
        },
        {clientKey: "client-rate-account", now, storage},
      );

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await assert.rejects(failedLogin(10_000), /账号或凭证不正确/);
    }
    await assert.rejects(failedLogin(10_000), /60 秒后重试/);
    await assert.rejects(failedLogin(69_999, "demo1234"), /1 秒后重试/);
    assert.equal((await failedLogin(70_000, "demo1234")).id, "account-buyer");
  });

  it("applies the failure cooldown across accounts for the same client", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    const identifiers = [
      "buyer@compute.local",
      "supplier@compute.local",
      "vendor@compute.local",
      "funder@compute.local",
      "operator@compute.local",
    ];

    for (const [index, identifier] of identifiers.entries()) {
      await assert.rejects(
        login(
          {
            method: "password",
            identifier,
            password: "wrong-pass",
            sliderVerified: true,
          },
          {clientKey: "shared-client", now: 20_000, storage},
        ),
        index === identifiers.length - 1
          ? /60 秒后重试/
          : /账号或凭证不正确/,
      );
    }

    await assert.rejects(
      login(
        {
          method: "password",
          identifier: "admin@compute.local",
          password: "demo1234",
          sliderVerified: true,
        },
        {clientKey: "shared-client", now: 20_001, storage},
      ),
      /60 秒后重试/,
    );
  });

  it("enforces SMS resend and expiry windows", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    const input = {phoneNumber: "13800000002", sliderVerified: true};
    const delivery = await requestSmsCode(input, {
      clientKey: "sms-window",
      now: 30_000,
      storage,
    });

    await assert.rejects(
      requestSmsCode(input, {
        clientKey: "sms-window",
        now: 30_001,
        storage,
      }),
      /60 秒后重新获取/,
    );
    await assert.rejects(
      login(
        {
          method: "sms",
          phoneNumber: input.phoneNumber,
          code: delivery.previewCode,
        },
        {clientKey: "sms-window", now: 330_000, storage},
      ),
      /验证码无效或已过期/,
    );
  });

  it("prevents one client from bypassing SMS cooldown with another phone", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);

    await requestSmsCode(
      {phoneNumber: "13800000003", sliderVerified: true},
      {clientKey: "sms-shared-client", now: 35_000, storage},
    );
    await assert.rejects(
      requestSmsCode(
        {phoneNumber: "13800000004", sliderVerified: true},
        {clientKey: "sms-shared-client", now: 35_001, storage},
      ),
      /60 秒后重新获取/,
    );
  });

  it("persists only masked personal verification hints and verifies the account", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);

    const account = await register(
      {
        displayName: "北辰科技",
        email: "team@beichen.example",
        phoneNumber: "13800138010",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );
    assert.deepEqual(account.roles, ["buyer"]);
    assert.equal(account.verificationStatus, "unverified");
    assert.equal("password" in account, false);

    const verified = await verifyAccount(
      account.id,
      {
        kind: "personal",
        legalName: "林晓",
        identityNumber: "110105199001011234",
        phoneNumber: "13800138000",
        faceVerified: true,
      },
      storage,
    );
    assert.equal(verified.verificationStatus, "verified");

    const database = readMockDatabase(storage);
    const qualification = database.qualifications.at(-1);
    assert.equal(qualification?.kind, "personal");
    assert.equal(qualification?.status, "approved");
    assert.equal(qualification?.contactMethod, "138****8000");
    assert.equal(
      qualification?.documents.find(({kind}) => kind === "identityCard")?.number,
      "110***********1234",
    );
    const snapshot = JSON.stringify(database);
    assert.equal(snapshot.includes("110105199001011234"), false);
    assert.equal(snapshot.includes("13800138000"), false);
  });

  it("persists enterprise verification for review with masked settlement details", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    const account = await register(
      {
        displayName: "北辰科技",
        email: "enterprise@beichen.example",
        phoneNumber: "13800138011",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );

    const pending = await verifyAccount(
      account.id,
      {
        kind: "enterprise",
        companyName: "北辰科技有限公司",
        creditCode: "91310110MA1ABCDE12",
        representative: "林晓",
        representativeIdNumber: "110105199001011234",
        businessLicenseFileName: "license.pdf",
        bankName: "示例银行",
        accountName: "北辰科技有限公司",
        accountNumber: "6222021234567890123",
      },
      storage,
    );

    assert.equal(pending.verificationStatus, "pending");
    const qualification = readMockDatabase(storage).qualifications.at(-1);
    assert.equal(qualification?.kind, "enterprise");
    assert.equal(qualification?.status, "pending");
    assert.equal(qualification?.contactName, "林晓");
    assert.equal(qualification?.legalRepresentative?.name, "林晓");
    assert.equal(
      qualification?.legalRepresentative?.idDocumentHint,
      "110***********1234",
    );
    assert.equal(qualification?.documents[0]?.attachmentName, "license.pdf");
    assert.equal(qualification?.settlementAccount?.accountNumberHint, "****0123");
    assert.equal(
      JSON.stringify(qualification).includes("6222021234567890123"),
      false,
    );
    assert.equal(
      JSON.stringify(qualification).includes("110105199001011234"),
      false,
    );
  });

  it("links every identity application to its qualification without granting the role", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    const account = await register(
      {
        displayName: "北辰科技",
        email: "identity@beichen.example",
        phoneNumber: "13800138012",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );
    await verifyAccount(
      account.id,
      {
        kind: "personal",
        legalName: "林晓",
        identityNumber: "110105199001011234",
        phoneNumber: "13800138000",
        faceVerified: true,
      },
      storage,
    );

    const application = await applyForIdentity(
      account.id,
      {
        requestedRole: "supplier",
        companyName: "北辰智算有限公司",
        creditCode: "91310110MA1ABCDE12",
        representative: "林晓",
        representativeIdNumber: "110105199001011234",
        businessLicenseFileName: "license.pdf",
        contactMethod: "13800138000",
        bankName: "示例银行",
        accountName: "北辰智算有限公司",
        accountNumber: "6222021234567890123",
        facilityAddress: "上海市嘉定区算力路 1 号",
        hasIdcLicense: true,
        powerDescription: "双路市电与 UPS",
        coolingDescription: "液冷与风冷混合",
      },
      storage,
    );
    assert.equal(application.status, "pending");
    const database = readMockDatabase(storage);
    const qualification = database.qualifications.find(
      ({id}) => id === application.qualificationId,
    );
    assert.equal(qualification?.kind, "supplier");
    assert.equal(qualification?.legalRepresentative?.name, "林晓");
    assert.equal(
      qualification?.legalRepresentative?.idDocumentHint,
      "110***********1234",
    );
    assert.equal(qualification?.facilityProfile?.hasIdcLicense, true);
    assert.equal(qualification?.settlementAccount?.accountNumberHint, "****0123");
    assert.deepEqual(database.accounts.find(({id}) => id === account.id)?.roles, ["buyer"]);
    assert.equal(JSON.stringify(qualification).includes("110105199001011234"), false);
    await assert.rejects(
      applyForIdentity(
        account.id,
        {
          requestedRole: "supplier",
          companyName: "北辰智算有限公司",
          creditCode: "91310110MA1ABCDE12",
          representative: "林晓",
          representativeIdNumber: "110105199001011234",
          businessLicenseFileName: "license.pdf",
          contactMethod: "13800138000",
          bankName: "示例银行",
          accountName: "北辰智算有限公司",
          accountNumber: "6222021234567890123",
          facilityAddress: "上海市嘉定区算力路 1 号",
          hasIdcLicense: true,
          powerDescription: "双路市电与 UPS",
          coolingDescription: "液冷与风冷混合",
        },
        storage,
      ),
      /正在审核中/,
    );
  });

  it("keeps newly registered accounts out of the demo shortcut list", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    const registered = await register(
      {
        displayName: "普通账户",
        email: "regular@example.com",
        phoneNumber: "13800138013",
        password: "secure123",
        sliderVerified: true,
      },
      storage,
    );

    const demos = await listDemoAccounts(storage);
    assert.equal(demos.length, createSeedDatabase().accounts.length);
    assert.equal(demos.some(({id}) => id === registered.id), false);

    await assert.rejects(
      register(
        {
          displayName: "重复账户",
          email: "REGULAR@EXAMPLE.COM",
          phoneNumber: "13800138014",
          password: "secure123",
          sliderVerified: true,
        },
        storage,
      ),
      /已注册/,
    );
  });

  it("authenticates seeded accounts without exposing their password", async () => {
    const account = await login(
      {
        method: "password",
        identifier: "SUPPLIER@COMPUTE.LOCAL",
        password: "demo1234",
        sliderVerified: true,
      },
      {storage: createMemoryStorage()},
    );
    assert.equal(account.roles.includes("supplier"), true);
    assert.equal("password" in account, false);
  });

  it("resets persisted data even when the next operation was set to fail", async () => {
    const storage = createMemoryStorage();
    setMockLatency(0);
    await requestSmsCode(
      {phoneNumber: "13800000001", sliderVerified: true},
      {clientKey: "reset-client", now: 40_000, storage},
    );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assert.rejects(
        login(
          {
            method: "password",
            identifier: "buyer@compute.local",
            password: "wrong-pass",
            sliderVerified: true,
          },
          {clientKey: "reset-client", now: 40_000, storage},
        ),
      );
    }
    failNextMockOperation("不应阻止重置");

    const accounts = await resetDemo(storage);
    assert.equal(accounts.length, createSeedDatabase().accounts.length);
    setMockLatency(0);
    assert.equal(
      (
        await requestSmsCode(
          {phoneNumber: "13800000001", sliderVerified: true},
          {clientKey: "reset-client", now: 40_000, storage},
        )
      ).previewCode,
      "246810",
    );
    assert.equal(
      (
        await login(
          {
            method: "password",
            identifier: "buyer@compute.local",
            password: "demo1234",
            sliderVerified: true,
          },
          {storage},
        )
      ).id,
      "account-buyer",
    );
  });
});

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

function createUnavailableStorage(): StorageLike {
  return {
    getItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
    setItem: () => {
      throw new DOMException("full", "QuotaExceededError");
    },
    removeItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
}

function createReadOnlyStorage(database: ReturnType<typeof createSeedDatabase>): StorageLike {
  const serialized = JSON.stringify(database);
  return {
    getItem: () => serialized,
    setItem: () => {
      throw new DOMException("full", "QuotaExceededError");
    },
    removeItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
}

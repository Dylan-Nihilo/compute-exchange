import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  attestationSchema,
  complianceGateSchema,
  computeOrderSchema,
  computeProductSchema,
  qualificationSchema,
  splitRecordSchema,
  tokenAccountSchema,
  tokenModelSchema,
} from "./contracts.ts";
import {accessFor} from "./permissions.ts";
import {
  accessLevelForRoute,
  canAccessRoute,
  homeForRole,
  matchRoute,
  routes,
} from "./routes.ts";
import {
  applyOrderEvent,
  canApplyOrderTransition,
  canStartSplit,
  canTransition,
} from "./state-machines.ts";

describe("domain state transitions", () => {
  it("allows resubmission but prevents skipping qualification review", () => {
    assert.equal(canTransition("qualification", "rejected", "pending"), true);
    assert.equal(canTransition("qualification", "pending", "approved"), false);
  });

  it("requires delivery acceptance before active fulfillment", () => {
    assert.equal(canTransition("fulfillment", "awaitingAcceptance", "active"), true);
    assert.equal(canTransition("fulfillment", "provisioning", "active"), false);
  });

  it("requires every split to pass through the delayed state", () => {
    assert.equal(canTransition("split", "pending", "processing"), false);
    assert.equal(canTransition("split", "pending", "delayed"), true);
    assert.equal(canTransition("split", "succeeded", "reconciled"), true);
    assert.equal(canTransition("split", "delayed", "reconciled"), false);
  });

  it("starts splitting only after accepted, undisputed delivery", () => {
    assert.equal(
      canStartSplit({
        acceptanceStatus: "buyerAccepted",
        disputeStatus: "none",
        riskStatus: "clear",
      }),
      true,
    );
    assert.equal(
      canStartSplit({
        acceptanceStatus: "pending",
        disputeStatus: "none",
        riskStatus: "clear",
      }),
      false,
    );
  });

  it("blocks cross-state order transitions while acceptance, disputes, or risk are unresolved", () => {
    const pendingAcceptance = {
      fulfillmentStatus: "awaitingAcceptance",
      paymentStatus: "paid",
      acceptanceStatus: "pending",
      riskStatus: "clear",
      disputeStatus: "none",
      splitStatus: "delayed",
      hasFulfillmentCredential: true,
    } as const;

    assert.equal(
      canApplyOrderTransition(pendingAcceptance, {
        machine: "fulfillment",
        from: "awaitingAcceptance",
        to: "active",
      }),
      false,
    );
    assert.equal(
      canApplyOrderTransition(
        {...pendingAcceptance, acceptanceStatus: "buyerAccepted"},
        {machine: "fulfillment", from: "awaitingAcceptance", to: "active"},
      ),
      true,
    );
    assert.equal(
      canApplyOrderTransition(
        {
          ...pendingAcceptance,
          acceptanceStatus: "buyerAccepted",
          riskStatus: "frozen",
        },
        {machine: "split", from: "delayed", to: "processing"},
      ),
      false,
    );
    assert.equal(
      canTransition("acceptance", "disputed", "timeoutAccepted"),
      false,
    );
    assert.equal(
      canApplyOrderTransition(
        {
          ...pendingAcceptance,
          paymentStatus: "refundPending",
          riskStatus: "frozen",
        },
        {machine: "payment", from: "refundPending", to: "refunded"},
      ),
      false,
    );
    assert.equal(
      canApplyOrderTransition(
        {
          ...pendingAcceptance,
          acceptanceStatus: "buyerAccepted",
          riskStatus: "frozen",
          splitStatus: "processing",
        },
        {machine: "split", from: "processing", to: "succeeded"},
      ),
      false,
    );

    const disputed = applyOrderEvent(pendingAcceptance, "openDispute");
    assert.equal(disputed?.acceptanceStatus, "disputed");
    assert.equal(disputed?.disputeStatus, "open");

    const resolvedForBuyer = disputed
      ? applyOrderEvent(disputed, "resolveDisputeForBuyer")
      : null;
    assert.equal(resolvedForBuyer?.acceptanceStatus, "rejected");
    assert.equal(resolvedForBuyer?.disputeStatus, "resolvedForBuyer");
    assert.equal(resolvedForBuyer?.fulfillmentStatus, "cancelled");
    assert.equal(
      applyOrderEvent(
        {
          ...pendingAcceptance,
          fulfillmentStatus: "awaitingPayment",
          paymentStatus: "pending",
          hasFulfillmentCredential: false,
        },
        "openDispute",
      ),
      null,
    );
  });
});

describe("role permissions", () => {
  it("keeps public browsing open while protecting checkout", () => {
    assert.equal(accessFor({role: "guest", verificationStatus: "unverified"}, "browse"), "allow");
    assert.equal(accessFor({role: "guest", verificationStatus: "unverified"}, "orderCompute"), "deny");
    assert.equal(accessFor({role: "buyer", verificationStatus: "unverified"}, "orderCompute"), "conditional");
    assert.equal(accessFor({role: "buyer", verificationStatus: "verified"}, "orderCompute"), "allow");
    assert.equal(accessFor({role: "supplier", verificationStatus: "verified"}, "orderCompute"), "deny");
  });

  it("enforces operator grants and administrator-only settings", () => {
    assert.equal(accessFor({role: "operator", verificationStatus: "verified", grants: []}, "manageRisk"), "deny");
    assert.equal(accessFor({role: "operator", verificationStatus: "verified", grants: ["manageRisk"]}, "manageRisk"), "allow");
    assert.equal(accessFor({role: "operator", verificationStatus: "verified", grants: ["manageRisk"]}, "manageCompliance"), "deny");
    assert.equal(accessFor({role: "operator", verificationStatus: "verified", grants: ["manageAccess"]}, "manageAccess"), "deny");
    assert.equal(accessFor({role: "admin", verificationStatus: "verified"}, "manageCompliance"), "allow");
  });

  it("does not apply business verification gates to administrators", () => {
    const administrator = {role: "admin", verificationStatus: "unverified"} as const;
    assert.equal(accessFor(administrator, "publishCompute"), "allow");
    assert.equal(accessFor(administrator, "publishEquipment"), "allow");
    assert.equal(accessFor(administrator, "viewFinanceLeads"), "allow");
  });

  it("requires approved qualification before publishing", () => {
    assert.equal(accessFor({role: "supplier", verificationStatus: "verified", qualificationStatus: "pending"}, "publishCompute"), "conditional");
    assert.equal(accessFor({role: "supplier", verificationStatus: "verified", qualificationStatus: "approved"}, "publishCompute"), "allow");
  });
});

describe("route contract", () => {
  it("uses unique paths and protects compliance settings", () => {
    assert.equal(new Set(routes.map(({href}) => href)).size, routes.length);

    const settings = routes.find(({href}) => href === "/admin/settings");
    assert.deepEqual(settings?.roles, ["admin"]);
  });

  it("matches dynamic paths and enforces the active role", () => {
    assert.equal(matchRoute("/market/product-1")?.href, "/market/[productId]");
    assert.equal(homeForRole("supplier"), "/console/supplier");
    assert.equal(
      canAccessRoute("/console/supplier", {
        role: "buyer",
        verificationStatus: "verified",
      }),
      false,
    );
    assert.equal(
      canAccessRoute("/admin", {
        role: "operator",
        verificationStatus: "verified",
        grants: ["manageRisk"],
      }),
      true,
    );
  });

  it("preserves conditional route access for verification redirects", () => {
    assert.equal(
      accessLevelForRoute("/checkout", {
        role: "buyer",
        verificationStatus: "unverified",
      }),
      "conditional",
    );
  });
});

describe("domain contract validation", () => {
  it("rejects impossible product availability", () => {
    const result = computeProductSchema.safeParse({
      id: "product-1",
      supplierId: "supplier-1",
      name: "H100 8-card node",
      gpuModel: "H100",
      gpuCount: 8,
      specification: {
        cpu: "2 × EPYC 9654",
        memoryGiB: 1024,
        vramGiB: 80,
        storageGiB: 7680,
        bandwidthMbps: 10_000,
      },
      deliveryMode: "bareMetal",
      billingMode: "hourly",
      region: "北京",
      networkEgress: "BGP",
      supportsPublicNetwork: true,
      isExclusive: true,
      sellableWindows: [
        {
          startAt: "2026-07-14T00:00:00+08:00",
          endAt: "2026-08-14T00:00:00+08:00",
        },
      ],
      unitPrice: {amountMinor: 3500, currency: "CNY"},
      totalUnits: 8,
      availableUnits: 9,
      minimumUnits: 1,
      minimumRentalHours: 1,
      complianceAcceptance: {
        agreementVersion: "2026-07",
        acceptedBy: "supplier-1",
        acceptedAt: "2026-07-13T10:00:00+08:00",
      },
      status: "onSale",
    });

    assert.equal(result.success, false);
  });

  it("requires an order to end after it starts", () => {
    const result = computeOrderSchema.safeParse({
      id: "order-1",
      buyerId: "buyer-1",
      productId: "product-1",
      quantity: 1,
      startsAt: "2026-07-14T10:00:00+08:00",
      endsAt: "2026-07-14T09:00:00+08:00",
      inventoryLockExpiresAt: "2026-07-13T10:15:00+08:00",
      pricingSnapshot: {
        unitPrice: {amountMinor: 3500, currency: "CNY"},
        platformFeeRateBps: 500,
      },
      total: {amountMinor: 3500, currency: "CNY"},
      paymentReference: null,
      fulfillmentStatus: "awaitingPayment",
      paymentStatus: "pending",
      acceptanceStatus: "pending",
      riskStatus: "clear",
      disputeStatus: "none",
      fulfillmentCredential: null,
      complianceAcceptance: {
        agreementVersion: "2026-07",
        acceptedBy: "buyer-1",
        acceptedAt: "2026-07-13T10:00:00+08:00",
      },
    });

    assert.equal(result.success, false);
  });

  it("rejects impossible cross-state order snapshots", () => {
    const result = computeOrderSchema.safeParse({
      id: "order-impossible",
      buyerId: "buyer-1",
      productId: "product-1",
      quantity: 1,
      startsAt: "2026-07-14T10:00:00+08:00",
      endsAt: "2026-07-15T10:00:00+08:00",
      inventoryLockExpiresAt: "2026-07-13T10:15:00+08:00",
      pricingSnapshot: {
        unitPrice: {amountMinor: 3500, currency: "CNY"},
        platformFeeRateBps: 500,
      },
      total: {amountMinor: 3500, currency: "CNY"},
      paymentReference: null,
      fulfillmentStatus: "active",
      paymentStatus: "pending",
      acceptanceStatus: "buyerAccepted",
      riskStatus: "frozen",
      disputeStatus: "open",
      fulfillmentCredential: {
        kind: "consoleLink",
        maskedValue: "https://console.example/***",
        submittedBy: "supplier-1",
        submittedAt: "2026-07-13T11:00:00+08:00",
      },
      complianceAcceptance: {
        agreementVersion: "2026-07",
        acceptedBy: "buyer-1",
        acceptedAt: "2026-07-13T10:00:00+08:00",
      },
    });

    assert.equal(result.success, false);

    const orphanedRejection = computeOrderSchema.safeParse({
      id: "order-orphaned-rejection",
      buyerId: "buyer-1",
      productId: "product-1",
      quantity: 1,
      startsAt: "2026-07-14T10:00:00+08:00",
      endsAt: "2026-07-15T10:00:00+08:00",
      inventoryLockExpiresAt: "2026-07-13T10:15:00+08:00",
      pricingSnapshot: {
        unitPrice: {amountMinor: 3500, currency: "CNY"},
        platformFeeRateBps: 500,
      },
      total: {amountMinor: 3500, currency: "CNY"},
      paymentReference: "payment-1",
      fulfillmentStatus: "cancelled",
      paymentStatus: "paid",
      acceptanceStatus: "rejected",
      riskStatus: "clear",
      disputeStatus: "none",
      fulfillmentCredential: null,
      complianceAcceptance: {
        agreementVersion: "2026-07",
        acceptedBy: "buyer-1",
        acceptedAt: "2026-07-13T10:00:00+08:00",
      },
    });

    assert.equal(orphanedRejection.success, false);
  });

  it("requires public filing evidence for self-hosted models", () => {
    const result = tokenModelSchema.safeParse({
      id: "model-1",
      name: "Self-hosted model",
      provider: "Example",
      contextWindow: 128_000,
      pricingMultiplierBps: 10_000,
      scenarios: ["推理"],
      saleMode: "selfHosted",
      status: "onSale",
      filingStatus: "pending",
      filingNumber: null,
      filingPublicUrl: null,
      contentSafetyStatus: "required",
    });

    assert.equal(result.success, false);
  });

  it("requires complete evidence before approving a supplier", () => {
    const result = qualificationSchema.safeParse({
      id: "qualification-1",
      accountId: "supplier-1",
      kind: "supplier",
      subjectName: "示例机房",
      unifiedSocialCreditCode: "91310000EXAMPLE",
      region: "上海",
      contactName: "张三",
      contactMethod: "13800000000",
      legalRepresentative: null,
      settlementAccount: null,
      facilityProfile: null,
      documents: [],
      status: "approved",
      review: null,
      merchantOnboardingStatus: "notStarted",
      expiresAt: null,
    });

    assert.equal(result.success, false);

    assert.equal(
      qualificationSchema.safeParse({
        id: "qualification-2",
        accountId: "supplier-2",
        kind: "supplier",
        subjectName: "无证机房",
        unifiedSocialCreditCode: "91310000NOIDC",
        region: "上海",
        contactName: "李四",
        contactMethod: "13900000000",
        legalRepresentative: {
          name: "李四",
          idDocumentHint: "310***********001",
        },
        settlementAccount: {
          accountName: "无证机房",
          bankName: "示例银行",
          accountNumberHint: "****0001",
        },
        facilityProfile: {
          address: "上海市",
          hasIdcLicense: false,
          powerDescription: "双路供电",
          coolingDescription: "风冷",
        },
        documents: [
          {
            kind: "营业执照",
            number: "91310000NOIDC",
            attachmentName: "license.pdf",
            expiresAt: null,
          },
        ],
        status: "approved",
        review: {
          reviewerId: "operator-1",
          reviewedAt: "2026-07-13T10:00:00+08:00",
          reason: null,
        },
        merchantOnboardingStatus: "pending",
        expiresAt: null,
      }).success,
      false,
    );
  });

  it("rejects refunds above the paid amount", () => {
    const result = splitRecordSchema.safeParse({
      id: "split-1",
      orderId: "order-1",
      buyerPaidAmount: {amountMinor: 10_000, currency: "CNY"},
      supplierAmount: {amountMinor: 8_000, currency: "CNY"},
      platformFee: {amountMinor: 500, currency: "CNY"},
      channelFee: {amountMinor: 100, currency: "CNY"},
      refundAmount: {amountMinor: 15_000, currency: "CNY"},
      netSettledAmount: {amountMinor: 0, currency: "CNY"},
      feeAllocationNote: "通道费承担方待支付产品确认",
      status: "reconciled",
      externalReference: "split-reference",
      reconciliationStatus: "matched",
      fundReturnStatus: "succeeded",
    });

    assert.equal(result.success, false);
  });

  it("represents monthly unlimited Token entitlements", () => {
    const result = tokenAccountSchema.safeParse({
      accountId: "buyer-1",
      gatewayAccountId: "gateway-1",
      baseUrl: "https://api.example.com/v1",
      quotaRemaining: null,
      quotaUsed: null,
      entitlements: [
        {
          kind: "monthlyUnlimited",
          packageId: "package-1",
          modelIds: ["model-1"],
          startsAt: "2026-07-01T00:00:00+08:00",
          expiresAt: "2026-08-01T00:00:00+08:00",
          fairUseQuota: null,
        },
      ],
      keys: [],
    });

    assert.equal(result.success, true);

    assert.equal(
      tokenAccountSchema.safeParse({
        accountId: "buyer-2",
        gatewayAccountId: "gateway-2",
        baseUrl: "https://api.example.com/v1",
        quotaRemaining: 999,
        quotaUsed: 50,
        entitlements: [
          {
            kind: "quota",
            packageId: "package-2",
            modelIds: ["model-1"],
            quotaRemaining: 100,
            quotaUsed: 50,
            expiresAt: null,
          },
        ],
        keys: [],
      }).success,
      false,
    );
  });

  it("requires signatures and chain evidence for confirmed attestations", () => {
    const result = attestationSchema.safeParse({
      id: "attestation-1",
      subjectType: "fulfillment",
      subjectId: "order-1",
      hash: "sha256:example",
      signaturePolicy: "multiParty",
      signatures: [],
      sourceEvidence: [],
      status: "confirmed",
      txId: null,
      chainTimestamp: null,
    });

    assert.equal(result.success, false);

    assert.equal(
      attestationSchema.safeParse({
        id: "attestation-2",
        subjectType: "fulfillment",
        subjectId: "order-1",
        hash: "sha256:example",
        signaturePolicy: "systemObjective",
        signatures: [
          {
            party: "system",
            algorithm: "sm2",
            keyId: "system-key-1",
            signature: "signature",
            signedAt: "2026-07-13T10:00:00+08:00",
          },
        ],
        sourceEvidence: ["delivery-credential-hash"],
        status: "queued",
        txId: null,
        chainTimestamp: null,
      }).success,
      false,
    );
  });

  it("requires a limit in limited trading mode", () => {
    assert.equal(
      complianceGateSchema.safeParse({
        mode: "limited",
        orderLimit: null,
        cumulativeLimit: null,
      }).success,
      false,
    );
    assert.equal(
      complianceGateSchema.safeParse({
        mode: "showcase",
        orderLimit: null,
        cumulativeLimit: null,
      }).success,
      true,
    );
  });
});

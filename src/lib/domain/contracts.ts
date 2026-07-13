import {z} from "zod";

const idSchema = z.string().min(1);
const timestampSchema = z.string().datetime({offset: true});

export const roles = [
  "guest",
  "buyer",
  "supplier",
  "vendor",
  "funder",
  "operator",
  "admin",
] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;

export const verificationStatuses = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;
export const verificationStatusSchema = z.enum(verificationStatuses);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const qualificationStatuses = [
  "draft",
  "pending",
  "reviewing",
  "changesRequested",
  "approved",
  "rejected",
  "frozen",
] as const;
export const qualificationStatusSchema = z.enum(qualificationStatuses);
export type QualificationStatus = z.infer<typeof qualificationStatusSchema>;

export const productStatuses = [
  "draft",
  "pending",
  "rejected",
  "onSale",
  "soldOut",
  "offline",
  "disabled",
] as const;
export const productStatusSchema = z.enum(productStatuses);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const fulfillmentStatuses = [
  "awaitingPayment",
  "awaitingProvisioning",
  "provisioning",
  "awaitingAcceptance",
  "active",
  "completed",
  "cancelled",
] as const;
export const fulfillmentStatusSchema = z.enum(fulfillmentStatuses);
export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>;

export const paymentStatuses = [
  "pending",
  "paid",
  "refundPending",
  "refunded",
] as const;
export const paymentStatusSchema = z.enum(paymentStatuses);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const acceptanceStatuses = [
  "pending",
  "buyerAccepted",
  "timeoutAccepted",
  "disputed",
  "rejected",
] as const;
export const acceptanceStatusSchema = z.enum(acceptanceStatuses);
export type AcceptanceStatus = z.infer<typeof acceptanceStatusSchema>;

export const riskStatuses = ["clear", "frozen"] as const;
export const riskStatusSchema = z.enum(riskStatuses);
export type RiskStatus = z.infer<typeof riskStatusSchema>;

export const disputeStatuses = [
  "none",
  "open",
  "resolvedForBuyer",
  "resolvedForSupplier",
] as const;
export const disputeStatusSchema = z.enum(disputeStatuses);
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;

export const splitStatuses = [
  "pending",
  "delayed",
  "processing",
  "succeeded",
  "failed",
  "reconciled",
] as const;
export const splitStatusSchema = z.enum(splitStatuses);
export type SplitStatus = z.infer<typeof splitStatusSchema>;

export const leadStatuses = [
  "new",
  "unassigned",
  "following",
  "quoted",
  "won",
  "closed",
] as const;
export const leadStatusSchema = z.enum(leadStatuses);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const complianceModes = ["showcase", "limited", "open"] as const;
export const complianceModeSchema = z.enum(complianceModes);
export type ComplianceMode = z.infer<typeof complianceModeSchema>;

export const moneySchema = z.object({
  amountMinor: z.number().int().safe().nonnegative(),
  currency: z.literal("CNY"),
});
export type Money = z.infer<typeof moneySchema>;

export const accountSchema = z.object({
  id: idSchema,
  displayName: z.string().min(1),
  roles: z.array(roleSchema.exclude(["guest"])).min(1),
  verificationStatus: verificationStatusSchema,
});
export type Account = z.infer<typeof accountSchema>;

const qualificationDocumentSchema = z.object({
  kind: z.string().min(1),
  number: z.string().min(1),
  attachmentName: z.string().min(1),
  expiresAt: timestampSchema.nullable(),
});

export const qualificationSchema = z
  .object({
    id: idSchema,
    accountId: idSchema,
    kind: z.enum(["personal", "enterprise", "supplier", "vendor", "funder"]),
    subjectName: z.string().min(1),
    unifiedSocialCreditCode: z.string().min(1).nullable(),
    region: z.string().min(1).nullable(),
    contactName: z.string().min(1),
    contactMethod: z.string().min(1),
    legalRepresentative: z
      .object({
        name: z.string().min(1),
        idDocumentHint: z.string().min(1),
      })
      .nullable(),
    settlementAccount: z
      .object({
        accountName: z.string().min(1),
        bankName: z.string().min(1),
        accountNumberHint: z.string().min(1),
      })
      .nullable(),
    facilityProfile: z
      .object({
        address: z.string().min(1),
        hasIdcLicense: z.boolean(),
        powerDescription: z.string().min(1),
        coolingDescription: z.string().min(1),
      })
      .nullable(),
    documents: z.array(qualificationDocumentSchema),
    status: qualificationStatusSchema,
    review: z
      .object({
        reviewerId: idSchema,
        reviewedAt: timestampSchema,
        reason: z.string().min(1).nullable(),
      })
      .nullable(),
    merchantOnboardingStatus: z.enum([
      "notStarted",
      "pending",
      "approved",
      "rejected",
    ]),
    expiresAt: timestampSchema.nullable(),
  })
  .superRefine((qualification, context) => {
    const approved =
      qualification.status === "approved" || qualification.status === "frozen";
    if (!approved) return;

    if (qualification.documents.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Approved qualifications require supporting documents",
        path: ["documents"],
      });
    }
    if (!qualification.review) {
      context.addIssue({
        code: "custom",
        message: "Approved qualifications require a review record",
        path: ["review"],
      });
    }
    if (
      qualification.kind !== "personal" &&
      !qualification.unifiedSocialCreditCode
    ) {
      context.addIssue({
        code: "custom",
        message: "Approved organizations require a social credit code",
        path: ["unifiedSocialCreditCode"],
      });
    }
    if (
      qualification.kind === "supplier" &&
      (!qualification.facilityProfile ||
        !qualification.facilityProfile.hasIdcLicense)
    ) {
      context.addIssue({
        code: "custom",
        message: "Approved suppliers require a licensed facility profile",
        path: ["facilityProfile"],
      });
    }
    if (
      (qualification.kind === "supplier" || qualification.kind === "vendor") &&
      (!qualification.legalRepresentative || !qualification.settlementAccount)
    ) {
      context.addIssue({
        code: "custom",
        message: "Approved merchants require legal and settlement details",
        path: ["legalRepresentative"],
      });
    }
  });
export type Qualification = z.infer<typeof qualificationSchema>;

const complianceAcceptanceSchema = z.object({
  agreementVersion: z.string().min(1),
  acceptedBy: idSchema,
  acceptedAt: timestampSchema,
});

const sellableWindowSchema = z
  .object({startAt: timestampSchema, endAt: timestampSchema})
  .refine(({endAt, startAt}) => Date.parse(endAt) > Date.parse(startAt), {
    message: "Sellable window end must be after its start",
    path: ["endAt"],
  });

export const computeProductSchema = z
  .object({
    id: idSchema,
    supplierId: idSchema,
    name: z.string().min(1),
    gpuModel: z.string().min(1),
    gpuCount: z.number().int().positive(),
    specification: z.object({
      cpu: z.string().min(1),
      memoryGiB: z.number().positive(),
      vramGiB: z.number().positive(),
      storageGiB: z.number().positive(),
      bandwidthMbps: z.number().positive(),
    }),
    deliveryMode: z.enum(["bareMetal", "container", "virtualMachine", "rack"]),
    billingMode: z.enum(["hourly", "weekly", "monthly"]),
    region: z.string().min(1),
    networkEgress: z.string().min(1),
    supportsPublicNetwork: z.boolean(),
    isExclusive: z.boolean(),
    sellableWindows: z.array(sellableWindowSchema).min(1),
    unitPrice: moneySchema,
    totalUnits: z.number().int().nonnegative(),
    availableUnits: z.number().int().nonnegative(),
    minimumUnits: z.number().int().positive(),
    minimumRentalHours: z.number().int().positive(),
    complianceAcceptance: complianceAcceptanceSchema,
    status: productStatusSchema,
  })
  .refine(({availableUnits, totalUnits}) => availableUnits <= totalUnits, {
    message: "Available units cannot exceed total units",
    path: ["availableUnits"],
  });
export type ComputeProduct = z.infer<typeof computeProductSchema>;

const fulfillmentCredentialSchema = z.object({
  kind: z.enum(["consoleLink", "instance", "document"]),
  maskedValue: z.string().min(1),
  submittedBy: idSchema,
  submittedAt: timestampSchema,
});

export const computeOrderSchema = z
  .object({
    id: idSchema,
    buyerId: idSchema,
    productId: idSchema,
    quantity: z.number().int().positive(),
    startsAt: timestampSchema,
    endsAt: timestampSchema,
    inventoryLockExpiresAt: timestampSchema,
    pricingSnapshot: z.object({
      unitPrice: moneySchema,
      platformFeeRateBps: z.number().int().min(300).max(800),
    }),
    total: moneySchema,
    paymentReference: z.string().min(1).nullable(),
    fulfillmentStatus: fulfillmentStatusSchema,
    paymentStatus: paymentStatusSchema,
    acceptanceStatus: acceptanceStatusSchema,
    riskStatus: riskStatusSchema,
    disputeStatus: disputeStatusSchema,
    fulfillmentCredential: fulfillmentCredentialSchema.nullable(),
    complianceAcceptance: complianceAcceptanceSchema,
  })
  .superRefine((order, context) => {
    if (Date.parse(order.endsAt) <= Date.parse(order.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "Order end must be after its start",
        path: ["endsAt"],
      });
    }

    if (
      order.paymentStatus === "pending" &&
      order.fulfillmentStatus !== "awaitingPayment"
    ) {
      context.addIssue({
        code: "custom",
        message: "Unpaid orders cannot enter fulfillment",
        path: ["fulfillmentStatus"],
      });
    }

    if (
      ["awaitingAcceptance", "active", "completed"].includes(
        order.fulfillmentStatus,
      ) &&
      !order.fulfillmentCredential
    ) {
      context.addIssue({
        code: "custom",
        message: "Delivered orders require a fulfillment credential",
        path: ["fulfillmentCredential"],
      });
    }

    if (
      ["active", "completed"].includes(order.fulfillmentStatus) &&
      !["buyerAccepted", "timeoutAccepted"].includes(order.acceptanceStatus)
    ) {
      context.addIssue({
        code: "custom",
        message: "Active fulfillment requires accepted delivery",
        path: ["acceptanceStatus"],
      });
    }

    if (
      (order.acceptanceStatus === "disputed") !==
      (order.disputeStatus === "open")
    ) {
      context.addIssue({
        code: "custom",
        message: "Open disputes must pause delivery acceptance",
        path: ["disputeStatus"],
      });
    }

    if (
      order.disputeStatus === "resolvedForBuyer" &&
      (order.fulfillmentStatus !== "cancelled" ||
        order.acceptanceStatus !== "rejected")
    ) {
      context.addIssue({
        code: "custom",
        message: "Buyer-favored dispute resolutions must reject delivery and cancel fulfillment",
        path: ["fulfillmentStatus"],
      });
    }

    if (
      order.disputeStatus === "resolvedForSupplier" &&
      order.acceptanceStatus !== "buyerAccepted"
    ) {
      context.addIssue({
        code: "custom",
        message: "Supplier-favored dispute resolutions must accept delivery",
        path: ["acceptanceStatus"],
      });
    }

    if (
      order.acceptanceStatus === "rejected" &&
      order.disputeStatus !== "resolvedForBuyer"
    ) {
      context.addIssue({
        code: "custom",
        message: "Rejected delivery requires a buyer-favored dispute resolution",
        path: ["acceptanceStatus"],
      });
    }

    if (
      order.paymentStatus === "refunded" &&
      order.fulfillmentStatus !== "cancelled"
    ) {
      context.addIssue({
        code: "custom",
        message: "Refunded orders must be cancelled",
        path: ["fulfillmentStatus"],
      });
    }
  });
export type ComputeOrder = z.infer<typeof computeOrderSchema>;

export const splitRecordSchema = z
  .object({
    id: idSchema,
    orderId: idSchema,
    buyerPaidAmount: moneySchema,
    supplierAmount: moneySchema,
    platformFee: moneySchema,
    channelFee: moneySchema,
    refundAmount: moneySchema,
    netSettledAmount: moneySchema,
    feeAllocationNote: z.string().min(1),
    status: splitStatusSchema,
    externalReference: z.string().min(1).nullable(),
    reconciliationStatus: z.enum(["pending", "matched", "difference"]),
    fundReturnStatus: z.enum([
      "none",
      "pending",
      "processing",
      "succeeded",
      "failed",
    ]),
  })
  .superRefine((record, context) => {
    if (record.refundAmount.amountMinor > record.buyerPaidAmount.amountMinor) {
      context.addIssue({
        code: "custom",
        message: "Refunds cannot exceed the buyer payment",
        path: ["refundAmount"],
      });
    }

    const expectedNet =
      record.buyerPaidAmount.amountMinor - record.refundAmount.amountMinor;
    if (record.netSettledAmount.amountMinor !== expectedNet) {
      context.addIssue({
        code: "custom",
        message: "Net settled amount must equal payment less refunds",
        path: ["netSettledAmount"],
      });
    }

    if (
      (record.status === "succeeded" || record.status === "reconciled") &&
      !record.externalReference
    ) {
      context.addIssue({
        code: "custom",
        message: "Completed splits require an external reference",
        path: ["externalReference"],
      });
    }

    if (
      record.status === "reconciled" &&
      record.reconciliationStatus === "pending"
    ) {
      context.addIssue({
        code: "custom",
        message: "Reconciled splits require a reconciliation result",
        path: ["reconciliationStatus"],
      });
    }
  });
export type SplitRecord = z.infer<typeof splitRecordSchema>;

export const tokenModelSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    provider: z.string().min(1),
    contextWindow: z.number().int().positive(),
    pricingMultiplierBps: z.number().int().positive(),
    scenarios: z.array(z.string().min(1)).min(1),
    saleMode: z.enum(["resale", "exclusive", "selfHosted"]),
    status: z.enum(["draft", "onSale", "offline"]),
    filingStatus: z.enum(["filed", "pending", "notRequired"]),
    filingNumber: z.string().min(1).nullable(),
    filingPublicUrl: z.string().url().nullable(),
    contentSafetyStatus: z.enum(["enabled", "required", "notApplicable"]),
  })
  .superRefine((model, context) => {
    if (
      model.filingStatus === "filed" &&
      (!model.filingNumber || !model.filingPublicUrl)
    ) {
      context.addIssue({
        code: "custom",
        message: "Filed models require a filing number and public record URL",
        path: ["filingNumber"],
      });
    }

    if (
      model.status === "onSale" &&
      model.saleMode === "selfHosted" &&
      (model.filingStatus !== "filed" ||
        model.contentSafetyStatus !== "enabled")
    ) {
      context.addIssue({
        code: "custom",
        message: "Self-hosted models require filing and enabled content safety",
        path: ["filingStatus"],
      });
    }
  });
export type TokenModel = z.infer<typeof tokenModelSchema>;

export const tokenPackageSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  modelIds: z.array(idSchema).min(1),
  allowance: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("quota"),
      quota: z.number().int().safe().positive(),
    }),
    z.object({
      kind: z.literal("monthlyUnlimited"),
      periodDays: z.number().int().positive(),
      fairUseQuota: z.number().int().safe().positive().nullable(),
    }),
  ]),
  price: moneySchema,
  pricingTiers: z.array(
    z.object({
      minimumQuantity: z.number().int().positive(),
      unitPrice: moneySchema,
    }),
  ),
  status: z.enum(["draft", "onSale", "offline"]),
});
export type TokenPackage = z.infer<typeof tokenPackageSchema>;

const tokenKeySchema = z.object({
  id: idSchema,
  hint: z.string().min(1),
  status: z.enum(["active", "disabled"]),
  createdAt: timestampSchema,
});

const tokenEntitlementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("quota"),
    packageId: idSchema,
    modelIds: z.array(idSchema).min(1),
    quotaRemaining: z.number().int().safe().nonnegative(),
    quotaUsed: z.number().int().safe().nonnegative(),
    expiresAt: timestampSchema.nullable(),
  }),
  z
    .object({
      kind: z.literal("monthlyUnlimited"),
      packageId: idSchema,
      modelIds: z.array(idSchema).min(1),
      startsAt: timestampSchema,
      expiresAt: timestampSchema,
      fairUseQuota: z.number().int().safe().positive().nullable(),
    })
    .refine(
      ({expiresAt, startsAt}) => Date.parse(expiresAt) > Date.parse(startsAt),
      {message: "Entitlement expiry must be after its start", path: ["expiresAt"]},
    ),
]);

export const tokenAccountSchema = z
  .object({
    accountId: idSchema,
    gatewayAccountId: idSchema.nullable(),
    baseUrl: z.string().url().nullable(),
    quotaRemaining: z.number().int().safe().nonnegative().nullable(),
    quotaUsed: z.number().int().safe().nonnegative().nullable(),
    entitlements: z.array(tokenEntitlementSchema),
    keys: z.array(tokenKeySchema),
  })
  .superRefine((account, context) => {
    const quotaEntitlements = account.entitlements.filter(
      (entitlement) => entitlement.kind === "quota",
    );
    const hasQuotaEntitlement = quotaEntitlements.length > 0;
    const hasQuotaSummary =
      account.quotaRemaining !== null && account.quotaUsed !== null;
    if (hasQuotaEntitlement !== hasQuotaSummary) {
      context.addIssue({
        code: "custom",
        message: "Quota summaries must match quota-based entitlements",
        path: ["quotaRemaining"],
      });
    }

    if (hasQuotaEntitlement && hasQuotaSummary) {
      const expectedRemaining = quotaEntitlements.reduce(
        (total, entitlement) => total + entitlement.quotaRemaining,
        0,
      );
      const expectedUsed = quotaEntitlements.reduce(
        (total, entitlement) => total + entitlement.quotaUsed,
        0,
      );
      if (
        account.quotaRemaining !== expectedRemaining ||
        account.quotaUsed !== expectedUsed
      ) {
        context.addIssue({
          code: "custom",
          message: "Quota summaries must equal entitlement totals",
          path: ["quotaRemaining"],
        });
      }
    }
  });
export type TokenAccount = z.infer<typeof tokenAccountSchema>;

export const tokenUsageSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  modelId: idSchema,
  inputTokens: z.number().int().safe().nonnegative(),
  outputTokens: z.number().int().safe().nonnegative(),
  occurredAt: timestampSchema,
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

const leadBaseSchema = z.object({
  id: idSchema,
  ownerId: idSchema.nullable(),
  status: leadStatusSchema,
  contactName: z.string().min(1),
  contactMethod: z.string().min(1),
  quoteAmount: moneySchema.nullable(),
  dealAmount: moneySchema.nullable(),
  commissionRateBps: z.number().int().min(0).max(10_000).nullable(),
  commissionStatus: z.enum(["none", "pending", "settled"]),
});

export const leadSchema = z.discriminatedUnion("kind", [
  leadBaseSchema.extend({
    kind: z.literal("equipment"),
    items: z.array(z.string().min(1)).min(1),
    quantity: z.number().int().positive(),
    budget: moneySchema,
    region: z.string().min(1),
    desiredDeliveryAt: timestampSchema,
  }),
  leadBaseSchema.extend({
    kind: z.literal("construction"),
    projectType: z.enum(["electrical", "cooling", "rack", "generalContract"]),
    scale: z.string().min(1),
    location: z.string().min(1),
    budget: moneySchema,
    desiredStartAt: timestampSchema,
  }),
  leadBaseSchema.extend({
    kind: z.literal("financing"),
    entityName: z.string().min(1),
    equipmentAmount: moneySchema,
    termMonths: z.number().int().positive(),
    notes: z.string(),
  }),
]);
export type Lead = z.infer<typeof leadSchema>;

export const riskAlertSchema = z.object({
  id: idSchema,
  subjectType: z.enum(["account", "product", "order"]),
  subjectId: idSchema,
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "investigating", "resolved", "dismissed"]),
  reason: z.string().min(1),
  evidence: z.array(z.object({kind: z.string().min(1), summary: z.string().min(1)})),
  resolution: z
    .object({action: z.enum(["release", "freeze", "refund", "terminate"]), note: z.string().min(1)})
    .nullable(),
});
export type RiskAlert = z.infer<typeof riskAlertSchema>;

const attestationSignatureSchema = z.object({
  party: z.enum(["buyer", "supplier", "platform", "system"]),
  algorithm: z.enum(["sm2", "ecdsa", "session"]),
  keyId: z.string().min(1).nullable(),
  signature: z.string().min(1),
  signedAt: timestampSchema,
});

export const attestationSchema = z
  .object({
    id: idSchema,
    subjectType: z.enum(["order", "fulfillment", "sla", "risk", "feeRule"]),
    subjectId: idSchema,
    hash: z.string().min(1),
    signaturePolicy: z.enum(["multiParty", "systemObjective", "riskSystem"]),
    signatures: z.array(attestationSignatureSchema).min(1),
    sourceEvidence: z.array(z.string().min(1)),
    status: z.enum(["queued", "submitted", "confirmed", "failed"]),
    txId: z.string().min(1).nullable(),
    chainTimestamp: timestampSchema.nullable(),
  })
  .superRefine((attestation, context) => {
    const parties = new Set(
      attestation.signatures.map((signature) => signature.party),
    );

    const expectedPolicy = {
      order: "multiParty",
      fulfillment: "multiParty",
      sla: "systemObjective",
      risk: "riskSystem",
      feeRule: "systemObjective",
    }[attestation.subjectType];

    if (attestation.signaturePolicy !== expectedPolicy) {
      context.addIssue({
        code: "custom",
        message: "Attestation subject requires its designated signature policy",
        path: ["signaturePolicy"],
      });
    }

    if (attestation.signaturePolicy === "multiParty" && parties.size < 2) {
      context.addIssue({
        code: "custom",
        message: "Multi-party attestations require at least two signing parties",
        path: ["signatures"],
      });
    }

    if (
      attestation.subjectType === "order" &&
      (!parties.has("buyer") || !parties.has("platform"))
    ) {
      context.addIssue({
        code: "custom",
        message: "Order attestations require buyer and platform signatures",
        path: ["signatures"],
      });
    }

    if (
      attestation.subjectType === "fulfillment" &&
      ((!parties.has("buyer") && !parties.has("system")) ||
        !parties.has("supplier") ||
        !parties.has("platform"))
    ) {
      context.addIssue({
        code: "custom",
        message: "Fulfillment attestations require supplier, platform, and buyer or timeout-system signatures",
        path: ["signatures"],
      });
    }

    if (
      attestation.signaturePolicy === "systemObjective" &&
      !parties.has("system") &&
      !parties.has("platform")
    ) {
      context.addIssue({
        code: "custom",
        message: "Objective system attestations require a system signer",
        path: ["signatures"],
      });
    }

    if (
      attestation.signaturePolicy === "riskSystem" &&
      !parties.has("system")
    ) {
      context.addIssue({
        code: "custom",
        message: "Risk attestations require an isolated system signer",
        path: ["signatures"],
      });
    }

    if (
      attestation.signaturePolicy !== "multiParty" &&
      attestation.sourceEvidence.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "System attestations require source evidence",
        path: ["sourceEvidence"],
      });
    }

    if (
      attestation.status === "confirmed" &&
      (!attestation.txId || !attestation.chainTimestamp)
    ) {
      context.addIssue({
        code: "custom",
        message: "Confirmed attestations require chain evidence",
        path: ["txId"],
      });
    }
  });
export type Attestation = z.infer<typeof attestationSchema>;

export const complianceGateSchema = z
  .object({
    mode: complianceModeSchema,
    orderLimit: moneySchema.nullable(),
    cumulativeLimit: moneySchema.nullable(),
  })
  .superRefine(({cumulativeLimit, mode, orderLimit}, context) => {
    if (mode === "limited" && (!orderLimit || !cumulativeLimit)) {
      context.addIssue({
        code: "custom",
        message: "Limited mode requires order and cumulative limits",
        path: ["orderLimit"],
      });
    }
    if (mode === "showcase" && (orderLimit || cumulativeLimit)) {
      context.addIssue({
        code: "custom",
        message: "Showcase mode cannot carry trading limits",
        path: ["orderLimit"],
      });
    }
  });
export type ComplianceGate = z.infer<typeof complianceGateSchema>;

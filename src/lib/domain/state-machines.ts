import type {
  AcceptanceStatus,
  ComplianceMode,
  DisputeStatus,
  FulfillmentStatus,
  LeadStatus,
  PaymentStatus,
  ProductStatus,
  QualificationStatus,
  RiskStatus,
  SplitStatus,
} from "./contracts.ts";

interface StateByMachine {
  qualification: QualificationStatus;
  product: ProductStatus;
  fulfillment: FulfillmentStatus;
  payment: PaymentStatus;
  acceptance: AcceptanceStatus;
  risk: RiskStatus;
  dispute: DisputeStatus;
  split: SplitStatus;
  lead: LeadStatus;
  complianceGate: ComplianceMode;
}

export type StateMachine = keyof StateByMachine;

const stateTransitions: {
  [Machine in StateMachine]: Record<
    StateByMachine[Machine],
    readonly StateByMachine[Machine][]
  >;
} = {
  qualification: {
    draft: ["pending"],
    pending: ["reviewing"],
    reviewing: ["approved", "rejected", "changesRequested"],
    changesRequested: ["pending"],
    approved: ["frozen"],
    rejected: ["pending"],
    frozen: ["reviewing"],
  },
  product: {
    draft: ["pending"],
    pending: ["onSale", "rejected"],
    rejected: ["pending"],
    onSale: ["soldOut", "offline", "disabled"],
    soldOut: ["onSale", "offline", "disabled"],
    offline: ["onSale", "disabled"],
    disabled: [],
  },
  fulfillment: {
    awaitingPayment: ["awaitingProvisioning", "cancelled"],
    awaitingProvisioning: ["provisioning", "cancelled"],
    provisioning: ["awaitingAcceptance", "cancelled"],
    awaitingAcceptance: ["active", "cancelled"],
    active: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  },
  payment: {
    pending: ["paid"],
    paid: ["refundPending"],
    refundPending: ["paid", "refunded"],
    refunded: [],
  },
  acceptance: {
    pending: ["buyerAccepted", "timeoutAccepted", "disputed"],
    buyerAccepted: [],
    timeoutAccepted: [],
    disputed: ["buyerAccepted", "rejected"],
    rejected: [],
  },
  risk: {
    clear: ["frozen"],
    frozen: ["clear"],
  },
  dispute: {
    none: ["open"],
    open: ["resolvedForBuyer", "resolvedForSupplier"],
    resolvedForBuyer: [],
    resolvedForSupplier: [],
  },
  split: {
    pending: ["delayed"],
    delayed: ["processing"],
    processing: ["succeeded", "failed"],
    failed: ["processing"],
    succeeded: ["reconciled"],
    reconciled: [],
  },
  lead: {
    new: ["unassigned"],
    unassigned: ["following", "closed"],
    following: ["quoted", "closed"],
    quoted: ["won", "closed"],
    won: [],
    closed: [],
  },
  complianceGate: {
    showcase: ["limited"],
    limited: ["showcase", "open"],
    open: ["limited", "showcase"],
  },
};

export function canTransition<Machine extends StateMachine>(
  machine: Machine,
  from: StateByMachine[Machine],
  to: StateByMachine[Machine],
) {
  return (stateTransitions[machine][from] as readonly string[]).includes(to);
}

export function canStartSplit({
  acceptanceStatus,
  disputeStatus,
  riskStatus,
}: {
  acceptanceStatus: AcceptanceStatus;
  disputeStatus: DisputeStatus;
  riskStatus: RiskStatus;
}) {
  const accepted =
    acceptanceStatus === "buyerAccepted" ||
    acceptanceStatus === "timeoutAccepted";
  const disputeCleared =
    disputeStatus === "none" || disputeStatus === "resolvedForSupplier";

  return accepted && disputeCleared && riskStatus === "clear";
}

export interface OrderStateSnapshot {
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  acceptanceStatus: AcceptanceStatus;
  riskStatus: RiskStatus;
  disputeStatus: DisputeStatus;
  splitStatus: SplitStatus;
  hasFulfillmentCredential: boolean;
}

export type OrderTransition =
  | {
      machine: "fulfillment";
      from: FulfillmentStatus;
      to: FulfillmentStatus;
    }
  | {machine: "payment"; from: PaymentStatus; to: PaymentStatus}
  | {machine: "acceptance"; from: AcceptanceStatus; to: AcceptanceStatus}
  | {machine: "risk"; from: RiskStatus; to: RiskStatus}
  | {machine: "dispute"; from: DisputeStatus; to: DisputeStatus}
  | {machine: "split"; from: SplitStatus; to: SplitStatus};

export function canApplyOrderTransition(
  state: OrderStateSnapshot,
  transition: OrderTransition,
) {
  if (currentStateFor(state, transition.machine) !== transition.from) {
    return false;
  }

  switch (transition.machine) {
    case "fulfillment": {
      if (
        !canTransition("fulfillment", transition.from, transition.to)
      ) {
        return false;
      }
      if (transition.to === "cancelled") return true;
      if (state.riskStatus === "frozen" || state.disputeStatus === "open") {
        return false;
      }
      if (transition.to === "awaitingProvisioning") {
        return state.paymentStatus === "paid";
      }
      if (
        transition.to === "provisioning" ||
        transition.to === "awaitingAcceptance"
      ) {
        return state.paymentStatus === "paid";
      }
      if (transition.to === "active") {
        return (
          state.paymentStatus === "paid" &&
          state.hasFulfillmentCredential &&
          canStartSplit(state)
        );
      }
      return true;
    }
    case "payment":
      if (!canTransition("payment", transition.from, transition.to)) {
        return false;
      }
      if (
        transition.from === "refundPending" ||
        transition.to === "refundPending" ||
        transition.to === "refunded"
      ) {
        return state.riskStatus === "clear" && state.disputeStatus !== "open";
      }
      return true;
    case "acceptance":
      if (!canTransition("acceptance", transition.from, transition.to)) {
        return false;
      }
      if (state.riskStatus === "frozen") return false;
      if (transition.to === "disputed" || transition.from === "disputed") {
        return false;
      }
      if (transition.to === "timeoutAccepted") {
        return state.disputeStatus === "none";
      }
      return (
        state.disputeStatus === "none" ||
        state.disputeStatus === "resolvedForSupplier"
      );
    case "split":
      if (!canTransition("split", transition.from, transition.to)) {
        return false;
      }
      if (state.riskStatus === "frozen") return false;
      if (transition.to !== "processing") return true;
      return state.paymentStatus === "paid" && canStartSplit(state);
    case "risk":
      return canTransition("risk", transition.from, transition.to);
    case "dispute":
      return false;
  }
}

export type OrderEvent =
  | "openDispute"
  | "resolveDisputeForBuyer"
  | "resolveDisputeForSupplier";

export function applyOrderEvent(
  state: OrderStateSnapshot,
  event: OrderEvent,
): OrderStateSnapshot | null {
  if (state.riskStatus === "frozen") return null;

  switch (event) {
    case "openDispute":
      if (
        state.disputeStatus !== "none" ||
        state.acceptanceStatus !== "pending" ||
        state.fulfillmentStatus !== "awaitingAcceptance" ||
        state.paymentStatus !== "paid" ||
        !state.hasFulfillmentCredential
      ) {
        return null;
      }
      return {
        ...state,
        acceptanceStatus: "disputed",
        disputeStatus: "open",
      };
    case "resolveDisputeForBuyer":
      if (
        state.disputeStatus !== "open" ||
        state.acceptanceStatus !== "disputed"
      ) {
        return null;
      }
      return {
        ...state,
        acceptanceStatus: "rejected",
        disputeStatus: "resolvedForBuyer",
        fulfillmentStatus: "cancelled",
      };
    case "resolveDisputeForSupplier":
      if (
        state.disputeStatus !== "open" ||
        state.acceptanceStatus !== "disputed"
      ) {
        return null;
      }
      return {
        ...state,
        acceptanceStatus: "buyerAccepted",
        disputeStatus: "resolvedForSupplier",
      };
  }
}

function currentStateFor(
  state: OrderStateSnapshot,
  machine: OrderTransition["machine"],
) {
  switch (machine) {
    case "fulfillment":
      return state.fulfillmentStatus;
    case "payment":
      return state.paymentStatus;
    case "acceptance":
      return state.acceptanceStatus;
    case "risk":
      return state.riskStatus;
    case "dispute":
      return state.disputeStatus;
    case "split":
      return state.splitStatus;
  }
}

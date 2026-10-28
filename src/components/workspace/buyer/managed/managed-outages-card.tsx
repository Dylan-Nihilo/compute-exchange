import {ManagedSection} from "./managed-section";

/**
 * Outage records and the buyer's compensation choice (docs/25 §25.7.6) belong to backend task
 * T-105, which has no buyer endpoint yet (no GET /orders/:id/outages, no PUT .../outage-remedy).
 * Until it ships this section states that plainly instead of calling an unfinished contract.
 */
export function ManagedOutagesCard() {
  return (
    <ManagedSection title="停机记录与补偿" description="租期内因机器原因不可用的时段将由平台自动记录。">
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted" role="status">
        停机记录与补偿方式选择尚未开放。开放前如遇无法登录或资源异常，请通过工单联系平台处理。
      </p>
    </ManagedSection>
  );
}

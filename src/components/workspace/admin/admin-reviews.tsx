"use client";

import {Button, Drawer} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Check, Eye, FileUp, RotateCcw, X} from "lucide";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {InteractiveIcon} from "@/components/system/interactive-icon";
import {
  approveQualification,
  fetchAdminInvoices,
  fetchAdminProducts,
  fetchAdminQualifications,
  issueAdminInvoice,
  rejectAdminInvoice,
  rejectQualification,
  reviewProduct,
  type AdminProduct,
  type AdminQualification,
} from "@/lib/admin-workspace";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {pricingModeCopy, productTypeCopy} from "@/lib/supplier-workspace";

import {
  AdminPage,
  AdminPanel,
  AdminTableHead,
  AdminTableShell,
  StatusBadge,
  adminTableClass,
} from "./admin-ui";

type ReviewTab = "qualifications" | "products" | "invoices";
type QualificationView = "pending" | "history";
type Decision = {kind: "qualification" | "product"; id: number; label: string} | null;

const tabs: readonly {id: ReviewTab; label: string}[] = [
  {id: "qualifications", label: "资质准入"},
  {id: "products", label: "商品上架"},
  {id: "invoices", label: "发票申请"},
];

const money = new Intl.NumberFormat("zh-CN", {currency: "CNY", style: "currency"});
const deliveryModeCopy: Record<string, string> = {
  bare_metal: "裸金属",
  container: "容器",
  virtual_machine: "虚拟机",
  whole_rack: "整机柜",
};

export function AdminReviews() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ReviewTab>("qualifications");
  const [qualificationView, setQualificationView] = useState<QualificationView>("pending");
  const [decision, setDecision] = useState<Decision>(null);
  const [inspecting, setInspecting] = useState<AdminProduct | null>(null);
  const [rejecting, setRejecting] = useState<{kind: "qualification" | "invoice" | "product"; id: number} | null>(null);
  const [reason, setReason] = useState("");

  const qualifications = useQuery({
    queryKey: ["admin", "qualifications", "all"],
    queryFn: () => fetchAdminQualifications("all"),
  });
  const products = useQuery({
    queryKey: ["admin", "products", "review"],
    queryFn: () => fetchAdminProducts({status: "pending", pageSize: 100}),
  });
  const invoices = useQuery({
    queryKey: ["admin", "invoices", "pending"],
    queryFn: () => fetchAdminInvoices({status: "pending", pageSize: 100}),
  });

  const action = useMutation({
    mutationFn: async (input: {kind: "qualification" | "product"; id: number; decision: "approve" | "reject"}) => {
      if (input.kind === "qualification") {
        if (input.decision === "approve") return approveQualification(input.id);
        return rejectQualification(input.id, reason.trim());
      }
      return reviewProduct(input.id, input.decision, reason.trim());
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({queryKey: ["admin"]});
      if (input.kind === "qualification") setQualificationView("history");
      if (input.kind === "product") setInspecting(null);
      setDecision(null);
      setRejecting(null);
      setReason("");
      notify.success("审核结果已提交");
    },
    onError: (error) => notify.error(messageFor(error)),
  });

  const invoiceAction = useMutation({
    mutationFn: (input: {id: number; file?: File; reason?: string}) =>
      input.file
        ? issueAdminInvoice(input.id, input.file)
        : rejectAdminInvoice(input.id, input.reason ?? ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["admin"]});
      setRejecting(null);
      setReason("");
      notify.success("发票状态已更新");
    },
    onError: (error) => notify.error(messageFor(error)),
  });

  const pendingProducts = products.data?.items ?? [];
  const pendingQualifications = qualifications.data?.filter(({status}) => status === "pending") ?? [];
  const qualificationHistory = qualifications.data?.filter(({status}) => status !== "pending") ?? [];

  return (
    <AdminPage
      description="审核决定会直接影响平台准入与交易状态。"
      eyebrow="Review queue"
      title="审核中心"
    >
      <div className="flex gap-1 overflow-x-auto border-b border-[#c8d9e0]/55">
        {tabs.map((item) => {
          const count =
            item.id === "qualifications"
              ? qualifications.isPending ? undefined : pendingQualifications.length
              : item.id === "products"
                ? products.isPending ? undefined : products.data?.total
                : invoices.isPending ? undefined : invoices.data?.total;
          return (
            <button
              aria-current={tab === item.id ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-2 px-4 text-sm font-medium transition-colors ${
                tab === item.id ? "text-[#173447]" : "text-[#78909c] hover:text-[#355f73]"
              }`}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
              {typeof count === "number" ? (
                <span className="rounded-full bg-[#edf3f5] px-2 py-0.5 text-[10px] text-[#5e7786]">
                  {count}
                </span>
              ) : null}
              {tab === item.id ? <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-[#173447]" /> : null}
            </button>
          );
        })}
      </div>

      {tab === "qualifications" ? (
        <div className="space-y-3">
          <div className="inline-flex rounded-xl border border-[#c8d9e0]/60 bg-white/55 p-1">
            {([
              {id: "pending", label: "待审核", count: pendingQualifications.length},
              {id: "history", label: "审核记录", count: qualificationHistory.length},
            ] as const).map((item) => (
              <button
                aria-pressed={qualificationView === item.id}
                className={`min-h-9 rounded-lg px-3.5 text-xs font-medium transition-colors ${
                  qualificationView === item.id
                    ? "bg-[#173447] text-white"
                    : "text-[#67808d] hover:bg-[#edf4f6] hover:text-[#254c61]"
                }`}
                key={item.id}
                onClick={() => setQualificationView(item.id)}
                type="button"
              >
                {item.label} <span className="ml-1 tabular-nums opacity-70">{item.count}</span>
              </button>
            ))}
          </div>
          <QualificationQueue
            error={qualifications.isError ? messageFor(qualifications.error) : undefined}
            history={qualificationView === "history"}
            isLoading={qualifications.isPending}
            items={qualificationView === "history" ? qualificationHistory : pendingQualifications}
            onApprove={(item) => setDecision({kind: "qualification", id: item.id, label: item.cert_name})}
            onReject={(id) => {
              setRejecting({kind: "qualification", id});
              setReason("");
            }}
            onCancelReject={() => setRejecting(null)}
            onRetry={() => void qualifications.refetch()}
            reason={reason}
            rejecting={rejecting?.kind === "qualification" ? {kind: "qualification", id: rejecting.id} : null}
            setReason={setReason}
            submitReject={() => {
              if (!rejecting || !reason.trim()) return;
              action.mutate({kind: "qualification", id: rejecting.id, decision: "reject"});
            }}
          />
        </div>
      ) : null}

      {tab === "products" ? (
        <AdminPanel className="overflow-hidden p-3 sm:p-4">
          <AdminTableShell
            emptyDescription="供给方提交商品后会进入此队列。"
            emptyTitle="暂无待审核商品"
            error={products.isError ? messageFor(products.error) : undefined}
            isLoading={products.isPending}
            onRetry={() => void products.refetch()}
          >
            {pendingProducts.length ? (
              <table className={adminTableClass}>
                <caption className="sr-only">待审核商品</caption>
                <AdminTableHead>
                  <th scope="col">商品</th><th scope="col">供给方</th><th scope="col">类型</th><th scope="col">价格</th><th scope="col">区域</th><th className="text-right" scope="col">操作</th>
                </AdminTableHead>
                <tbody>
                  {pendingProducts.map((item) => (
                    <tr key={item.id}>
                      <th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.gpu_model || `资源 #${item.id}`}</th>
                      <td>#{item.supplier_id}</td>
                      <td>{productTypeCopy[item.product_type] ?? item.product_type}</td>
                      <td>{item.price_negotiable ? "面议" : `${money.format(item.unit_price / 100)} / ${pricingModeCopy[item.pricing_mode] ?? item.pricing_mode}`}</td>
                      <td>{item.region}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="tertiary" onPress={() => setInspecting(item)}>
                            <InteractiveIcon icon={Eye} size={14} />详情
                          </Button>
                          <Button size="sm" variant="tertiary" onPress={() => { setRejecting({kind: "product", id: item.id}); setReason(""); }}>
                            <InteractiveIcon icon={X} size={14} />驳回
                          </Button>
                          <Button size="sm" variant="primary" onPress={() => setDecision({kind: "product", id: item.id, label: item.gpu_model || `商品 #${item.id}`})}>
                            <InteractiveIcon icon={Check} size={14} />通过
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </AdminTableShell>
        </AdminPanel>
      ) : null}

      {tab === "invoices" ? (
        <AdminPanel className="overflow-hidden p-3 sm:p-4">
          <AdminTableShell
            emptyDescription="买家提交开票申请后会进入此队列。"
            emptyTitle="暂无待处理发票"
            error={invoices.isError ? messageFor(invoices.error) : undefined}
            isLoading={invoices.isPending}
            onRetry={() => void invoices.refetch()}
          >
            {invoices.data?.items.length ? (
              <table className={adminTableClass}>
                <caption className="sr-only">待处理发票</caption>
                <AdminTableHead>
                  <th scope="col">申请单</th><th scope="col">抬头</th><th scope="col">税号</th><th scope="col">金额</th><th scope="col">申请时间</th><th className="text-right" scope="col">操作</th>
                </AdminTableHead>
                <tbody>
                  {invoices.data.items.map((item) => (
                    <tr key={item.id}>
                      <th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.invoice_no}</th>
                      <td>{item.company_name}</td>
                      <td>{item.tax_no}</td>
                      <td>{money.format(item.amount_fen / 100)}</td>
                      <td>{formatDateTime(item.applied_at)}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="tertiary" onPress={() => { setRejecting({kind: "invoice", id: item.id}); setReason(""); }}>
                            驳回
                          </Button>
                          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#173447] px-3 text-xs font-medium text-white hover:bg-[#254c61]">
                            <InteractiveIcon icon={FileUp} size={14} />完成开票
                            <input
                              accept="application/pdf"
                              className="sr-only"
                              type="file"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) invoiceAction.mutate({id: item.id, file});
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </AdminTableShell>
        </AdminPanel>
      ) : null}

      {rejecting?.kind === "invoice" ? (
        <RejectBar
          isPending={invoiceAction.isPending}
          onCancel={() => setRejecting(null)}
          onSubmit={() => reason.trim() && invoiceAction.mutate({id: rejecting.id, reason: reason.trim()})}
          reason={reason}
          setReason={setReason}
          title="驳回发票申请"
        />
      ) : null}

      <ProductDetailDrawer
        isPending={action.isPending}
        onApprove={(item) => {
          setInspecting(null);
          setDecision({kind: "product", id: item.id, label: item.gpu_model || `商品 #${item.id}`});
        }}
        onClose={() => setInspecting(null)}
        onReject={(item) => { setInspecting(null); setRejecting({kind: "product", id: item.id}); setReason(""); }}
        product={inspecting}
      />

      {rejecting?.kind === "product" ? (
        <RejectBar title="商品驳回原因" reason={reason} setReason={setReason} isPending={action.isPending}
          onCancel={() => setRejecting(null)}
          onSubmit={() => action.mutate({kind: "product", id: rejecting.id, decision: "reject"})} />
      ) : null}

      <ConfirmDialog
        confirmLabel="确认通过"
        description={decision ? `通过“${decision.label}”后，审核状态将立即更新。` : ""}
        isPending={action.isPending}
        onCancel={() => setDecision(null)}
        onConfirm={() => decision && action.mutate({...decision, decision: "approve"})}
        open={Boolean(decision)}
        title="确认审核通过"
      />
    </AdminPage>
  );
}

function ProductDetailDrawer({
  isPending,
  onApprove,
  onClose,
  onReject,
  product,
}: {
  isPending: boolean;
  onApprove: (product: AdminProduct) => void;
  onClose: () => void;
  onReject: (product: AdminProduct) => void;
  product: AdminProduct | null;
}) {
  const price = product
    ? product.price_negotiable
      ? "面议"
      : `${money.format(product.unit_price / 100)} / ${pricingModeCopy[product.pricing_mode] ?? product.pricing_mode}`
    : "";

  return (
    <Drawer.Root isOpen={Boolean(product)} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onClose(); }}>
      <Drawer.Backdrop isDismissable={!isPending}>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full sm:max-w-xl">
            <Drawer.Header className="border-b border-border px-6 py-5">
              <div className="min-w-0 pr-8">
                <p className="text-xs font-medium text-muted">商品 #{product?.id}</p>
                <Drawer.Heading className="mt-1 truncate text-xl font-semibold tracking-[-0.02em] text-foreground">
                  {product?.gpu_model || "算力资源"}
                </Drawer.Heading>
              </div>
            </Drawer.Header>
            <Drawer.Body className="omnis-scrollbar-y px-6 py-6">
              {product ? (
                <div className="space-y-7">
                  <dl className="grid grid-cols-3 gap-x-4 border-b border-border pb-6">
                    <ProductDetailMetric label="类型" value={productTypeCopy[product.product_type] ?? product.product_type} />
                    <ProductDetailMetric label="区域" value={product.region || "—"} />
                    <div>
                      <dt className="text-xs text-muted">状态</dt>
                      <dd className="mt-2"><StatusBadge status={product.status} /></dd>
                    </div>
                  </dl>

                  <ProductDetailSection title="资源规格">
                    <ProductDetailRow label="GPU 型号" value={product.gpu_model || "—"} />
                    <ProductDetailRow label="卡数" value={`${product.card_count} 张`} />
                    {product.machine_count ? <ProductDetailRow label="机器数量" value={`${product.machine_count} 台`} /> : null}
                    {product.total_pflops_approx ? <ProductDetailRow label="总算力" value={`${product.total_pflops_approx} PFLOPS`} /> : null}
                    {product.power_capacity_kw ? <ProductDetailRow label="电力容量" value={`${product.power_capacity_kw} kW`} /> : null}
                    {product.rack_count ? <ProductDetailRow label="机柜数量" value={`${product.rack_count} 个`} /> : null}
                    <ProductDetailRow label="CPU" value={product.cpu_spec || "—"} />
                    <ProductDetailRow label="内存" value={product.memory_spec || "—"} />
                    <ProductDetailRow label="存储" value={product.storage_spec || "—"} />
                    <ProductDetailRow label="带宽" value={product.bandwidth_spec || "—"} />
                    <ProductDetailRow label="交付方式" value={(deliveryModeCopy[product.delivery_mode] ?? product.delivery_mode) || "—"} />
                  </ProductDetailSection>

                  <ProductDetailSection title="交易条件">
                    <ProductDetailRow label="计费价格" value={price} />
                    <ProductDetailRow label="可售库存" value={`${product.stock}`} />
                    <ProductDetailRow label="最小起订量" value={`${product.min_order}`} />
                    <ProductDetailRow label="最小计费周期" value={`${product.min_duration}`} />
                    <ProductDetailRow label="可售时段" value={product.available_hours || "—"} />
                  </ProductDetailSection>

                  <ProductDetailSection title="提交信息">
                    <ProductDetailRow label="供给方" value={`#${product.supplier_id}`} />
                    <ProductDetailRow label="平台自营" value={product.self_operated ? "是" : "否"} />
                    <ProductDetailRow label="合规承诺" value={product.compliance_agreed ? "已确认" : "未确认"} />
                    <ProductDetailRow label="提交时间" value={formatDateTime(product.created_at)} />
                  </ProductDetailSection>
                </div>
              ) : null}
            </Drawer.Body>
            <Drawer.Footer className="border-t border-border px-6 py-4">
              <Button isDisabled={isPending} variant="tertiary" onPress={onClose}>关闭</Button>
              <Button isDisabled={isPending || !product} variant="danger-soft" onPress={() => product && onReject(product)}>
                <InteractiveIcon icon={X} size={15} />驳回
              </Button>
              <Button isDisabled={isPending || !product} variant="primary" onPress={() => product && onApprove(product)}>
                <InteractiveIcon icon={Check} size={15} />通过
              </Button>
            </Drawer.Footer>
            <Drawer.CloseTrigger />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

function ProductDetailSection({children, title}: {children: React.ReactNode; title: string}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  );
}

function ProductDetailRow({label, value}: {label: string; value: string}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="break-words text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ProductDetailMetric({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function QualificationQueue({
  error,
  history,
  isLoading,
  items,
  onApprove,
  onCancelReject,
  onReject,
  onRetry,
  reason,
  rejecting,
  setReason,
  submitReject,
}: {
  error?: string;
  history: boolean;
  isLoading: boolean;
  items: AdminQualification[];
  onApprove: (item: AdminQualification) => void;
  onCancelReject: () => void;
  onReject: (id: number) => void;
  onRetry: () => void;
  reason: string;
  rejecting: {kind: "qualification" | "invoice"; id: number} | null;
  setReason: (value: string) => void;
  submitReject: () => void;
}) {
  return (
    <AdminPanel className="overflow-hidden">
      <AdminTableShell
        emptyDescription={history ? "完成审核后，记录会保留在这里。" : "新的供给方与机房资质申请会出现在这里。"}
        emptyTitle={history ? "暂无审核记录" : "暂无待审核资质"}
        error={error}
        isLoading={isLoading}
        onRetry={onRetry}
      >
        {items.length ? (
          <ul className="divide-y divide-[#dce9ee]/70">
            {items.map((item) => (
              <li className="px-5 py-5 sm:px-6" key={item.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[#173447]">{item.cert_name}</h2>
                      <StatusBadge status={item.status} />
                    </div>
                    <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div><dt className="text-xs text-[#8aa0ab]">申请类型</dt><dd className="mt-1 text-[#35566a]">{qualificationType(item.qual_type)}</dd></div>
                      <div><dt className="text-xs text-[#8aa0ab]">证照编号</dt><dd className="mt-1 text-[#35566a]">{item.cert_number || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8aa0ab]">账户</dt><dd className="mt-1 text-[#35566a]">UID-{item.user_id}</dd></div>
                      <div><dt className="text-xs text-[#8aa0ab]">提交时间</dt><dd className="mt-1 text-[#35566a]">{formatDateTime(item.created_at)}</dd></div>
                    </dl>
                    {item.application ? (
                      <dl className="mt-4 grid gap-x-8 gap-y-3 rounded-[14px] bg-[#f3f8fa] p-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                        <div><dt className="text-xs text-[#8aa0ab]">法定代表人</dt><dd className="mt-1 text-[#35566a]">{item.application.representative}</dd></div>
                        <div><dt className="text-xs text-[#8aa0ab]">业务联系人</dt><dd className="mt-1 text-[#35566a]">{item.application.contact_method}</dd></div>
                        <div><dt className="text-xs text-[#8aa0ab]">机房地址</dt><dd className="mt-1 text-[#35566a]">{item.application.facility_address}</dd></div>
                        <div><dt className="text-xs text-[#8aa0ab]">开户银行</dt><dd className="mt-1 text-[#35566a]">{item.application.bank_name}</dd></div>
                        <div><dt className="text-xs text-[#8aa0ab]">供电说明</dt><dd className="mt-1 text-[#35566a]">{item.application.power_description}</dd></div>
                        <div><dt className="text-xs text-[#8aa0ab]">散热说明</dt><dd className="mt-1 text-[#35566a]">{item.application.cooling_description}</dd></div>
                      </dl>
                    ) : null}
                    {item.cert_url ? (
                      <a
                        className="mt-4 inline-flex text-xs font-medium text-[#355f73] underline-offset-4 hover:underline"
                        href={`/api/admin/audits/qualifications/${item.id}/document`}
                      >
                        查看附件：{item.cert_url}
                      </a>
                    ) : null}
                    {history && item.status === "rejected" && item.rejected_reason ? (
                      <p className="mt-3 text-xs text-[#b63b35]">驳回原因：{item.rejected_reason}</p>
                    ) : null}
                  </div>
                  {!history ? (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="tertiary" onPress={() => onReject(item.id)}>
                        <InteractiveIcon icon={RotateCcw} size={14} />驳回
                      </Button>
                      <Button size="sm" variant="primary" onPress={() => onApprove(item)}>
                        <InteractiveIcon icon={Check} size={14} />通过
                      </Button>
                    </div>
                  ) : null}
                </div>
                {rejecting?.kind === "qualification" && rejecting.id === item.id ? (
                  <RejectBar
                    isPending={false}
                    onCancel={onCancelReject}
                    onSubmit={submitReject}
                    reason={reason}
                    setReason={setReason}
                    title="说明驳回原因"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </AdminTableShell>
    </AdminPanel>
  );
}

function RejectBar({
  isPending,
  onCancel,
  onSubmit,
  reason,
  setReason,
  title,
}: {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  reason: string;
  setReason: (value: string) => void;
  title: string;
}) {
  return (
    <div className="mt-4 rounded-[14px] border border-[#ecc9c6] bg-[#fff8f7] p-4">
      <label className="text-xs font-semibold text-[#7e3d38]" htmlFor="admin-reject-reason">{title}</label>
      <textarea
        className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#dec0bd] bg-white px-3 py-2 text-sm text-[#4f3431] outline-none focus:border-[#b63b35] focus:ring-4 focus:ring-[#b63b35]/10"
        id="admin-reject-reason"
        placeholder="请填写具体不符合项，申请方将看到此说明"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button isDisabled={isPending} size="sm" variant="tertiary" onPress={onCancel}>取消</Button>
        <Button isDisabled={!reason.trim()} isPending={isPending} size="sm" variant="danger-soft" onPress={onSubmit}>确认驳回</Button>
      </div>
    </div>
  );
}

function qualificationType(value: string) {
  const copy: Record<string, string> = {
    supplier_onboarding: "供给方入驻",
    idc_license: "IDC 经营许可证",
    telecom_license: "电信业务资质",
    power_cooling: "电力与散热说明",
  };
  return copy[value] ?? value;
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "请求未完成";
}

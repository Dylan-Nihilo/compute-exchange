import {AdminPage, AdminPanel} from "../admin-ui";

/**
 * Global deployment view (docs/27 §27.8 运营: GET /admin/deployments?state=&health=). The backend has
 * no such route yet (deployments are T-098/T-099), so nothing is fetched and no fields are assumed;
 * this renders an explicit "not yet available" state until the contract exists.
 */
export function AdminDeployments() {
  return (
    <AdminPage description="全局查看买家在托管租约上的模型部署、健康状态与失败原因。" eyebrow="Model deployments" title="部署总览">
      <AdminPanel className="p-4 sm:p-5">
        <p className="text-sm font-medium">部署总览暂未开放</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          后端尚未提供模型部署接口（部署、健康检测与运营检索），此页面不显示任何数据。接口上线后在此展示部署状态、健康与失败原因。
          部署相关的节点任务可在“租约与会话 → 节点任务”中按状态检索。
        </p>
      </AdminPanel>
    </AdminPage>
  );
}

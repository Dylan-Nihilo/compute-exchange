import {CopyBlock} from "@/components/scheduler/managed-node/copy-block";
import type {ManagedAccess} from "@/lib/managed-orders";
import {engineCommands} from "@/lib/model-deploy";

/** Private engine access (docs/27 §27.4.2): reachable only inside the lease network or via the gateway tunnel. */
export function DeploymentAccess({access}: {access: ManagedAccess | undefined}) {
  const commands = access ? engineCommands(access.login, access.gateway_host, access.gateway_port) : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        引擎默认私有、无需 API Key，仅租约内网络可达。兼容 OpenAI 接口（/v1/models、/v1/chat/completions）。
      </p>
      <CopyBlock label="在租约容器内" value={commands?.inLease ?? "curl http://omnis-engine:8000/v1/models"} />
      {commands ? (
        <>
          <CopyBlock label="在本地：先经网关建立端口转发（保持该窗口不关闭）" value={commands.tunnel} />
          <CopyBlock label="然后在本地另开终端调用" value={commands.local} />
        </>
      ) : (
        <p className="text-xs text-muted">连接信息读取失败时无法生成端口转发命令，请回到订单详情查看网关登录信息。</p>
      )}
    </div>
  );
}

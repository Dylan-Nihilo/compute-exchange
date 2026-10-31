import {CopyBlock} from "@/components/scheduler/managed-node/copy-block";
import type {ManagedAccess} from "@/lib/managed-orders";
import {engineCommands, type Deployment} from "@/lib/model-deploy";

/**
 * Private engine access (docs/27 §27.4.2): reachable only inside the lease network or via the gateway tunnel.
 * Prefers the backend's DeploymentView.access (base_url / served_model / port_forward_cmd); the lease login
 * is only used to build the tunnel command when the backend omits it.
 */
export function DeploymentAccess({access, engine}: {access: ManagedAccess | undefined; engine: Deployment["access"]}) {
  const fallback = access ? engineCommands(access.login, access.gateway_host, access.gateway_port) : null;
  const baseUrl = engine?.base_url.replace(/\/+$/, "") ?? null;
  const inLease = baseUrl ? `curl ${baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`}/models` : fallback?.inLease;
  const tunnel = engine?.port_forward_cmd || fallback?.tunnel;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        引擎默认私有、无需 API Key，仅租约内网络可达。兼容 OpenAI 接口（/v1/models、/v1/chat/completions）
        {engine?.served_model ? <>，请求中的 model 填 <code className="font-mono">{engine.served_model}</code></> : null}。
      </p>
      {inLease ? <CopyBlock label="在租约容器内" value={inLease} /> : null}
      {tunnel ? (
        <>
          <CopyBlock label="在本地：先经网关建立端口转发（保持该窗口不关闭）" value={tunnel} />
          <CopyBlock label="然后在本地另开终端调用" value="curl http://127.0.0.1:8000/v1/models" />
        </>
      ) : (
        <p className="text-xs text-muted">暂未取得端口转发命令，请回到订单详情查看网关登录信息。</p>
      )}
      {!engine ? <p className="text-xs text-muted">部署详情暂未返回访问地址，以上为按默认引擎地址生成的命令。</p> : null}
    </div>
  );
}

import {OmnisLoader} from "@/components/system/omnis-loader";

export function RouteLoading({label = "正在加载页面"}: {label?: string}) {
  return (
    <div
      className="route-loading absolute inset-0 z-[100] grid animate-route-loading-enter place-items-center motion-reduce:animate-none"
    >
      <OmnisLoader label={label} />
    </div>
  );
}

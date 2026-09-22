"use client";

import {useRouter} from "next/navigation";
import {useEffect} from "react";

// 工作台侧栏用 router.push 导航(非 <Link>, 没有自动预取), 不预取时每次切换
// sheet 都要先等一个 RSC 往返才有视觉反馈, 体感明显卡顿。挂载时把侧栏路由
// 全部预取, 之后的切换直接命中客户端缓存, 即点即换。
export function usePrefetchRoutes(hrefs: readonly string[]) {
  const router = useRouter();
  const key = hrefs.join("|");
  useEffect(() => {
    for (const href of key.split("|")) {
      if (href) router.prefetch(href);
    }
  }, [key, router]);
}

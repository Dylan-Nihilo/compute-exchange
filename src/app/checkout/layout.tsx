import type {ReactNode} from "react";

import {AccessBoundary} from "@/components/auth/access-boundary";

export default function CheckoutLayout({children}: {children: ReactNode}) {
  return <AccessBoundary role="buyer">{children}</AccessBoundary>;
}

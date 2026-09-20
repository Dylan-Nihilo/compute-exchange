import type {Metadata} from "next";

import {LeasingExperience} from "@/components/leads/leasing-experience";

export const metadata: Metadata = {title: "设备融资租赁 · OmniS"};

export default function LeasingPage() {
  return <LeasingExperience />;
}

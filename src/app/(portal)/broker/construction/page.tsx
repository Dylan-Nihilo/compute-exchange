import type {Metadata} from "next";

import {ConstructionExperience} from "@/components/leads/construction-experience";

export const metadata: Metadata = {title: "组网与机电安装服务 · OmniS"};

export default function ConstructionBrokerPage() {
  return <ConstructionExperience />;
}

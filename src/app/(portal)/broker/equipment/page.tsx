import type {Metadata} from "next";

import {EquipmentExperience} from "@/components/leads/equipment-experience";

export const metadata: Metadata = {title: "设备整包销售 · OmniS"};

export default function EquipmentBrokerPage() {
  return <EquipmentExperience />;
}

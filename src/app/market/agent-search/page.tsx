import {AccessBoundary} from "@/components/auth/access-boundary";
import {AgentSearchView} from "@/components/market/agent-search-view";

export default function Page() { return <AccessBoundary><AgentSearchView /></AccessBoundary>; }

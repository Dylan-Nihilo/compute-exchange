import type {Role} from "../domain/contracts.ts";
import {homeForRole, matchRoute} from "../domain/routes.ts";
import type {SessionAccount} from "./service.ts";

export function resolveActiveRole(
  roles: readonly Role[],
  activeRole: Role | null,
): Role {
  if (activeRole && roles.includes(activeRole)) return activeRole;
  return roles[0] ?? "guest";
}

export function resolvePostAuthDestination(
  account: SessionAccount,
  nextPath: string | null,
): {path: string; role: Exclude<Role, "guest">} {
  const route = nextPath ? matchRoute(nextPath) : null;
  const routeRole = route?.roles.find(
    (role): role is Exclude<Role, "guest"> =>
      role !== "guest" && account.roles.includes(role),
  );
  const role = routeRole ?? account.roles[0];
  return {
    path: nextPath && route?.roles.includes(role) ? nextPath : homeForRole(role),
    role,
  };
}

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (hasUnsafePathCharacters(value)) return null;

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || hasUnsafePathCharacters(decoded)) return null;

    const url = new URL(value, "https://compute.exchange");
    if (url.origin !== "https://compute.exchange") return null;
    if (url.pathname.startsWith("//") || hasUnsafePathCharacters(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function hasUnsafePathCharacters(value: string) {
  return value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value);
}

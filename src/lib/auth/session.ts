import type {Role} from "../domain/contracts.ts";

export function resolveActiveRole(
  roles: readonly Role[],
  activeRole: Role | null,
): Role {
  if (activeRole && roles.includes(activeRole)) return activeRole;
  return roles[0] ?? "guest";
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

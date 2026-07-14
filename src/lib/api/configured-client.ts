import {publicEnv, type PublicEnv} from "../config/public-env.ts";
import {createApiClient, type ApiClient} from "./client.ts";

export function createApiClientForEnvironment(
  environment: PublicEnv,
  fetchImplementation?: typeof fetch,
): ApiClient | null {
  if (!environment.NEXT_PUBLIC_API_BASE_URL) return null;

  return createApiClient({
    baseUrl: environment.NEXT_PUBLIC_API_BASE_URL,
    fetchImplementation,
  });
}

export const apiClient = createApiClientForEnvironment(publicEnv);

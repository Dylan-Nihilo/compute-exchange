import {publicEnv, type PublicEnv} from "../config/public-env.ts";
import {createApiClient, type ApiClient} from "./client.ts";

export function createApiClientForEnvironment(
  environment: PublicEnv,
  fetchImplementation?: typeof fetch,
): ApiClient | null {
  if (environment.NEXT_PUBLIC_DATA_SOURCE !== "http") return null;
  if (!environment.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error("HTTP data source requires NEXT_PUBLIC_API_BASE_URL");
  }

  return createApiClient({
    baseUrl: environment.NEXT_PUBLIC_API_BASE_URL,
    fetchImplementation,
  });
}

export const apiClient = createApiClientForEnvironment(publicEnv);

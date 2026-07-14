import {z} from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_DATA_SOURCE: z.enum(["mock", "http"]).default("mock"),
}).superRefine((environment, context) => {
  if (
    environment.NEXT_PUBLIC_DATA_SOURCE === "http" &&
    !environment.NEXT_PUBLIC_API_BASE_URL
  ) {
    context.addIssue({
      code: "custom",
      message: "NEXT_PUBLIC_API_BASE_URL is required for the HTTP data source",
      path: ["NEXT_PUBLIC_API_BASE_URL"],
    });
  }
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  return publicEnvSchema.parse(source);
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE,
});

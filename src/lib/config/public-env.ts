import {z} from "zod";

const httpUrlSchema = z.string().url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  {message: "Expected an HTTP(S) URL"},
);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    httpUrlSchema.optional(),
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  return publicEnvSchema.parse(source);
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

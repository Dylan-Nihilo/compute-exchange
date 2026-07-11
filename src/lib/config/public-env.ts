import {z} from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_DATA_SOURCE: z.enum(["mock", "http"]).default("mock"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE,
});

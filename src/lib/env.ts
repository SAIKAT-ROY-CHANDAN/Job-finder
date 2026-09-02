import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  MAX_JOB_SCORING_LIMIT: z.coerce.number().default(100),
  MAX_APPLICATIONS_PER_USER: z.coerce.number().default(20),
  PLAYWRIGHT_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  RAPIDAPI_KEY: z.string().optional(),
  JOB_RSS_FEED_URLS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => i.message).join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;

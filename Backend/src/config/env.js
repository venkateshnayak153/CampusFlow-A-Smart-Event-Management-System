import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  QR_HMAC_SECRET: z.string().min(16, 'QR_HMAC_SECRET must be at least 16 characters'),
  APPROVAL_TOKEN_PEPPER: z.string().min(16, 'APPROVAL_TOKEN_PEPPER must be at least 16 characters'),
  
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('CampusFlow <no-reply@college.edu>'),
  
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_EMAIL_DOMAINS: z.string().transform((val) => val.split(',').map((d) => d.trim().toLowerCase())),
  CORS_ORIGINS: z.string().transform((val) => val.split(',').map((o) => o.trim())),
  ENABLE_CRON: z.enum(['true', 'false']).default('true').transform((val) => val === 'true')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed. Review your .env configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

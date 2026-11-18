import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'QR_HMAC_SECRET',
  'APPROVAL_TOKEN_PEPPER'
];

const missing = [];
for (const varName of requiredEnvVars) {
  if (!process.env[varName] || process.env[varName].trim() === '') {
    missing.push(varName);
  }
}

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const allowedDomainsRaw = process.env.ALLOWED_EMAIL_DOMAINS || 'students.git.edu,git.edu';
const corsOriginsRaw = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  QR_HMAC_SECRET: process.env.QR_HMAC_SECRET,
  APPROVAL_TOKEN_PEPPER: process.env.APPROVAL_TOKEN_PEPPER,

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'CampusFlow <no-reply@college.edu>',

  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5173',
  ALLOWED_EMAIL_DOMAINS: allowedDomainsRaw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
  CORS_ORIGINS: corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean),
  ENABLE_CRON: process.env.ENABLE_CRON !== 'false'
};

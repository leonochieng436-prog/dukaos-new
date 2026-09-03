# ── Database ──────────────────────────────────────────────
# Local PostgreSQL for development (Docker or local install)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
# Direct connection (used by Prisma Migrate)
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# ── Auth ──────────────────────────────────────────────────
AUTH_SECRET="replace-with-a-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ── M-Pesa (Safaricom Daraja) ─────────────────────────────
# Stored per-organization in DB in production; these are fallback/dev values.
M_PESA_ENV="sandbox"
M_PESA_CONSUMER_KEY=""
M_PESA_CONSUMER_SECRET=""
M_PESA_PASSKEY=""
M_PESA_SHORTCODE=""
M_PESA_CALLBACK_URL=""
MPESA_CALLBACK_SECRET=""

# ── Messaging ─────────────────────────────────────────────
EMAIL_API_KEY=""
EMAIL_FROM="no-reply@example.com"
SMS_API_KEY=""
SMS_USERNAME=""
WHATSAPP_API_KEY=""
WHATSAPP_PHONE_NUMBER_ID=""

# ── Object storage (product images, receipts, attachments) ─
STORAGE_ENDPOINT=""
STORAGE_ACCESS_KEY_ID=""
STORAGE_SECRET_ACCESS_KEY=""
STORAGE_BUCKET=""
STORAGE_REGION=""

# ── Generic card/bank payment provider (future) ───────────
PAYMENT_PROVIDER_API_KEY=""

# ── Scheduled jobs (Vercel Cron) ───────────────────────────
# Shared secret Vercel Cron sends as a header so /api/cron/* routes can
# verify the request actually came from the scheduler, not the public
# internet. Generate with: openssl rand -hex 32
CRON_SECRET=""

# NOTE: Never prefix secrets with NEXT_PUBLIC_. Only non-secret,
# client-safe values (like NEXT_PUBLIC_APP_URL) may use that prefix.

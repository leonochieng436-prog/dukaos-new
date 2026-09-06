ALTER TABLE "subscriptions" ADD COLUMN "registerLimit" INTEGER NOT NULL DEFAULT 1;

UPDATE "subscriptions"
SET "registerLimit" = CASE "plan"
  WHEN 'trial' THEN 1
  WHEN 'starter' THEN 2
  WHEN 'growth' THEN 15
  WHEN 'enterprise' THEN 999
  ELSE 1
END;

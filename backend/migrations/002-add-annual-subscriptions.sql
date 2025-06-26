-- Migration: Add Annual Subscription Support
-- Date: 2025-06-26
-- Description: Add billing_cycle, discount_percentage, and stripe_price_id to subscription_plans

-- Add new columns to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN stripe_price_id VARCHAR(255) UNIQUE;

-- Update existing plans to have proper billing_cycle
UPDATE subscription_plans SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL;

-- Make billing_cycle NOT NULL after setting defaults
ALTER TABLE subscription_plans ALTER COLUMN billing_cycle SET NOT NULL;

-- Insert Annual Pro Plan
INSERT INTO subscription_plans (
  id,
  name,
  price,
  currency,
  duration_days,
  billing_cycle,
  discount_percentage,
  features,
  max_downloads_per_day,
  max_concurrent_streams,
  max_quality,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Pro Annual',
  950000,
  'VND',
  365,
  'annual',
  20.00,
  '["unlimited_downloads", "4k_quality", "concurrent_streams", "priority_support", "no_ads", "playlist_download", "api_access"]',
  999999,
  5,
  'best',
  true,
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;

-- Update existing Pro plan to be monthly
UPDATE subscription_plans 
SET 
  name = 'Pro Monthly',
  billing_cycle = 'monthly',
  discount_percentage = 0
WHERE name = 'Pro' OR name = 'pro';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_cycle ON subscription_plans(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_id ON subscription_plans(stripe_price_id);

-- Add comments for documentation
COMMENT ON COLUMN subscription_plans.billing_cycle IS 'Billing frequency: monthly or annual';
COMMENT ON COLUMN subscription_plans.discount_percentage IS 'Discount percentage for annual plans (0-100)';
COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'Stripe Price ID for payment processing';

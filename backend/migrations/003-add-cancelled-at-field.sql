-- Migration: Add cancelled_at field to user_subscriptions
-- Date: 2025-06-26
-- Description: Add cancelled_at timestamp field to track when subscriptions were cancelled

-- Add cancelled_at column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN cancelled_at TIMESTAMP NULL;

-- Create index for better performance on cancelled subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancelled_at ON user_subscriptions(cancelled_at);

-- Add comment for documentation
COMMENT ON COLUMN user_subscriptions.cancelled_at IS 'Timestamp when subscription was cancelled (NULL if not cancelled)';

-- Migration: Create cookies table
-- Created: 2025-06-27
-- Description: Create table for cookie file management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cookies table
CREATE TABLE IF NOT EXISTS cookies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'unknown',
    description TEXT,
    cookie_count INTEGER NOT NULL DEFAULT 0,
    domains JSONB NOT NULL DEFAULT '[]'::jsonb,
    uploaded_by UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_tested TIMESTAMP,
    test_result JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_cookies_uploaded_by 
        FOREIGN KEY (uploaded_by) 
        REFERENCES admins(id) 
        ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_cookies_platform 
        CHECK (platform IN ('youtube', 'tiktok', 'facebook', 'instagram', 'twitter', 'unknown')),
    CONSTRAINT chk_cookies_cookie_count 
        CHECK (cookie_count >= 0),
    CONSTRAINT chk_cookies_filename_length 
        CHECK (LENGTH(filename) > 0 AND LENGTH(filename) <= 255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cookies_platform ON cookies(platform);
CREATE INDEX IF NOT EXISTS idx_cookies_is_active ON cookies(is_active);
CREATE INDEX IF NOT EXISTS idx_cookies_uploaded_by ON cookies(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_cookies_created_at ON cookies(created_at);
CREATE INDEX IF NOT EXISTS idx_cookies_last_tested ON cookies(last_tested);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cookies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cookies_updated_at
    BEFORE UPDATE ON cookies
    FOR EACH ROW
    EXECUTE FUNCTION update_cookies_updated_at();

-- Add comments for documentation
COMMENT ON TABLE cookies IS 'Cookie files uploaded by admins for streaming services';
COMMENT ON COLUMN cookies.id IS 'Unique identifier for the cookie record';
COMMENT ON COLUMN cookies.filename IS 'Original filename of the uploaded cookie file';
COMMENT ON COLUMN cookies.file_path IS 'Full path to the stored cookie file on disk';
COMMENT ON COLUMN cookies.platform IS 'Platform the cookie is intended for (youtube, tiktok, etc.)';
COMMENT ON COLUMN cookies.description IS 'Optional description provided by the admin';
COMMENT ON COLUMN cookies.cookie_count IS 'Number of cookies found in the file';
COMMENT ON COLUMN cookies.domains IS 'JSON array of domains found in the cookie file';
COMMENT ON COLUMN cookies.uploaded_by IS 'ID of the admin who uploaded the cookie file';
COMMENT ON COLUMN cookies.is_active IS 'Whether the cookie file is currently active/enabled';
COMMENT ON COLUMN cookies.last_tested IS 'Timestamp of the last time the cookie was tested';
COMMENT ON COLUMN cookies.test_result IS 'JSON object containing the results of the last test';
COMMENT ON COLUMN cookies.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN cookies.updated_at IS 'Timestamp when the record was last updated';

-- Insert sample data (optional, for testing)
-- INSERT INTO cookies (
--     filename,
--     file_path,
--     platform,
--     description,
--     cookie_count,
--     domains,
--     uploaded_by
-- ) VALUES (
--     'youtube_cookies.txt',
--     '/tmp/cookies/youtube_cookies.txt',
--     'youtube',
--     'YouTube cookies for premium content access',
--     25,
--     '["youtube.com", "googlevideo.com", "ytimg.com"]'::jsonb,
--     (SELECT id FROM admins WHERE email = 'admin@taivideonhanh.vn' LIMIT 1)
-- ) ON CONFLICT DO NOTHING;

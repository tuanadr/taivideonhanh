-- Migration: Create Default Admin User
-- Description: Creates a default super admin user with full permissions
-- Date: 2024-01-01
-- Author: TaiVideoNhanh System

-- First, ensure the admins table exists with proper structure
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (only if no admin exists)
DO $$
DECLARE
    admin_count INTEGER;
    default_email VARCHAR(255) := 'admin@taivideonhanh.com';
    default_password_hash VARCHAR(255);
BEGIN
    -- Check if any admin users exist
    SELECT COUNT(*) INTO admin_count FROM admins;
    
    IF admin_count = 0 THEN
        -- Hash the default password (admin123456)
        -- Note: In production, this should be done by the application
        -- This is a bcrypt hash of 'admin123456' with salt rounds 12
        default_password_hash := '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.JOOdS8u';
        
        -- Insert default admin
        INSERT INTO admins (
            email,
            password_hash,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            default_email,
            default_password_hash,
            'super_admin',
            '["user_management", "subscription_management", "payment_management", "system_settings", "analytics_view"]'::jsonb,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Default admin user created: %', default_email;
        RAISE NOTICE 'Default password: admin123456';
        RAISE NOTICE 'Please change the password after first login!';
    ELSE
        RAISE NOTICE 'Admin users already exist. Skipping default admin creation.';
    END IF;
END $$;

-- Create additional admin management functions

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user(
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255),
    p_role VARCHAR(50) DEFAULT 'moderator',
    p_permissions JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
    new_admin_id UUID;
BEGIN
    INSERT INTO admins (email, password_hash, role, permissions)
    VALUES (p_email, p_password_hash, p_role, p_permissions)
    RETURNING id INTO new_admin_id;
    
    RETURN new_admin_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update admin permissions
CREATE OR REPLACE FUNCTION update_admin_permissions(
    p_admin_id UUID,
    p_permissions JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE admins 
    SET permissions = p_permissions, updated_at = NOW()
    WHERE id = p_admin_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate admin
CREATE OR REPLACE FUNCTION deactivate_admin(p_admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE admins 
    SET is_active = false, updated_at = NOW()
    WHERE id = p_admin_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin by email
CREATE OR REPLACE FUNCTION get_admin_by_email(p_email VARCHAR(255))
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50),
    permissions JSONB,
    is_active BOOLEAN,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.email, a.password_hash, a.role, a.permissions, 
           a.is_active, a.last_login, a.created_at, a.updated_at
    FROM admins a
    WHERE a.email = p_email AND a.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create view for admin statistics
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
    COUNT(*) as total_admins,
    COUNT(*) FILTER (WHERE is_active = true) as active_admins,
    COUNT(*) FILTER (WHERE role = 'super_admin') as super_admins,
    COUNT(*) FILTER (WHERE role = 'admin') as admins,
    COUNT(*) FILTER (WHERE role = 'moderator') as moderators,
    COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '30 days') as active_last_30_days
FROM admins;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON admins TO your_app_user;
-- GRANT USAGE ON SEQUENCE admins_id_seq TO your_app_user;
-- GRANT EXECUTE ON FUNCTION create_admin_user TO your_app_user;
-- GRANT EXECUTE ON FUNCTION update_admin_permissions TO your_app_user;
-- GRANT EXECUTE ON FUNCTION deactivate_admin TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_admin_by_email TO your_app_user;
-- GRANT SELECT ON admin_stats TO your_app_user;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Admin migration completed successfully!';
    RAISE NOTICE 'Default admin credentials:';
    RAISE NOTICE 'Email: admin@taivideonhanh.com';
    RAISE NOTICE 'Password: admin123456';
    RAISE NOTICE 'Role: super_admin';
    RAISE NOTICE 'Permissions: user_management, subscription_management, payment_management, system_settings, analytics_view';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Change the default password after first login!';
    RAISE NOTICE 'You can also use the create-admin-user.js script to manage admin users.';
END $$;

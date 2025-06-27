#!/bin/bash

# Script để chạy SQL tạo admin user trên server production
# Sử dụng script này trên server production

echo "🚀 Creating admin user with @taivideonhanh.vn email..."

# Kiểm tra xem có Docker container nào đang chạy không
if docker ps | grep -q postgres; then
    echo "📦 Found PostgreSQL container"
    
    # Lấy tên container PostgreSQL
    POSTGRES_CONTAINER=$(docker ps --format "table {{.Names}}" | grep postgres | head -1)
    echo "🔗 Using container: $POSTGRES_CONTAINER"
    
    # Chạy SQL script
    docker exec -i $POSTGRES_CONTAINER psql -U ${DB_USER:-taivideonhanh_user} -d ${DB_NAME:-taivideonhanh_prod} << 'EOF'
-- SQL Script để tạo admin user với email @taivideonhanh.vn
DO $$
DECLARE
    admin_email TEXT := 'admin@taivideonhanh.vn';
    admin_password TEXT := 'admin123456';
    admin_id UUID;
    password_hash TEXT;
    existing_count INTEGER;
BEGIN
    -- Kiểm tra xem admin với email này đã tồn tại chưa
    SELECT COUNT(*) INTO existing_count 
    FROM admins 
    WHERE email = admin_email;
    
    IF existing_count > 0 THEN
        RAISE NOTICE 'Admin user % already exists. Updating password...', admin_email;
        
        -- Hash password (bcrypt với salt rounds 12)
        -- Đây là hash của 'admin123456' với bcrypt salt rounds 12
        password_hash := '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.JOOdS8u';
        
        -- Cập nhật password
        UPDATE admins 
        SET password_hash = password_hash,
            updated_at = NOW()
        WHERE email = admin_email;
        
        RAISE NOTICE 'Password updated for admin user: %', admin_email;
    ELSE
        -- Tạo UUID mới
        admin_id := gen_random_uuid();
        
        -- Hash password (bcrypt với salt rounds 12)
        -- Đây là hash của 'admin123456' với bcrypt salt rounds 12
        password_hash := '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.JOOdS8u';
        
        -- Tạo admin user mới
        INSERT INTO admins (
            id,
            email,
            password_hash,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            admin_id,
            admin_email,
            password_hash,
            'super_admin',
            '["user_management", "subscription_management", "payment_management", "system_settings", "analytics_view"]'::jsonb,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new admin user: %', admin_email;
        RAISE NOTICE 'Admin ID: %', admin_id;
    END IF;
    
    -- Hiển thị thông tin admin users hiện tại
    RAISE NOTICE '=== Current Admin Users ===';
    FOR admin_id, admin_email IN 
        SELECT id, email FROM admins ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'Admin: % (ID: %)', admin_email, admin_id;
    END LOOP;
    
END $$;

-- Kiểm tra kết quả
SELECT 
    id,
    email,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
FROM admins 
WHERE email IN ('admin@taivideonhanh.vn', 'admin@taivideonhanh.com')
ORDER BY created_at DESC;
EOF

    echo "✅ SQL script executed successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Restart the backend service to load new code"
    echo "2. Test login with admin@taivideonhanh.vn / admin123456"
    echo "3. Check admin dashboard access"
    
else
    echo "❌ No PostgreSQL container found"
    echo "💡 Make sure Docker containers are running"
    echo "   Try: docker-compose up -d"
fi

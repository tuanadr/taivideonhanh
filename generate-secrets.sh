#!/bin/bash

# Generate secure secrets for EasyPanel deployment

echo "🔐 Generating secure secrets for TaiVideoNhanh..."
echo "================================================"

# Generate JWT secrets
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo ""
echo "✅ Generated secrets:"
echo "===================="
echo ""
echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""
echo "📋 Copy these to your EasyPanel environment variables!"
echo ""
echo "⚠️  Keep these secrets secure and never commit them to git!"

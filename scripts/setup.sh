#!/bin/bash
set -e

echo "🚀 Setting up PII Redaction Compliance Gateway..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Install Docker to use docker-compose setup."
else
    echo "✅ Docker found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment files if they don't exist
if [ ! -f packages/backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp packages/backend/.env.example packages/backend/.env
fi

if [ ! -f packages/dashboard/.env ]; then
    echo "📝 Creating dashboard .env file..."
    cp packages/dashboard/.env.example packages/dashboard/.env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL (or run: docker-compose up -d postgres)"
echo "2. Run database migrations: cd packages/backend && npx prisma migrate dev"
echo "3. Start the backend: npm run dev"
echo "4. Start the dashboard: npm run dev:dashboard"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose up -d"
echo ""

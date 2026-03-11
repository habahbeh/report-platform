#!/bin/bash

# Report Platform Startup Script

echo "🚀 Starting Report Platform..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the project directory
if [ ! -f "docker-compose.yml" ]; then
    echo "Please run this script from the project root directory"
    exit 1
fi

# Backend setup
echo -e "${BLUE}📦 Setting up Backend...${NC}"
cd backend

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for development)
# Uncomment below for PostgreSQL
# DATABASE_URL=postgres://user:pass@localhost:5432/report_platform

# AI Keys (optional)
# ANTHROPIC_API_KEY=your-key-here
# GOOGLE_API_KEY=your-key-here
EOF
fi

# Run migrations
echo "Running migrations..."
python manage.py migrate --run-syncdb 2>/dev/null

# Setup demo data
echo "Setting up demo data..."
python manage.py setup_demo 2>/dev/null || echo "Demo setup skipped (may already exist)"

# Start backend server
echo -e "${GREEN}✓ Backend ready!${NC}"
echo "Starting Django server on http://localhost:8000"
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

cd ..

# Frontend setup
echo ""
echo -e "${BLUE}📦 Setting up Frontend...${NC}"
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
fi

# Start frontend server
echo -e "${GREEN}✓ Frontend ready!${NC}"
echo "Starting Next.js on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Report Platform is running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000/api"
echo "👤 Admin: http://localhost:8000/admin"
echo ""
echo "📝 Demo Login:"
echo "   Username: demo"
echo "   Password: demo1234"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait

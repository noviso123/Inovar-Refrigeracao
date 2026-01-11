#!/bin/bash
#
# Build Frontend Script
# This script builds the Svelte frontend and copies it to the backend static directory
#

set -e  # Exit on any error

echo "=================================="
echo "Building Frontend for Production"
echo "=================================="

# Navigate to frontend directory
cd frontend-svelte

echo ""
echo "📦 Installing frontend dependencies..."
npm install

echo ""
echo "🔨 Building frontend..."
npm run build

echo ""
echo "📋 Copying build to backend static directory..."
cd ..
rm -rf backend_python/static
cp -r frontend-svelte/build backend_python/static

echo ""
echo "=================================="
echo "✅ Frontend build complete!"
echo "=================================="
echo ""
echo "Static files are now in backend_python/static/"
echo "You can now run the backend to serve both API and frontend."

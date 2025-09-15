#!/bin/bash

echo "=== Microservices Testing Script ==="
echo "This script tests all microservices endpoints"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local url=$1
    local description=$2
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "URL: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ SUCCESS - HTTP $response${NC}"
        curl -s "$url" | jq . 2>/dev/null || curl -s "$url"
    else
        echo -e "${RED}✗ FAILED - HTTP $response${NC}"
    fi
    echo ""
}

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

echo "=== Testing Individual Services ==="

# Test User Service
test_endpoint "http://localhost:3000" "User Service - Root"
test_endpoint "http://localhost:3000/health" "User Service - Health Check"
test_endpoint "http://localhost:3000/users" "User Service - Get All Users"

# Test Product Service
test_endpoint "http://localhost:3001" "Product Service - Root"
test_endpoint "http://localhost:3001/health" "Product Service - Health Check"
test_endpoint "http://localhost:3001/products" "Product Service - Get All Products"

# Test Gateway Service
test_endpoint "http://localhost:3003" "Gateway Service - Root"
test_endpoint "http://localhost:3003/health" "Gateway Service - Health Check"
test_endpoint "http://localhost:3003/health/services" "Gateway Service - Services Health"
test_endpoint "http://localhost:3003/api/users" "Gateway Service - Users API"
test_endpoint "http://localhost:3003/api/products" "Gateway Service - Products API"
test_endpoint "http://localhost:3003/api/dashboard" "Gateway Service - Dashboard"

echo "=== Testing Complete ==="

#!/bin/bash

# Simple checker for cargo management system
# Usage: sudo ./simple_checker.sh [--keep-running]

set -e  # Exit on any error

# Check if script is running with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check for --keep-running flag
KEEP_RUNNING=false
if [ "$1" = "--keep-running" ]; then
    KEEP_RUNNING=true
    echo "Container will be kept running after tests complete."
fi

REPO_URL="https://github.com/Bhavik-punmiya/National-space-hackathon"
BACKEND_PORT=8000
FRONTEND_PORT=3000
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Cleanup function
cleanup() {
    if [ "$KEEP_RUNNING" = true ]; then
        echo "Keeping container $CONTAINER_ID running as requested."
        echo "To stop it later, run: docker stop $CONTAINER_ID && docker rm $CONTAINER_ID"
        echo "Removing temporary directory: $TEMP_DIR"
        rm -rf "$TEMP_DIR"
    else
        echo "Cleaning up..."
        if [ -n "$CONTAINER_ID" ]; then
            echo "Stopping container $CONTAINER_ID"
            docker stop "$CONTAINER_ID" 2>/dev/null || true
            docker rm "$CONTAINER_ID" 2>/dev/null || true
        fi
        echo "Removing temporary directory: $TEMP_DIR"
        rm -rf "$TEMP_DIR"
    fi
}

# Register cleanup on script exit
trap cleanup EXIT

echo "Cloning repository: $REPO_URL"
git clone "$REPO_URL" "$TEMP_DIR"

echo "Building Docker image"
docker build -t cargo-management-system "$TEMP_DIR"

echo "Running Docker container"
CONTAINER_ID=$(docker run -d -p 9000:$BACKEND_PORT -p 9001:$FRONTEND_PORT cargo-management-system)
echo "Container started with ID: $CONTAINER_ID"

echo "Waiting for backend server to start..."
for i in {1..10}; do
    if curl -s "http://localhost:9000/" > /dev/null; then
        echo "Backend server is up and running!"
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "Backend server did not start within expected time."
        exit 1
    fi
    sleep 2
done

# Test the placement endpoint
echo "Testing placement endpoint..."
RESPONSE=$(curl -s -X POST "http://localhost:9000/api/placement" \
    -H "Content-Type: application/json" \
    -d '{
        "items": [
            {
                "itemId": "test-item-1",
                "name": "Test Item 1",
                "width": 10,
                "depth": 10,
                "height": 10,
                "mass": 1,
                "priority": 1,
                "preferredZone": "A"
            }
        ],
        "containers": [
            {
                "containerId": "test-container-1",
                "zone": "A",
                "width": 100,
                "depth": 100,
                "height": 100
            }
        ]
    }')

echo "Response received: $RESPONSE"

# Check if response contains "success": true (allowing for whitespace variations)
if echo "$RESPONSE" | grep -q '"success"[[:space:]]*:[[:space:]]*true'; then
    echo "✅ SUCCESS: Placement endpoint working!"
    echo "Frontend should be available at http://localhost:9001"
    exit 0
else
    echo "❌ FAILED: Placement endpoint not working"
    echo "Response: $RESPONSE"
    exit 1
fi 
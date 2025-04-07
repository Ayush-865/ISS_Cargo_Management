#!/bin/sh
# Start the backend
cd /backend
python -m app.main &
BACKEND_PID=$!

# Start the frontend
cd /frontend
npm run start &
FRONTEND_PID=$!

# Handle termination properly
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Wait for processes to finish
wait 
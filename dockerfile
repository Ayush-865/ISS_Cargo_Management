FROM ubuntu:22.04

# Install Python and Node.js
RUN apt-get update && \
    apt-get install -y curl python3 python3-pip && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy backend and frontend
COPY backend /app/backend
COPY frontend /app/frontend

# Install backend dependencies
WORKDIR /app/backend
RUN pip3 install -r requirements.txt

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Create startup script
WORKDIR /app
RUN echo '#!/bin/sh\n' \
         'cd /app/backend\n' \
         'python3 -m app.main &\n' \
         'cd /app/frontend\n' \
         'npm run start\n' \
         'wait' > /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports
EXPOSE 8000 3000

# Run both services
CMD ["/app/start.sh"]

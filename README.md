# National Space Hackathon Project

This repository contains a full-stack application for the National Space Hackathon with a Python Flask backend and Next.js frontend.

## Project Structure

```
├── backend/               # Python Flask backend
│   ├── app/               # Main application code
│   │   ├── main.py        # Entry point for the backend
│   ├── requirements.txt   # Python dependencies
│
├── frontend/              # Next.js frontend
│   ├── src/               # Source code
│   ├── package.json       # Node.js dependencies
│
├── dockerfile             # Docker configuration
├── start.sh               # Service startup script
├── simple_checker.sh      # Automated testing script
```

## Setup Instructions

### Using Docker (Recommended)

The easiest way to run the application is using Docker:

1. Build the Docker image:
```bash
docker build -t space-app .
```

2. Run the container:
```bash
docker run -p 8000:8000 -p 3000:3000 space-app
```

### Pushing to Docker Hub

To share your application with others via Docker Hub:

1. Create a Docker Hub account at https://hub.docker.com/
2. Login to Docker Hub:
```bash
docker login
```

3. Tag your image with your Docker Hub username:
```bash
docker tag space-app yourusername/space-app:latest
```

4. Push the image to Docker Hub:
```bash
docker push yourusername/space-app:latest
```

5. Others can then pull and run your image:
```bash
docker pull yourusername/space-app:latest
docker run -p 8000:8000 -p 3000:3000 yourusername/space-app:latest
```

### Automated Testing

The repository includes a checker script to verify the application's functionality:

1. Make the script executable:
```bash
chmod +x simple_checker.sh
```

2. Run the checker (requires sudo):
```bash
sudo ./simple_checker.sh <github_repo_url>
```

The script will:
- Clone the repository
- Build the Docker image
- Run the container
- Test the placement endpoint
- Clean up resources

### Manual Setup

If you prefer to run the services separately without Docker:

#### Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the Flask application
python -m app.main
```

#### Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm i --legacy-peer-deps

# Build the frontend
npm run build

# Start the frontend server
npm run start
```

## Accessing the Application

Once running, the application can be accessed at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## API Endpoints

The backend provides several API endpoints including:

- `GET /`: API status endpoint
- `GET /api/client/iss_cargo`: ISS cargo management data
- `POST /api/placement`: Cargo placement endpoint

Additional endpoints are available for placement, simulation, waste management, and search functionality.

## Development

When making changes to the codebase:

1. For backend changes, restart the Flask server
2. For frontend changes, Next.js supports hot-reloading in development mode

## Troubleshooting

If you encounter issues with Node.js dependencies, try using the `--legacy-peer-deps` flag:

```bash
npm i --legacy-peer-deps
```

For Docker-related issues, ensure Docker is correctly installed and running on your system.

## Contributing

Feel free to contribute by opening issues or submitting pull requests.

## License

This project is licensed under [MIT License](LICENSE).


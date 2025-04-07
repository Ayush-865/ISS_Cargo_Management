# National Space Hackathon Project

This repository contains a full-stack application for the National Space Hackathon with a Python Flask backend and Next.js frontend.

**Docker Hub:** [https://hub.docker.com/r/bhavikpunmiya/national-space-hackathon](https://hub.docker.com/r/bhavikpunmiya/national-space-hackathon)

**Backend URL:** [https://national-space-hackathon-91717359690.us-central1.run.app/](https://national-space-hackathon-91717359690.us-central1.run.app/)

**Research Paper & Report:** [https://drive.google.com/file/d/1Matq5rpAbRrmcsX_2FCJ4XDyzoaocphG/view?usp=sharing](https://drive.google.com/file/d/1Matq5rpAbRrmcsX_2FCJ4XDyzoaocphG/view?usp=sharing)

**Video/Demo Link:** [https://drive.google.com/file/d/13MXXCcvZwoIqTtRkCzUBV5I-Fgd0JS9i/view?usp=sharing](https://drive.google.com/file/d/13MXXCcvZwoIqTtRkCzUBV5I-Fgd0JS9i/view?usp=sharing).

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

This will start both the backend and frontend services in a single container.

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


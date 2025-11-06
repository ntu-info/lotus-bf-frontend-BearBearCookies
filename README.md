## 🌐 Lotus-BF Frontend
A modern web interface built with React + Vite for exploring brain–term associations.

This repository contains the frontend client for the Lotus-BF system—a modular platform for visualizing and querying relationships between psychological terms and neuroimaging data.

🔗 Live Demo: https://<your-username>.github.io/lotus-bf-frontend/

Note: This is the frontend only. The corresponding backend service repository can be found at [link-to-your-backend-repo].

## 🚀 Getting Started (Local Development)
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

1. Prerequisites
Node.js (v18+ recommended)

npm (comes with Node.js)

2. Installation
Clone the repository and install the necessary dependencies:

Bash

git clone https://github.com/ntu-info/lotus-bf-frontend-BearBearCookies
cd lotus-bf-frontend
npm install
3. Run Locally
Start the local development server. The application will be available at http://localhost:5173/.

Bash

npm run dev

## 🧭 Project Structure
lotus-bf-frontend/
│
├── .github/workflows/   # GitHub Actions workflow for deployment
│   └── deploy.yml
│
├── public/              # Static assets (favicon, manifest, etc.)
│
├── src/
│   ├── assets/          # Images, icons, global styles
│   ├── components/      # Reusable React components
│   ├── hooks/           # Custom React hooks (e.g., for data fetching)
│   ├── api.js           # API connection logic
│   ├── App.jsx          # Root layout and routing
│   └── main.jsx         # Application entry point
│
├── .gitignore           # Files to ignore by Git
├── index.html           # HTML entry point for Vite
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies and scripts
└── README.md            # You are here!

## 🛠️ Tech Stack
Core: React 18

Build Tool: Vite

Language: JavaScript (ESNext)

Styling: CSS (can be easily extended with Tailwind, etc.)

Deployment: GitHub Actions

## 📜 License
This project is licensed under the MIT License. See the LICENSE file for details.
# 🌐 Lotus-BF Frontend

A modern web interface built with **React + Vite** for exploring **brain–term associations**.

This repository contains the **frontend client** for the *Lotus-BF* system — a modular platform for visualizing and querying relationships between psychological terms and neuroimaging data.

---

## 🔗 Links

| Type | URL |
|------|-----|
| 🌍 Live Demo | [https://bearbearcookies.github.io/LoTUS-BF-frontend/](https://bearbearcookies.github.io/LoTUS-BF-frontend/) |
| 🧩 Repository | [ntu-info/lotus-bf-frontend-BearBearCookies](https://github.com/ntu-info/lotus-bf-frontend-BearBearCookies) |
| 💻 Local App | [http://localhost:5173/](http://localhost:5173/) |



---

## 🚀 Getting Started

### 1️⃣ Prerequisites
- **Node.js** v18 or later  
- **npm** (comes with Node.js)

### 2️⃣ Installation
```bash
git clone https://github.com/ntu-info/lotus-bf-frontend-BearBearCookies
cd lotus-bf-frontend-BearBearCookies
npm install
```
### 3️⃣ Run Locally
```bash
npm run dev
```
Then open → http://localhost:5173/

---

## 🧭 Project Structure
```bash
lotus-bf-frontend/
│
├── .github/workflows/      # GitHub Actions workflow (for auto-deploy)
│   └── deploy.yml
│
├── public/                 # Static assets (favicon, manifest, etc.)
│
├── src/
│   ├── assets/             # Images, icons, global styles
│   ├── components/         # Reusable React components
│   ├── hooks/              # Custom React hooks (e.g. data fetching)
│   ├── api.js              # Backend API connection logic
│   ├── App.jsx             # Root layout & routing
│   └── main.jsx            # App entry point
│
├── .gitignore              # Files ignored by Git
├── index.html              # HTML entry point for Vite
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies & scripts
└── README.md               # Project documentation (you are here)
```
---

## 🛠️ Tech Stack
|Category	|Tool / Library|
|------|-----|
|Core Framework|	React 18|
|Build Tool|	Vite|
|Language|	JavaScript (ESNext)|
|Styling	|CSS / Tailwind (extendable)|
|Deployment|	GitHub Actions|

---

## 🧠 About Lotus-BF

**Lotus-BF** is an interactive web platform that visualizes connections between **psychological terms, brain regions, and related studies** using large-scale meta-analytic data such as **NeuroSynth**.

### 🔍 Key Features

* **Query Builder:** Build logical term searches (e.g., `amygdala AND emotion`) to explore study networks.
* **Term Association Map:** View how concepts link across neuroscience and psychology.
* **Brain Localization:** Identify brain areas tied to specific cognitive or affective terms.
* **Integrated References:** Access PubMed and related research directly from search results.

### 💡 Research Benefits

Accelerates discovery, bridges conceptual and neural data, and supports transparent, reproducible exploration in cognitive and affective neuroscience.

> 🧩 *Lotus-BF helps researchers query smarter, visualize deeper, and connect ideas faster.*

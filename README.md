# 🐦 Bird Watching App

An interactive bird-watching platform inspired by [eBird.org](https://ebird.org), built to support checklist submissions, personalized statistics, and regional birding insights — all wrapped in a dynamic, map-driven experience.

---

## 🌐 Features

### 📍 Index Page
- Map-based home screen showing bird density heatmaps.
- Species filter and region selector.
- Rectangle selection for custom region statistics.
- Navigation to submit a checklist or view personal birding statistics.

### 📋 Checklist Page
- Select location and submit bird sighting checklists.
- Autocomplete search for bird species.
- Inline entry of bird counts with increment buttons.
- Submit and manage personal checklists (edit/delete functionality).

### 📊 Stats Page
- View all personal species sightings.
- Visualizations of bird-watching trends over time.
- Species-specific graphs and map locations of sightings.

### 🌎 Location Page
- Region-based stats after rectangle selection.
- Species seen in a region with checklist and sighting counts.
- Graphs showing sightings over time.
- Leaderboard of top contributors in the region.

---

## 🗺️ Maps Integration

Interactive maps support both **Google Maps API** and **Leaflet** with OpenStreetMap tiles. Features include:
- Heatmap overlays for species densities.
- Drawing tools (rectangle or polygon selection).
- Real-time species filtering.

---

## 📊 Visualizations

We use libraries such as:
- **Chart.js**
- **D3.js** (optional)

Graphs include:
- Bird counts over time
- User activity trends
- Spatial distribution of sightings

---

## 🔍 Species Search & Filters

- Autocomplete-enabled species search
- Filter map visualizations by species
- Filter checklist entries by name substring

---

## 🧱 Tech Stack

- **Vue.js 3** – SPA frontend for dynamic interactivity
- **Google Maps / Leaflet.js** – Geospatial visualization
- **Chart.js / D3.js** – Data visualizations
- **SQLite / PostgreSQL** – Backend database
- **Python / Flask (or similar)** – Backend logic and database interaction

---

## 🧪 Sample Data

The project includes seeded data:
- `species.csv`: List of over 400 bird species
- `checklists.csv`: Sample user-submitted checklists
- `sightings.csv`: Sightings linked to checklists and species

These are imported into the database at runtime to support initial testing and exploration.

---

## 🚀 Project Setup

1. Clone the repository
2. Install backend and frontend dependencies
3. Import seed data into the database
4. Run the development server
5. Open the app in the browser

---

## 📽️ Demo Video

🎥 **Watch it in action:**  
[![Bird Watching App Demo](http://img.youtube.com/vi/REPLACE_VIDEO_ID/0.jpg)](http://www.youtube.com/watch?v=REPLACE_VIDEO_ID)

_A full walkthrough of the app’s features will be provided in the linked demo video._

---

## 👥 Team

- [Your Team Member 1]
- [Your Team Member 2]
- [Your Team Member 3]
- [Your Team Member 4]

---

> “Track, learn, and visualize your birding journey — wherever you roam.”

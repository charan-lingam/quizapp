# NeonQuiz 🚀

A high-energy, real-time quiz application built with React, Express, and Socket.io. Designed for live events with a Main Display and mobile-based team controls.

## Features
- **Round 1: Pass Round** - Questions passed between teams.
- **Round 2: Buzzer Round** - Real-time buzzer with reaction time tracking.
- **Round 3: Rapid Fire** - 5-second countdown per question with automatic scoring.
- **Real-time Leaderboard** - Live score updates on the main screen.
- **Mobile Integration** - Participants join via their mobile browsers.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, Socket.io.
- **Tooling:** Vite, TypeScript.

## How to Run Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Server:**
   ```bash
   npm run dev
   ```

3. **Access the App:**
   - **Laptop:** `http://localhost:3000`
   - **Mobile:** `http://<your-laptop-ip>:3000` (Devices must be on the same Wi-Fi)

## How to Publish to GitHub

To put this project on your own GitHub:

1. **Create a new repository** on [GitHub](https://github.com/new).
2. **Open your terminal** in the project folder.
3. **Initialize and push:**
   ```bash
   git init
   get add .
   git commit -m "Initial commit: NeonQuiz"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

## Customizing Questions
Edit `questions.json` to add your own rounds and questions.

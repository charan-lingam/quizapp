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

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

3. Open the app:
   - **Laptop:** `http://localhost:3000`
   - **Mobile:** open the **“Open this on mobile”** URL shown on the laptop (same Wi‑Fi), e.g. `http://<your-laptop-ip>:3000`

### If multiple mobiles can’t load (recommended LAN mode)

Run in LAN mode (disables Vite HMR so phones only need port `3000`):

```bash
npm run lan
```

### If the phone can’t connect

- **Windows Firewall**: allow inbound TCP on port `3000` (Node.js).
- **Wrong network**: make sure the phone is on the same Wi‑Fi (not mobile data).
- **VPN / hotspot isolation**: some networks block device-to-device traffic; try another Wi‑Fi or a phone hotspot.

## Customizing Questions

Edit `questions.json` to add your own rounds and questions.

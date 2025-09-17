# ♟️ Chess App

A real-time, browser-based chess game with dynamic UI, checkmate detection, and socket-powered multiplayer. Built for clarity, speed, and tactical depth.

## 🚀 Features

- Real-time multiplayer via WebSockets
- Legal move enforcement, check/checkmate detection
- Highlighted escape squares when in check
- Neon-themed UI with SVG overlays and dynamic banners
- Victory/defeat messaging and rematch support

## 🛠️ Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, Socket.IO
- Game Logic: [chess.js](https://github.com/jhlywa/chess.js)
- Optional: Dockerized for deployment

## 📦 Setup

```bash
git clone https://github.com/your-username/chess-app.git
cd chess-app
npm install
npm start

docker build -t chess-app .
docker run -p 5000:5000 chess-app
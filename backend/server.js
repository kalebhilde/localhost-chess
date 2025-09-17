const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const bodyParser = require('body-parser');
const {getBestMove} = require('./stockfish');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(bodyParser.json());

app.post('/ai', async (req, res) => {
  const { fen } = req.body;
  if (!fen) return res.status(400).json({ error: 'Missing FEN' });

  // build a fresh game from the exact client position
  const game = new Chess(fen);
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return res.json({ move: null });
  }

  try {
    const bestMove = await getBestMove(fen);
    console.log("AI suggestion (Stockfish):", bestMove);
    res.json({ move: bestMove });
  } catch (err) {
    console.error("Stockfish error:", err);
    // fallback
    const m = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    res.json({ move: m.from + m.to });
  }
});

// serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const game = new Chess();
let rolesAvailable = ['white','black','spectator'];

io.on('connection', socket => {
  // let client know which roles are free
  socket.emit('available_roles', rolesAvailable);

  socket.on('join', ({ role }) => {
    // validate
    if (role !== 'spectator' && !rolesAvailable.includes(role)) {
      return socket.emit('role_rejected', { reason: 'Role taken' });
    }
    // reserve role
    socket.role = role; // Store role on socket

    if (role !== 'spectator') {
      rolesAvailable = rolesAvailable.filter(r => r !== role);
      io.emit('available_roles', rolesAvailable);
    }
    socket.emit('role', role);
    io.emit('game_state', game.fen());
  });

  socket.on('move', ({ from, to }) => {
    const m = game.move({ from, to });
    if (!m) {
      return socket.emit('invalid_move', { from, to });
    }
    io.emit('game_state', game.fen());
  });

  socket.on('reset_game', () => {
    game.reset();
    rolesAvailable = ['white','black','spectator'];
    // Reset roles for all connected sockets
    for (const [id, s] of io.sockets.sockets) {
      s.role = 'spectator';
      s.emit('role', 'spectator');
    }
    io.emit('available_roles', rolesAvailable);
    io.emit('game_state', game.fen());
  });

  socket.on('disconnect', () => {
    if (socket.role && socket.role !== 'spectator') {
    // Re-add role to available list
      if (!rolesAvailable.includes(socket.role)) {
        rolesAvailable.push(socket.role);
        io.emit('available_roles', rolesAvailable);
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
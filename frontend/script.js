let board;
let game = new Chess();
let role = "spectator";

const socket = io();
dropOffBoard = 'snapback';

const winnerMessages = [
  "You have triumphed! Victory is yours!"
]

const loserMessages = [
  "Defeat is but a stepping stone to greatness. Learn and rise again!"
]

const playAgainLabels = [
  "Rematch!",
  "Try Again",
  "Play Another Round",
  "Reset the Board",
  "Let's Go Again"
];

// Initialize board and UI
window.onload = function () {
  // const savedRole = localStorage.getItem("chessRole");
  document.getElementById("joinScreen").style.display = "flex";
  document.getElementById("aiBtn").addEventListener("click", getAISuggestion);
  document.getElementById("resetBtn").addEventListener("click", resetGame);
  document.getElementById("playAgainBtn").addEventListener("click", () => {
    document.getElementById("endBanner").style.display = "none";
    resetGame();
  });
};

function joinAs(selectedRole) {
  if (document.querySelector(`button[data-role="${selectedRole}"]`).disabled) return;
  document.querySelectorAll('#joinScreen button').forEach(b => b.disabled = true);
  socket.emit('join', { role: selectedRole });
}

// update available-role buttons

// Handle piece drop
function handleMove(source, target) {

  if (role === "spectator") return 'snapback';

  const movingSide = game.turn(); // 'w' or 'b'
  const isPlayerWhite = role === 'white';
  const isPlayerTurn = (movingSide === 'w' && isPlayerWhite) || (movingSide === 'b' && !isPlayerWhite);

  if (!isPlayerTurn) return 'snapback';

  // Simulate the move
  const tempGame = new Chess(game.fen());
  const result = tempGame.move({ from: source, to: target });

  if (!result) return 'snapback';

  // ✅ If player is currently in check, only allow moves that resolve it
  const wasInCheck = game.in_check();
  const stillInCheck = tempGame.in_check();

  if (wasInCheck && stillInCheck) {
    // Move doesn't resolve check — reject it
    return 'snapback';
  }

  // Move is legal — emit and clean up
socket.emit("move", { from: source, to: target });
  document.querySelectorAll(".suggestion-arrow").forEach(el => el.remove());
  document.querySelectorAll(".highlight-square").forEach(el => el.classList.remove("highlight-square"));
}

// Socket events
// socket.on('available_roles', roles => {
//   ['white','black','spectator'].forEach(r => {
//     document.querySelector(`button[data-role="${r}"]`).disabled = !roles.includes(r);
//   });
// });

socket.on("role", r => {
  // role = r;
  // document.getElementById('roleBox').textContent = `You are: ${r}`;

  // if (r === 'spectator') {
  //   document.getElementById('joinScreen').style.display = 'flex';
  //   document.querySelectorAll('#joinScreen button').forEach(b => b.disabled = false);
  // } else {
  //   document.getElementById('joinScreen').style.display = 'none';
  // }
  if (!r) {
    document.getElementById("suggestionBox").textContent = "Role already taken. Please choose another.";
    document.querySelectorAll("#joinScreen button").forEach(b => b.disabled = false);
    return;
  }

  role = r;
  document.getElementById("suggestionBox").textContent = "";
  document.getElementById("roleBox").textContent = `You are: ${role}`;
  document.getElementById("joinScreen").style.display = "none";

  if (!board) {
    board = Chessboard('board', {
      position: 'start',
      draggable: true,
      dropOffBoard: 'snapback',
      pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
      onDrop: handleMove
    });
  }
});

socket.on("game_state", fen => {
  board.position(fen);
  game.load(fen);
  updateTurnIndicator();

  document.getElementById("endBanner").style.display = "none";
  document.querySelectorAll(".highlight-square").forEach(el => el.classList.remove("highlight-square"));

  console.log("Turn:", game.turn()); // 'b' or 'w'
  console.log("In check:", game.in_check());
  console.log("Legal moves:", game.moves());
  console.log("Checkmate:", game.in_checkmate());
  

  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'black' : 'white';
    const isPlayerWinner = role === winner;

    const messagePool = isPlayerWinner ? winnerMessages : loserMessages;
    const message = messagePool[Math.floor(Math.random() * messagePool.length)];

    document.getElementById("endMessage").textContent = message;
    document.getElementById("playAgainBtn").textContent = playAgainLabels[Math.floor(Math.random() * playAgainLabels.length)];
    document.getElementById("endBanner").style.display = "flex";
    return;
  }
  else if (game.in_check()) {
    const turn = game.turn(); // 'w' or 'b'
    const isPlayerTurn = (turn === 'w' && role === 'white') || (turn === 'b' && role === 'black');

    if (isPlayerTurn) {
      const legalMoves = game.moves({ verbose: true });

      const escapeSquares = legalMoves.map(m => m.to);

      escapeSquares.forEach(square => {
        const el = document.querySelector(`[data-square="${square}"]`);
        if (el) el.classList.add("highlight-square");
      });
    }
  }
});

socket.on("invalid_move", data => {
  console.warn("Invalid move:", data);
});

socket.on("available_roles", roles => {
  ['white', 'black', 'spectator'].forEach(role => {
    const btn = document.querySelector(`button[data-role="${role}"]`);
    if (btn) {
      btn.disabled = !roles.includes(role);
    }
  });
console.log("Available roles updated:", roles);

  // If join screen is visible, clear any rejection messages
  if (document.getElementById("joinScreen").style.display !== "none") {
    document.getElementById("suggestionBox").textContent = "";
  }
});

socket.on("role_rejected", data => {
  document.getElementById("suggestionBox").textContent = data.reason;
  document.querySelectorAll('#joinScreen button').forEach(b => b.disabled = false);
});

socket.on("reset_game", () => {
  game.reset();

  // Show join UI again
  document.getElementById("joinScreen").style.display = "flex";
  document.getElementById("board").style.display      = "none";
  document.getElementById("controls").style.display   = "none";

  // Re‐enable all role buttons
  document.querySelectorAll("#joinScreen button")
          .forEach(b => b.disabled = false);

  // Clear any messages
  document.getElementById("suggestionBox").textContent = "";

  io.emit("game_state", game.fen());
});

// End of socket events

// Reset game (only for players)
function resetGame() {
  if (role === "white" || role === "black") {
    socket.emit("reset_game");
  }
}

// AI suggestion fetch
function getAISuggestion() {
  if (role === "spectator") {
    document.getElementById("suggestionBox").textContent = "Spectators can't request AI suggestions.";
    return; 
  }
  console.log("AI suggestion clicked by non-spectator");
  fetch('/ai')
    .then(response => response.json())
    .then(data => {
      if (!data.move) return;
      const from = data.move.slice(0, 2);
      const to = data.move.slice(2, 4);
      setTimeout(() => {
        drawSuggestionArrow(from, to);
      }, 50);
      document.getElementById("suggestionBox").textContent = `Suggested move: ${from} → ${to}`;
    })
    .catch(err => console.error("Error fetching AI move:", err));
}

// Update turn indicator
function updateTurnIndicator() {
  const turn = game.turn();
  const color = turn === 'w' ? 'White' : 'Black';
  document.getElementById("turnIndicator").textContent = `${color}'s turn`;
}

// Draw AI suggestion arrow
function drawSuggestionArrow(from, to) {
  const fromEl = document.querySelector(`[data-square="${from}"]`);
  const toEl = document.querySelector(`[data-square="${to}"]`);
  const boardEl = document.getElementById("board");

  if (!fromEl || !toEl || !boardEl) return;

  // Remove any existing arrows
  document.querySelectorAll(".suggestion-arrow").forEach(el => el.remove());

  // Ensure board is positioned relative for accurate overlay
  boardEl.style.position = "relative";

  // Get center coordinates of each square relative to the board
  const fromX = fromEl.offsetLeft + fromEl.offsetWidth / 2;
  const fromY = fromEl.offsetTop + fromEl.offsetHeight / 2;
  const toX = toEl.offsetLeft + toEl.offsetWidth / 2;
  const toY = toEl.offsetTop + toEl.offsetHeight / 2;

  // Create SVG overlay
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("suggestion-arrow");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = boardEl.offsetWidth + "px";
  svg.style.height = boardEl.offsetHeight + "px";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "10";

  // Define arrowhead marker
  svg.innerHTML = `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="10" refY="5"
        orient="auto" markerUnits="strokeWidth">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#00ffe0" />
      </marker>
    </defs>
  `;


  // Create the arrow line
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
  arrow.setAttribute("x1", fromX);
  arrow.setAttribute("y1", fromY);
  arrow.setAttribute("x2", toX);
  arrow.setAttribute("y2", toY);
  arrow.setAttribute("stroke", "#00ffe0");
  arrow.setAttribute("stroke-width", "4");
  arrow.setAttribute("marker-end", "url(#arrowhead)");

  svg.appendChild(arrow);
  boardEl.appendChild(svg);
}
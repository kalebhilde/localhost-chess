import eventlet, threading
eventlet.monkey_patch()
lock = threading.Lock()

from flask import Flask, send_from_directory, request, jsonify
from flask_socketio import SocketIO, emit
from chess_engine import ChessGame

app = Flask(__name__, static_folder="frontend", static_url_path="")
socketio = SocketIO(app, cors_allowed_origins="*")

game = ChessGame()
players = {}

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route("/ai")
def get_ai_suggestion():
    move = game.get_ai_move()
    return jsonify({"move": move})

@socketio.on("join")
def handle_join(data):
    sid = request.sid
    requested_role = data.get("role", "spectator")

    with lock:
        if requested_role in ["white", "black"]:
            if requested_role in players.values():
                emit("role", None, to=sid)  # Optional: send null to indicate rejection
                return
            else:
                players[sid] = requested_role
        else:
            players[sid] = "spectator"

        emit("role", players[sid], to=sid)
        emit("available_roles", get_available_roles(), broadcast=True)
        emit("game_state", game.get_board_fen(), broadcast=True)

@socketio.on("move")
def handle_move(data):
    move_uci = data["from"] + data["to"]
    try:
        if game.make_move(move_uci):
            emit("game_state", game.get_board_fen(), broadcast=True)
        else:
            emit("invalid_move", {"from": data["from"], "to": data["to"]}, to=request.sid)
    except Exception:
        emit("invalid_move", {"from": data["from"], "to": data["to"]}, to=request.sid)

@socketio.on("reset_game")
def handle_reset():
    game.reset_game()
    emit("game_state", game.get_board_fen(), broadcast=True)

@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    if sid in players:
        del players[sid]
        emit("available_roles", get_available_roles(), broadcast=True)

def get_available_roles():
    taken = set(players.values())
    roles = []
    if "white" not in taken:
        roles.append("white")
    if "black" not in taken:
        roles.append("black")
    roles.append("spectator")
    return roles

if __name__ == "__main__":
    print("✅ Using eventlet server")
    socketio.run(app, host="0.0.0.0", port=5000)
import chess
import chess.engine

class ChessGame:
    def __init__(self):
        self.board = chess.Board()
        self.engine = chess.engine.SimpleEngine.popen_uci("/usr/games/stockfish")  # Adjust path if needed
        # self.engine = chess.engine.SimpleEngine.popen_uci("C:/Users/kaleb/Tools/stockfish/stockfish/stockfish-windows-x86-64-avx2.exe")

    def get_board_fen(self):
        return self.board.fen()

    def make_move(self, move_uci):
        move = chess.Move.from_uci(move_uci)
        if move in self.board.legal_moves:
            self.board.push(move)
            return True
        return False

    def get_ai_move(self):
        result = self.engine.play(self.board, chess.engine.Limit(time=0.5))
        return result.move.uci()

    def reset_game(self):
        self.board.reset()

    def close(self):
        self.engine.quit()
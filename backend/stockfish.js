const { spawn } = require('child_process');

function getBestMove(fen) {
  return new Promise((resolve, reject) => {
    const engine = spawn('/usr/games/stockfish');
    let bestMove = '';

    engine.stdin.write('uci\n');
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write('go depth 15\n');

    engine.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('bestmove')) {
        bestMove = output.split('bestmove ')[1].split(' ')[0].trim();
        engine.stdin.write('quit\n');
        resolve(bestMove);
      }
    });

    engine.stderr.on('data', (err) => reject(err));
  });
}

module.exports = { getBestMove };
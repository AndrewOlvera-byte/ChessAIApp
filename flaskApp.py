import flask
from flask import render_template
from botHandler import get_ai_move as ai_get_move
import chess
app = flask.Flask(__name__, static_folder='static', template_folder='templates')



@app.route('/')
def home():
    return render_template('chess.html')

@app.route('/get_ai_move', methods=['POST'])
def get_ai_move_api():
    data = flask.request.json
    fen = data['board']
    board = chess.Board(fen)
    move = ai_get_move(board, 1)
    return flask.jsonify({'move': move.uci()})

if __name__ == '__main__':
    app.run(debug=True)

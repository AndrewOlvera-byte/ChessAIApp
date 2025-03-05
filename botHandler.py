import chess
import chess.engine
import random
import numpy as np
from keras.models import load_model
import keras.models as models
import keras.layers as layers

# 3. Creating representation of the board

board_positions = {
    'a': 0,
    'b': 1,
    'c': 2,
    'd': 3,
    'e': 4,
    'f': 5,
    'g': 6,
    'h': 7,
}

def square_to_index(square) -> tuple:
    """
    Convert a square index (0 to 63) into a (row, col) tuple.
    """
    # chess.square_name(square) returns something like 'e4'
    name = chess.square_name(square)
    row = 8 - int(name[1])
    col = board_positions[name[0]]
    return row, col

def board_to_matrix(board) -> list:
    """
    Returns a 3D numpy array with shape (14, 8, 8) representing:
      - Layers 0-5: White pieces (by piece type)
      - Layers 6-11: Black pieces (by piece type)
      - Layer 12: Legal move targets for White
      - Layer 13: Legal move targets for Black
    """
    board_3d = np.zeros((14, 8, 8), dtype=np.int8)

    # Pieces
    for piece in chess.PIECE_TYPES:
        for square in board.pieces(piece, chess.WHITE):
            idx = np.unravel_index(square, (8, 8))
            board_3d[piece - 1][7 - idx[0]][idx[1]] = 1
        for square in board.pieces(piece, chess.BLACK):
            idx = np.unravel_index(square, (8, 8))
            board_3d[piece + 5][7 - idx[0]][idx[1]] = 1

    # Instead of modifying board.turn on the original board,
    # create copies to compute legal moves for each side.
    white_board = board.copy()
    white_board.turn = chess.WHITE
    for move in white_board.legal_moves:
        i, j = square_to_index(move.to_square)
        board_3d[12][i][j] = 1

    black_board = board.copy()
    black_board.turn = chess.BLACK
    for move in black_board.legal_moves:
        i, j = square_to_index(move.to_square)
        board_3d[13][i][j] = 1

    return board_3d

def build_conv_model(conv_size, conv_depth):
    # Build a convolutional network; this function is used only when training.
    board_input = layers.Input(shape=(8, 8, 14))
    x = board_input
    for _ in range(conv_depth):
        x = layers.Conv2D(filters=conv_size, kernel_size=5, padding='same', activation='relu')(x)
    x = layers.Flatten()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dense(1, activation='sigmoid')(x)
    model = models.Model(inputs=[board_input], outputs=[x])
    return model

# (The following line builds a model but then is immediately overwritten by loading the trained model.)
model = build_conv_model(64, 8)

# Load the trained model
model = load_model('chessModelCNN.h5')

# Minimax algorithm

def minimax_eval(board) -> float:
    """
    Evaluates the board by converting it to a matrix, then using the CNN to predict a score.
    """
    board_3d = board_to_matrix(board)
    # Rearrange to shape (8, 8, 14) and add batch dimension -> (1, 8, 8, 14)
    board_3d = board_3d.transpose(1, 2, 0)
    board_3d = np.expand_dims(board_3d, 0)
    # Ensure no verbosity during prediction.
    prediction = model.predict(board_3d, verbose=0)[0][0]
    return prediction

def minimax(board, depth, alpha, beta, maximizing_player):
    if depth == 0 or board.is_game_over():
        return minimax_eval(board)
    
    if maximizing_player:
        max_eval = -np.inf
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            max_eval = max(max_eval, eval)
            alpha = max(alpha, max_eval)
            if beta <= alpha:
                break
        return max_eval
    else:  # minimizing player
        min_eval = np.inf
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            min_eval = min(min_eval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break
        return min_eval

def get_ai_move(board, depth):
    """
    Iterates over legal moves, uses minimax to select the best move, and returns it.
    """
    max_move = None
    max_eval = -np.inf

    for move in board.legal_moves:
        board.push(move)
        eval = minimax(board, depth - 1, -np.inf, np.inf, False)
        board.pop()
        if eval > max_eval:
            max_eval = eval
            max_move = move
    return max_move

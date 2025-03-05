document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed.');

  // Initialize a new Chess instance from the chess.js library
  const chess = new Chess();

  // Default orientation: 'black' or 'white' at the bottom
  let userColor = 'white';
  let gameState = 'newGame';

  // Mapping of piece identifiers to image URLs
  const pieceImages = {
    'P': '/static/images/white_pawn.png',
    'R': '/static/images/white_rook.png',
    'N': '/static/images/white_knight.png',
    'B': '/static/images/white_bishop.png',
    'Q': '/static/images/white_queen.png',
    'K': '/static/images/white_king.png',
    'p': '/static/images/black_pawn.png',
    'r': '/static/images/black_rook.png',
    'n': '/static/images/black_knight.png',
    'b': '/static/images/black_bishop.png',
    'q': '/static/images/black_queen.png',
    'k': '/static/images/black_king.png'
  };

  // DOM references
  const boardContainer = document.querySelector('.boardContainer');
  const toggleColorButton = document.getElementById('toggleColorButton');
  const newGameButton = document.getElementById('newGameButton');
  const resetButton = document.getElementById('resetButton');
  const moveHistoryContainer = document.querySelector('.moveHistoryTextContainer');

  // Ensure board container is relatively positioned (needed for overlays)
  boardContainer.style.position = 'relative';

  // Variables to track piece selection
  let selectedSquare = null;
  let legalMoves = [];

  // Draw the chessboard in .boardContainer based on userColor.
  function drawBoard() {
    boardContainer.innerHTML = '';
    // Remove any existing game-over overlay when redrawing
    removeGameOverOverlay();

    const isWhite = (userColor === 'white');
    const rowIndices = isWhite ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
    const colIndices = isWhite ? [...Array(8).keys()] : [...Array(8).keys()].reverse();

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const row = rowIndices[i];
        const col = colIndices[j];

        // Create a cell
        const cell = document.createElement('div');
        cell.classList.add('cell');
        if ((i + j) % 2 === 0) {
          cell.classList.add('cellBlack');
        } else {
          cell.classList.add('cellWhite');
        }

        // Convert row,col to chess notation
        const square = convertToChessNotation(row, col);
        cell.dataset.square = square;

        // Check if a piece is on this square
        const piece = chess.get(square);
        if (piece) {
          const pieceSymbol = (piece.color === 'w')
            ? piece.type.toUpperCase()
            : piece.type.toLowerCase();
          const img = document.createElement('img');
          img.src = pieceImages[pieceSymbol] || '';
          img.alt = pieceSymbol;
          cell.appendChild(img);
        }

        // Click handler for selection / move
        cell.addEventListener('click', onCellClick);

        // Add the cell to the board
        boardContainer.appendChild(cell);
      }
    }
  }

  // Converts (row, col) to standard chess notation (e.g. (0,0) => "a8").
  function convertToChessNotation(row, col) {
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['8','7','6','5','4','3','2','1'];
    return files[col] + ranks[row];
  }

  // Handle clicks on cells for selecting and moving pieces.
  function onCellClick(event) {
    const cell = event.currentTarget;
    const square = cell.dataset.square;

    // If a piece is already selected, attempt to make a move
    if (selectedSquare) {
      // Check if the clicked square is a legal move
      const move = legalMoves.find(m => m.to === square);
      if (move) {
        // Make the move in the chess.js library
        chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' // Automatically promote to queen
        });

        // Redraw the board and update move history
        drawBoard();
        updateMoveHistory();

        // Check for game over before letting AI move
        if (!chess.game_over()) {
          // If it's not the user's turn, make the AI move.
          if ((userColor === 'white' && chess.turn() === 'b') ||
              (userColor === 'black' && chess.turn() === 'w')) {
            makeAIMove();
          }
        } else {
          checkGameOver();
        }

        // Clear any existing highlights and selections
        clearHighlights();
        selectedSquare = null;
        legalMoves = [];
        return;
      } else {
        // If the clicked square is not a legal move, deselect the current selection
        clearHighlights();
        selectedSquare = null;
        legalMoves = [];
      }
    }

    // If there's no piece on the clicked square, do nothing
    const piece = chess.get(square);
    if (!piece) return;

    // Ensure it's the correct player's turn based on userColor
    const isUserTurn = (userColor === 'white' && chess.turn() === 'w') ||
                       (userColor === 'black' && chess.turn() === 'b');
    if (!isUserTurn) return;

    // Select the piece on the clicked square
    selectedSquare = square;

    // Retrieve all legal moves for the selected piece
    legalMoves = chess.moves({ square, verbose: true });
    if (legalMoves.length === 0) {
      // If no legal moves are available, deselect the piece
      clearHighlights();
      selectedSquare = null;
      legalMoves = [];
      return;
    }

    // Highlight the selected cell
    cell.classList.add('selected');

    // Highlight all squares that this piece can legally move to
    legalMoves.forEach(m => {
      const targetCell = boardContainer.querySelector(`.cell[data-square='${m.to}']`);
      if (targetCell) {
        targetCell.classList.add('highlight');
      }
    });
  }

  // Clear all highlights and selected states.
  function clearHighlights() {
    const cells = boardContainer.querySelectorAll('.cell');
    cells.forEach(c => {
      c.classList.remove('selected', 'highlight');
    });
  }

  // Toggle board orientation (white vs black at the bottom) and reset the game.
  function changeUserColor() {
    // Reset game state when changing orientation
    chess.reset();
    removeGameOverOverlay();
    moveHistoryContainer.innerHTML = '';
    userColor = (userColor === 'white') ? 'black' : 'white';
    drawBoard();
    clearHighlights();
    selectedSquare = null;
    legalMoves = [];
    updateToggleButton();

    // If it's AI's turn after resetting, trigger the AI move.
    if ((userColor === 'white' && chess.turn() === 'b') ||
        (userColor === 'black' && chess.turn() === 'w')) {
      makeAIMove();
    }
  }

  // Updates the toggle button label to reflect the current orientation.
  function updateToggleButton() {
    toggleColorButton.textContent = (userColor === 'white')
      ? 'Switch Color (White ↓)'
      : 'Switch Color (Black ↓)';
  }

  // Updates the move history with White/Black moves together on each line.
  function updateMoveHistory() {
    // Clear existing move history
    moveHistoryContainer.innerHTML = '';

    // Get the history of moves in Standard Algebraic Notation (SAN)
    const halfMoves = chess.history();

    // Group moves into full moves (pairs of White and Black moves)
    for (let i = 0; i < halfMoves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = halfMoves[i] || '';
      const blackMove = halfMoves[i + 1] || '';
      const li = document.createElement('li');
      li.textContent = `${moveNumber}. ${whiteMove} ${blackMove}`;
      moveHistoryContainer.appendChild(li);
    }

    // Automatically scroll to the bottom of the move history
    moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
  }

  // Checks if the game is over and, if so, displays an overlay message.
  function checkGameOver() {
    if (chess.game_over()) {
      let message = '';
      if (chess.in_checkmate()) {
        message = 'Checkmate!';
      } else if (chess.in_draw()) {
        message = 'Draw!';
      } else {
        message = 'Game Over!';
      }
      displayGameOverMessage(message);
    }
  }

  // Creates and displays an overlay on the board with the given game-over message.
  function displayGameOverMessage(message) {
    const overlay = document.createElement('div');
    overlay.classList.add('gameOverOverlay');
    // Inline styles for the overlay (you can also move these to your CSS)
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';

    const messageEl = document.createElement('div');
    messageEl.classList.add('gameOverMessage');
    messageEl.textContent = message;
    messageEl.style.fontSize = '48px';
    messageEl.style.color = '#ffffff';
    messageEl.style.textShadow = '2px 2px 4px #000';

    overlay.appendChild(messageEl);
    boardContainer.appendChild(overlay);
  }

  // Removes any existing game-over overlay from the board.
  function removeGameOverOverlay() {
    const overlay = boardContainer.querySelector('.gameOverOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Start a new game, resetting the board and move history.
  function startNewGame() {
    chess.reset();
    removeGameOverOverlay();
    moveHistoryContainer.innerHTML = '';
    // Optionally set a default orientation (here, setting userColor to 'black')
    userColor = 'black';
    drawBoard();
    clearHighlights();
    updateToggleButton();
    selectedSquare = null;
    legalMoves = [];

    // If AI should move first, trigger the AI move.
    if ((userColor === 'white' && chess.turn() === 'b') ||
        (userColor === 'black' && chess.turn() === 'w')) {
      makeAIMove();
    }
  }

  // Reset the current game while keeping the current orientation.
  function resetGame() {
    chess.reset();
    removeGameOverOverlay();
    moveHistoryContainer.innerHTML = '';
    drawBoard();
    clearHighlights();
    selectedSquare = null;
    legalMoves = [];
    // If AI is to move next, trigger the AI move.
    if ((userColor === 'white' && chess.turn() === 'b') ||
        (userColor === 'black' && chess.turn() === 'w')) {
      makeAIMove();
    }
  }

  // Call the backend to fetch the AI move and apply it.
  function makeAIMove() {
    // Send the current board state (FEN) to the backend.
    fetch('/get_ai_move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: chess.fen() })
    })
      .then(response => response.json())
      .then(data => {
        const uciMove = data.move; // Expected format e.g., "e2e4"
        // Apply the move returned by the AI.
        chess.move({
          from: uciMove.slice(0, 2),
          to: uciMove.slice(2, 4),
          promotion: 'q' // In case of promotion, auto promote to queen.
        });
        drawBoard();
        updateMoveHistory();
        // After the AI move, check if the game is over.
        if (chess.game_over()) {
          checkGameOver();
        }
      })
      .catch(err => {
        console.error('Error fetching AI move:', err);
      });
  }

  // Main initialization function, called once the DOM is fully loaded.
  function main() {
    drawBoard();
    updateToggleButton();

    // Attach event listeners to buttons
    toggleColorButton.addEventListener('click', changeUserColor);
    newGameButton.addEventListener('click', startNewGame);
    resetButton.addEventListener('click', resetGame);

    // Optionally, if the AI is to move first:
    if ((userColor === 'white' && chess.turn() === 'b') ||
        (userColor === 'black' && chess.turn() === 'w')) {
      makeAIMove();
    }
  }

  // Execute the main function to initialize the game
  main();
});


const SIZE = 10;

const boardElement = document.getElementById("board");
const piecesContainer = document.getElementById("piecesContainer");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");
const gameOverElement = document.getElementById("gameOver");
const finalScoreElement = document.getElementById("finalScore");
const dragGhost = document.getElementById("dragGhost");

const COLORS = [
    "#FF5C78",
    "#FFB02E",
    "#39C98A",
    "#4B9BFF",
    "#A56BFF",
    "#FF70C5",
    "#25C8D8"
];

// Block shapes. Each number represents a row.
const SHAPES = [
    [[1]],
    [[1, 1]],
    [[1], [1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1, 1, 1, 1]],
    [[1], [1], [1], [1], [1]],

    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1]],
    [[1, 1], [1, 1], [1, 1]],

    [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1], [0, 1], [0, 1]],

    [[1, 0], [1, 1]],
    [[0, 1], [1, 1]],
    [[1, 1], [1, 0]],
    [[1, 1], [0, 1]],

    [[1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[0, 1], [1, 1], [0, 1]],

    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],

    [[1, 1, 1], [1, 1, 0]],
    [[1, 1, 1], [0, 1, 1]],

    [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
];

let grid = [];
let pieces = [];
let score = 0;
let bestScore = Number(localStorage.getItem("blockBlastBest")) || 0;

let dragging = null;
let previewCells = [];

bestScoreElement.textContent = bestScore;

// Create an empty 10x10 board
function createEmptyGrid() {
    return Array.from(
        { length: SIZE },
        () => Array(SIZE).fill(null)
    );
}

// Render the board
function renderBoard() {
    boardElement.innerHTML = "";

    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const cell = document.createElement("div");

            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (grid[row][col]) {
                cell.classList.add("filled");
                cell.style.setProperty("--block-color", grid[row][col]);
            }

            boardElement.appendChild(cell);
        }
    }
}

// Generate a random piece
function createRandomPiece() {
    const shape = SHAPES[
        Math.floor(Math.random() * SHAPES.length)
    ];

    return {
        shape: shape.map(row => [...row]),
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
}

// Generate three pieces
function generatePieces() {
    pieces = [
        createRandomPiece(),
        createRandomPiece(),
        createRandomPiece()
    ];

    renderPieces();
    checkGameOver();
}

// Rotate a shape 90 degrees clockwise without changing its blocks.
function rotateShape(shape) {
    const height = shape.length;
    const width = Math.max(...shape.map(row => row.length));
    const rotated = Array.from(
        { length: width },
        () => Array(height).fill(0)
    );

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            rotated[col][height - 1 - row] = shape[row][col] || 0;
        }
    }

    return rotated;
}

// Render the three available pieces
function renderPieces() {
    piecesContainer.innerHTML = "";

    pieces.forEach((piece, index) => {
        const slot = document.createElement("div");
        slot.className = "piece-slot";

        if (!piece) {
            slot.classList.add("used");
            piecesContainer.appendChild(slot);
            return;
        }

        const element = createPieceElement(piece);
        element.dataset.index = index;

        const controls = document.createElement("div");
        controls.className = "piece-controls";
        controls.appendChild(element);

        const rotateButton = document.createElement("button");
        rotateButton.className = "rotate-btn";
        rotateButton.type = "button";
        rotateButton.textContent = "↻";
        rotateButton.setAttribute("aria-label", "Rotate block");
        rotateButton.title = "Rotate 90° clockwise";
        rotateButton.addEventListener("pointerdown", event => {
            event.preventDefault();
            event.stopPropagation();
        });
        rotateButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            piece.shape = rotateShape(piece.shape);
            renderPieces();
        });

        controls.appendChild(rotateButton);
        slot.appendChild(controls);
        piecesContainer.appendChild(slot);
    });
}

// Build the visual shape of a piece
function createPieceElement(piece) {
    const element = document.createElement("div");
    element.className = "piece";

    const height = piece.shape.length;
    const width = Math.max(...piece.shape.map(row => row.length));

    element.style.gridTemplateColumns = `repeat(${width}, auto)`;

    piece.shape.forEach(row => {
        for (let col = 0; col < width; col++) {
            const block = document.createElement("div");

            if (row[col]) {
                block.className = "piece-block";
                block.style.setProperty("--block-color", piece.color);
            } else {
                block.style.visibility = "hidden";
            }

            element.appendChild(block);
        }
    });

    return element;
}

// Check if a piece can fit at a specific position
function canPlace(shape, startRow, startCol) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;

            const row = startRow + r;
            const col = startCol + c;

            if (
                row < 0 ||
                row >= SIZE ||
                col < 0 ||
                col >= SIZE ||
                grid[row][col] !== null
            ) {
                return false;
            }
        }
    }

    return true;
}

// Place a block on the board
function placePiece(piece, startRow, startCol) {
    if (!canPlace(piece.shape, startRow, startCol)) {
        return false;
    }

    let blocksPlaced = 0;

    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                grid[startRow + r][startCol + c] = piece.color;
                blocksPlaced++;
            }
        }
    }

    score += blocksPlaced;

    clearLines();
    updateScore();
    renderBoard();

    return true;
}

// Clear completed rows and columns
function clearLines() {
    const fullRows = [];
    const fullCols = [];

    // Find full rows
    for (let r = 0; r < SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) {
            fullRows.push(r);
        }
    }

    // Find full columns
    for (let c = 0; c < SIZE; c++) {
        let full = true;

        for (let r = 0; r < SIZE; r++) {
            if (grid[r][c] === null) {
                full = false;
                break;
            }
        }

        if (full) fullCols.push(c);
    }

    // Clear all completed rows
    fullRows.forEach(r => {
        for (let c = 0; c < SIZE; c++) {
            grid[r][c] = null;
        }
    });

    // Clear all completed columns
    fullCols.forEach(c => {
        for (let r = 0; r < SIZE; r++) {
            grid[r][c] = null;
        }
    });

    const linesCleared = fullRows.length + fullCols.length;

    if (linesCleared > 0) {
        score += linesCleared * 10;
        score += Math.max(0, linesCleared - 1) * 5;
    }
}

// Update the score display
function updateScore() {
    scoreElement.textContent = score;

    if (score > bestScore) {
        bestScore = score;

        localStorage.setItem("blockBlastBest", bestScore);

        bestScoreElement.textContent = bestScore;
    }
}

// Find whether at least one available piece can fit
function checkGameOver() {
    const anyMove = pieces.some(piece => {
        if (!piece) return false;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (canPlace(piece.shape, r, c)) {
                    return true;
                }
            }
        }

        return false;
    });

    if (!anyMove) {
        showGameOver();
    }
}

function showGameOver() {
    finalScoreElement.textContent = score;
    gameOverElement.classList.remove("hidden");
}

// Remove old preview
function clearPreview() {
    previewCells.forEach(cell => {
        cell.classList.remove("preview", "invalid");
    });

    previewCells = [];
}

// Show placement preview
function showPreview(row, col) {
    clearPreview();

    const valid = canPlace(
        dragging.piece.shape,
        row,
        col
    );

    dragging.previewRow = row;
    dragging.previewCol = col;
    dragging.valid = valid;

    const cells = boardElement.querySelectorAll(".cell");

    for (let r = 0; r < dragging.piece.shape.length; r++) {
        for (let c = 0; c < dragging.piece.shape[r].length; c++) {
            if (!dragging.piece.shape[r][c]) continue;

            const targetRow = row + r;
            const targetCol = col + c;

            if (
                targetRow < 0 || targetRow >= SIZE ||
                targetCol < 0 || targetCol >= SIZE
            ) continue;

            const cell = cells[targetRow * SIZE + targetCol];

            cell.classList.add(valid ? "preview" : "invalid");
            previewCells.push(cell);
        }
    }
}

// Pointer down: start dragging
piecesContainer.addEventListener("pointerdown", event => {
    const pieceElement = event.target.closest(".piece");

    if (!pieceElement) return;

    const index = Number(pieceElement.dataset.index);
    const piece = pieces[index];

    if (!piece) return;

    event.preventDefault();

    const blockElement = event.target.closest(".piece-block");
    const pieceRect = pieceElement.getBoundingClientRect();
    const blockRect = blockElement
        ? blockElement.getBoundingClientRect()
        : pieceRect;

    const cellSize = pieceRect.width /
        Math.max(...piece.shape.map(row => row.length));

    const grabCol = blockElement
        ? Math.round((blockRect.left - pieceRect.left) / cellSize)
        : 0;

    const grabRow = blockElement
        ? Math.round((blockRect.top - pieceRect.top) /
            (blockRect.height + 3))
        : 0;

    dragging = {
        index,
        piece,
        element: pieceElement,
        grabRow,
        grabCol,
        offsetX: event.clientX - blockRect.left,
        offsetY: event.clientY - blockRect.top,
        previewRow: null,
        previewCol: null,
        valid: false
    };

    pieceElement.style.opacity = "0.2";

    dragGhost.innerHTML = "";
    dragGhost.appendChild(createPieceElement(piece));
    dragGhost.style.display = "grid";

    moveGhost(event.clientX, event.clientY);
});

// Move floating block with pointer
function moveGhost(x, y) {
    if (!dragging) return;

    dragGhost.style.left =
        `${x - dragging.offsetX}px`;

    dragGhost.style.top =
        `${y - dragging.offsetY}px`;
}

// Pointer move: update drag position and board preview
document.addEventListener("pointermove", event => {
    if (!dragging) return;

    event.preventDefault();

    moveGhost(event.clientX, event.clientY);

    const target = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    const cell = target?.closest(".cell");

    if (!cell || !boardElement.contains(cell)) {
        clearPreview();
        dragging.valid = false;
        return;
    }

    const targetRow = Number(cell.dataset.row);
    const targetCol = Number(cell.dataset.col);

    const startRow = targetRow - dragging.grabRow;
    const startCol = targetCol - dragging.grabCol;

    showPreview(startRow, startCol);
}, { passive: false });

// Pointer up: drop the block
document.addEventListener("pointerup", () => {
    if (!dragging) return;

    const drag = dragging;

    dragGhost.style.display = "none";
    drag.element.style.opacity = "1";

    clearPreview();

    if (
        drag.valid &&
        drag.previewRow !== null &&
        drag.previewCol !== null
    ) {
        const success = placePiece(
            drag.piece,
            drag.previewRow,
            drag.previewCol
        );

        if (success) {
            pieces[drag.index] = null;
            renderPieces();

            // Generate a new set when all three are used
            if (pieces.every(piece => piece === null)) {
                generatePieces();
            } else {
                checkGameOver();
            }
        }
    }

    dragging = null;
});

// Cancel drag if pointer is interrupted
document.addEventListener("pointercancel", () => {
    if (!dragging) return;

    dragging.element.style.opacity = "1";
    dragGhost.style.display = "none";
    clearPreview();
    dragging = null;
});

// Start a new game
function startGame() {
    grid = createEmptyGrid();
    score = 0;

    scoreElement.textContent = "0";
    bestScoreElement.textContent = bestScore;

    gameOverElement.classList.add("hidden");

    dragging = null;
    dragGhost.style.display = "none";

    clearPreview();
    renderBoard();
    generatePieces();
}

// Restart buttons
document.getElementById("restartBtn")
    .addEventListener("click", startGame);

document.getElementById("playAgainBtn")
    .addEventListener("click", startGame);

// Launch the game
startGame();

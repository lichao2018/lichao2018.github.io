const ROWS = 10;
const COLS = 10;
const EMPTY_RATIO = 0.3;
const START_TIME = 45;
const TIME_PENALTY = 3;
const TIME_BONUS_PER_BLOCK = 2;
const MAX_TIME = 90;

const COLORS = ["#d64b4b", "#3c7dd9", "#f0a03f", "#2f9d69", "#8d5ec9", "#f2cc45"];

const boardEl = document.getElementById("board");
const timeTextEl = document.getElementById("timeText");
const leftTextEl = document.getElementById("leftText");
const scoreTextEl = document.getElementById("scoreText");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restartBtn");

let board = [];
let timeLeft = START_TIME;
let score = 0;
let isGameOver = false;
let timerId = null;

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function createBoard() {
  const next = [];
  let blockCount = 0;
  let emptyCount = 0;

  for (let r = 0; r < ROWS; r += 1) {
    const row = [];
    for (let c = 0; c < COLS; c += 1) {
      if (Math.random() < EMPTY_RATIO) {
        row.push(null);
        emptyCount += 1;
      } else {
        row.push(randomColor());
        blockCount += 1;
      }
    }
    next.push(row);
  }

  // Guarantee at least one clickable empty and one removable block.
  if (emptyCount === 0) {
    next[Math.floor(ROWS / 2)][Math.floor(COLS / 2)] = null;
  }
  if (blockCount === 0) {
    next[0][0] = randomColor();
  }

  return next;
}

function getBlocksLeft() {
  let count = 0;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (board[r][c] !== null) count += 1;
    }
  }
  return count;
}

function setMessage(text, warn = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("warn", warn);
}

function formatTime(value) {
  return String(Math.max(0, Math.ceil(value)));
}

function render() {
  boardEl.innerHTML = "";

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      const color = board[r][c];
      if (color === null) {
        cell.classList.add("empty");
      } else {
        cell.classList.add("block");
        const blockFill = document.createElement("div");
        blockFill.className = "block-fill";
        blockFill.style.background = color;
        cell.appendChild(blockFill);
      }

      boardEl.appendChild(cell);
    }
  }

  timeTextEl.textContent = formatTime(timeLeft);
  leftTextEl.textContent = String(getBlocksLeft());
  scoreTextEl.textContent = String(score);
}

function adjustTime(delta) {
  timeLeft = Math.max(0, Math.min(MAX_TIME, timeLeft + delta));
  timeTextEl.textContent = formatTime(timeLeft);
}

function nearestBlocksFrom(r, c) {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  const found = [];

  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;

    while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      const color = board[nr][nc];
      if (color !== null) {
        found.push({ r: nr, c: nc, color });
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return found;
}

function removeMatchingNearest(r, c) {
  const nearest = nearestBlocksFrom(r, c);
  const byColor = new Map();

  for (const block of nearest) {
    if (!byColor.has(block.color)) {
      byColor.set(block.color, []);
    }
    byColor.get(block.color).push(block);
  }

  const removeList = [];
  for (const blocks of byColor.values()) {
    if (blocks.length >= 2) {
      removeList.push(...blocks);
    }
  }

  if (removeList.length === 0) {
    return 0;
  }

  for (const item of removeList) {
    board[item.r][item.c] = null;
  }

  return removeList.length;
}

function finishGame(win) {
  isGameOver = true;
  clearInterval(timerId);
  timerId = null;
  if (win) {
    setMessage("You win! All blocks are removed.", false);
  } else {
    setMessage("Time up! Game over.", true);
  }
}

function checkWinLose() {
  if (getBlocksLeft() === 0) {
    finishGame(true);
    return;
  }
  if (timeLeft <= 0) {
    finishGame(false);
  }
}

function handleCellClick(event) {
  const target = event.target.closest(".cell");
  if (!target || isGameOver) return;

  const r = Number(target.dataset.r);
  const c = Number(target.dataset.c);

  if (board[r][c] !== null) {
    adjustTime(-TIME_PENALTY);
    setMessage("Penalty: clicked a non-empty cell.", true);
    render();
    checkWinLose();
    return;
  }

  const removed = removeMatchingNearest(r, c);
  if (removed > 0) {
    const gain = removed * TIME_BONUS_PER_BLOCK;
    score += removed * 10;
    adjustTime(gain);
    setMessage(`Great! Removed ${removed} block(s), +${gain}s.`, false);
  } else {
    adjustTime(-TIME_PENALTY);
    setMessage("No matching nearest colors. Time penalty applied.", true);
  }

  render();
  checkWinLose();
}

function startGame() {
  board = createBoard();
  timeLeft = START_TIME;
  score = 0;
  isGameOver = false;

  if (timerId !== null) {
    clearInterval(timerId);
  }

  timerId = setInterval(() => {
    if (isGameOver) return;
    adjustTime(-1);
    if (timeLeft <= 0) {
      finishGame(false);
      render();
    }
  }, 1000);

  setMessage("Game running...");
  render();
  checkWinLose();
}

boardEl.addEventListener("click", handleCellClick);
restartBtn.addEventListener("click", startGame);

startGame();

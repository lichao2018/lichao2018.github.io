const ROWS = 10;
const COLS = 10;
const EMPTY_RATIO = 0.24;
const START_TIME = 30;
const TIME_PENALTY = 6;
const TIME_BONUS_PER_BLOCK = 1;
const MAX_TIME = 30;

const COLORS = ["#d64b4b", "#3c7dd9", "#f0a03f", "#2f9d69", "#8d5ec9", "#f2cc45", "#2d5a88", "#b06a3a"];

const boardEl = document.getElementById("board");
const timeBarEl = document.getElementById("timeBar");
const timeTextEl = document.getElementById("timeText");
const scoreTextEl = document.getElementById("scoreText");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restartBtn");
const gameModalEl = document.getElementById("gameModal");
const modalTextEl = document.getElementById("modalText");
const modalReplayBtn = document.getElementById("modalReplayBtn");

let board = [];
let timeLeft = START_TIME;
let score = 0;
let isGameOver = false;
let timerId = null;
let isResolving = false;
let removingCells = new Set();
let audioCtx = null;

function cellKey(r, c) {
  return `${r}-${c}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  return `${Math.max(0, Math.ceil(value))}s`;
}

function updateTimerUI() {
  const safeTime = Math.max(0, timeLeft);
  const progress = (safeTime / START_TIME) * 100;
  timeTextEl.textContent = formatTime(safeTime);
  timeBarEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  timeBarEl.parentElement.setAttribute("aria-valuenow", String(Math.ceil(safeTime)));
}

function showModal(text) {
  modalTextEl.textContent = text;
  gameModalEl.hidden = false;
}

function hideModal() {
  gameModalEl.hidden = true;
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
        if (removingCells.has(cellKey(r, c))) {
          cell.classList.add("removing");
        }
        const blockFill = document.createElement("div");
        blockFill.className = "block-fill";
        blockFill.style.background = color;
        cell.appendChild(blockFill);
      }

      boardEl.appendChild(cell);
    }
  }

  updateTimerUI();
  scoreTextEl.textContent = String(score);
}

function adjustTime(delta) {
  timeLeft = Math.max(0, Math.min(MAX_TIME, timeLeft + delta));
  updateTimerUI();
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
    return [];
  }

  return removeList;
}

function playRemoveSound(removedCount) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const duration = 0.12;
  const pitch = Math.min(860, 500 + removedCount * 28);

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(220, pitch * 0.78), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playWrongSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const duration = 0.14;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(230, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

async function animateAndRemove(removeList) {
  removingCells = new Set(removeList.map((item) => cellKey(item.r, item.c)));
  playRemoveSound(removeList.length);
  render();
  await wait(220);

  for (const item of removeList) {
    board[item.r][item.c] = null;
  }

  removingCells = new Set();
}

function finishGame(reason) {
  isGameOver = true;
  clearInterval(timerId);
  timerId = null;

  if (reason === "win") {
    setMessage("You win! All blocks are removed.", false);
    return;
  }

  if (reason === "timeout") {
    setMessage("Time up! Game over.", true);
    showModal("倒计时结束，游戏结束。\n点击重玩再来一局。");
    return;
  }

  setMessage("No more removable moves.", true);
  showModal("已经没有可消除的块了。\n点击重玩开始新一局。");
}

function hasAnyRemovableMove() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (board[r][c] !== null) continue;
      const nearest = nearestBlocksFrom(r, c);
      const colorCount = new Map();
      for (const block of nearest) {
        colorCount.set(block.color, (colorCount.get(block.color) || 0) + 1);
      }
      for (const count of colorCount.values()) {
        if (count >= 2) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkWinLose() {
  if (getBlocksLeft() === 0) {
    finishGame("win");
    return;
  }
  if (timeLeft <= 0) {
    finishGame("timeout");
    return;
  }
  if (!hasAnyRemovableMove()) {
    finishGame("stuck");
  }
}

async function handleCellClick(event) {
  const target = event.target.closest(".cell");
  if (!target || isGameOver || isResolving) return;

  const r = Number(target.dataset.r);
  const c = Number(target.dataset.c);

  if (board[r][c] !== null) {
    adjustTime(-TIME_PENALTY);
    playWrongSound();
    setMessage("Penalty: clicked a non-empty cell.", true);
    render();
    checkWinLose();
    return;
  }

  const removeList = removeMatchingNearest(r, c);
  if (removeList.length > 0) {
    isResolving = true;
    await animateAndRemove(removeList);
    isResolving = false;
    const removed = removeList.length;
    const gain = removed * TIME_BONUS_PER_BLOCK;
    score += removed * 10;
    adjustTime(gain);
    setMessage(`Great! Removed ${removed} block(s), +${gain}s.`, false);
  } else {
    adjustTime(-TIME_PENALTY);
    playWrongSound();
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
  isResolving = false;
  removingCells = new Set();
  hideModal();

  if (timerId !== null) {
    clearInterval(timerId);
  }

  timerId = setInterval(() => {
    if (isGameOver) return;
    adjustTime(-1);
    if (timeLeft <= 0) {
      finishGame("timeout");
      render();
    }
  }, 1000);

  setMessage("Game running...");
  render();
  checkWinLose();
}

boardEl.addEventListener("click", handleCellClick);
restartBtn.addEventListener("click", startGame);
modalReplayBtn.addEventListener("click", startGame);

startGame();

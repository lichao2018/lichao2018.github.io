const GRID_SIZE = 3;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const EMPTY = TILE_COUNT - 1;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveLabelEl = document.getElementById("moveLabel");
const levelLabelEl = document.getElementById("levelLabel");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

let levels = [];
let currentLevel = 0;
let state = [];
let moveCount = 0;
let locked = true;

function toPos(index) {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function isAdjacent(a, b) {
  const pa = toPos(a);
  const pb = toPos(b);
  return Math.abs(pa.row - pb.row) + Math.abs(pa.col - pb.col) === 1;
}

function updateMeta() {
  levelLabelEl.textContent = `关卡：${currentLevel + 1} / ${levels.length}`;
  moveLabelEl.textContent = `步数：${moveCount}`;
  prevBtn.disabled = currentLevel <= 0;
  nextBtn.disabled = currentLevel >= levels.length - 1;
}

function isSolved(arr) {
  return arr.every((v, i) => v === i);
}

function randomNeighborSwap(arr) {
  const emptyIndex = arr.indexOf(EMPTY);
  const neighbors = [];

  if (emptyIndex - GRID_SIZE >= 0) neighbors.push(emptyIndex - GRID_SIZE);
  if (emptyIndex + GRID_SIZE < TILE_COUNT) neighbors.push(emptyIndex + GRID_SIZE);
  if (emptyIndex % GRID_SIZE !== 0) neighbors.push(emptyIndex - 1);
  if (emptyIndex % GRID_SIZE !== GRID_SIZE - 1) neighbors.push(emptyIndex + 1);

  const target = neighbors[Math.floor(Math.random() * neighbors.length)];
  [arr[emptyIndex], arr[target]] = [arr[target], arr[emptyIndex]];
}

function shuffleState() {
  const arr = Array.from({ length: TILE_COUNT }, (_, i) => i);
  const turns = 80 + Math.floor(Math.random() * 80);
  for (let i = 0; i < turns; i += 1) randomNeighborSwap(arr);
  if (isSolved(arr)) randomNeighborSwap(arr);
  state = arr;
  moveCount = 0;
}

function tileStyle(tileIndex, imageUrl) {
  const row = Math.floor(tileIndex / GRID_SIZE);
  const col = tileIndex % GRID_SIZE;
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundPosition: `${(col / (GRID_SIZE - 1)) * 100}% ${(row / (GRID_SIZE - 1)) * 100}%`,
  };
}

function renderBoard() {
  boardEl.innerHTML = "";
  const imageUrl = levels[currentLevel];

  state.forEach((tileNumber, cellIndex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.dataset.index = String(cellIndex);

    if (tileNumber === EMPTY) {
      btn.classList.add("empty");
      btn.setAttribute("aria-label", "空白格");
    } else {
      const styles = tileStyle(tileNumber, imageUrl);
      btn.style.backgroundImage = styles.backgroundImage;
      btn.style.backgroundPosition = styles.backgroundPosition;
      btn.setAttribute("aria-label", `拼图块 ${tileNumber + 1}`);
    }

    boardEl.appendChild(btn);
  });

  updateMeta();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function onBoardClick(event) {
  if (locked) return;
  const tile = event.target.closest(".tile");
  if (!tile || tile.classList.contains("empty")) return;

  const clickedIndex = Number(tile.dataset.index);
  const emptyIndex = state.indexOf(EMPTY);
  if (!isAdjacent(clickedIndex, emptyIndex)) return;

  [state[clickedIndex], state[emptyIndex]] = [state[emptyIndex], state[clickedIndex]];
  moveCount += 1;
  renderBoard();

  if (isSolved(state)) {
    locked = true;
    setStatus(`第 ${currentLevel + 1} 关完成！共 ${moveCount} 步。`);
  } else {
    setStatus("继续移动，恢复完整图片。");
  }
}

function startLevel(index) {
  currentLevel = index;
  shuffleState();
  locked = false;
  renderBoard();
  setStatus(`开始第 ${currentLevel + 1} 关。`);
}

async function loadLevels() {
  try {
    const res = await fetch("./levels.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (_) {
    // Direct file open (file://) may block fetch; fallback to levels.js.
  }

  if (Array.isArray(window.PUZZLE_LEVELS) && window.PUZZLE_LEVELS.length > 0) {
    return window.PUZZLE_LEVELS;
  }

  throw new Error("没有检测到可用图片关卡");
}

function bindEvents() {
  boardEl.addEventListener("click", onBoardClick);
  shuffleBtn.addEventListener("click", () => {
    if (!levels.length) return;
    startLevel(currentLevel);
  });
  prevBtn.addEventListener("click", () => {
    if (currentLevel > 0) startLevel(currentLevel - 1);
  });
  nextBtn.addEventListener("click", () => {
    if (currentLevel < levels.length - 1) startLevel(currentLevel + 1);
  });
}

(async function init() {
  try {
    levels = await loadLevels();
    bindEvents();
    startLevel(0);
  } catch (err) {
    locked = true;
    boardEl.innerHTML = "";
    levelLabelEl.textContent = "关卡：- / -";
    moveLabelEl.textContent = "步数：0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    shuffleBtn.disabled = true;
    setStatus(`${err.message}。请将图片放入 imgas 后重新生成关卡文件。`);
  }
})();

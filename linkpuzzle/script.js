(() => {
  const ROWS = 8;
  const COLS = 10;
  const DEFAULT_CELL_SIZE = 56;
  const PETS = [
    "cat",
    "dog",
    "fox",
    "owl",
    "pig",
    "cow",
    "bat",
    "bee",
    "lynx",
    "ram",
    "hen",
    "ant",
  ];

  const boardWrap = document.getElementById("board");
  const gameArea = document.getElementById("game-area");
  const linkLayer = document.getElementById("link-layer");
  const scoreEl = document.getElementById("score");
  const movesEl = document.getElementById("moves");
  const pairsLeftEl = document.getElementById("pairs-left");
  const messageEl = document.getElementById("message");

  const newGameBtn = document.getElementById("new-game");
  const hintBtn = document.getElementById("hint");
  const shuffleBtn = document.getElementById("shuffle");

  let board = [];
  let selected = null;
  let score = 0;
  let moves = 0;

  function applyResponsiveCellSize() {
    const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const viewportHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
    const sidePadding = viewportWidth < 760 ? 26 : 64;
    const topReserve = viewportWidth < 760 ? 250 : 300;

    const maxByWidth = Math.floor((viewportWidth - sidePadding) / (COLS + 2));
    const maxByHeight = Math.floor((viewportHeight - topReserve) / (ROWS + 2));
    const next = Math.max(30, Math.min(DEFAULT_CELL_SIZE, maxByWidth, maxByHeight));

    document.documentElement.style.setProperty("--cell-size", `${next}px`);
  }

  function getCellSize() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--cell-size")
      .trim();
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : DEFAULT_CELL_SIZE;
  }

  function emptyBoard() {
    return Array.from({ length: ROWS + 2 }, () => Array(COLS + 2).fill(0));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function setMessage(text) {
    messageEl.textContent = text;
  }

  function updateStats() {
    const remaining = countRemaining();
    scoreEl.textContent = String(score);
    movesEl.textContent = String(moves);
    pairsLeftEl.textContent = String(remaining / 2);
  }

  function countRemaining() {
    let count = 0;
    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        if (board[r][c] !== 0) count += 1;
      }
    }
    return count;
  }

  function initializeBoard() {
    board = emptyBoard();

    const total = ROWS * COLS;
    const values = [];
    for (let i = 0; i < total / 2; i += 1) {
      const type = 1 + (i % PETS.length);
      values.push(type, type);
    }

    shuffle(values);

    let idx = 0;
    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        board[r][c] = values[idx];
        idx += 1;
      }
    }

    // Ensure the generated level is solvable from the start.
    let tries = 0;
    while (!findAnyMove() && tries < 60) {
      reshuffleRemaining(true);
      tries += 1;
    }
  }

  function drawBoard() {
    boardWrap.innerHTML = "";
    applyResponsiveCellSize();

    const cellSize = getCellSize();

    const width = (COLS + 2) * cellSize;
    const height = (ROWS + 2) * cellSize;

    gameArea.style.width = `${width}px`;
    gameArea.style.height = `${height}px`;
    boardWrap.style.width = `${width}px`;
    boardWrap.style.height = `${height}px`;

    linkLayer.setAttribute("width", String(width));
    linkLayer.setAttribute("height", String(height));
    linkLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
    clearLinkPath();

    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        const type = board[r][c];
        if (type === 0) continue;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.style.width = `${cellSize - 6}px`;
        cell.style.height = `${cellSize - 6}px`;
        cell.style.left = `${c * cellSize + 3}px`;
        cell.style.top = `${r * cellSize + 3}px`;
        cell.style.backgroundImage = `url(assets/pets/${PETS[type - 1]}.svg)`;
        cell.setAttribute("aria-label", PETS[type - 1]);
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.addEventListener("click", onCellClick);
        boardWrap.appendChild(cell);
      }
    }
  }

  function cellCenter(r, c) {
    const cellSize = getCellSize();
    return {
      x: c * cellSize + cellSize / 2,
      y: r * cellSize + cellSize / 2,
    };
  }

  function clearLinkPath() {
    linkLayer.innerHTML = "";
  }

  function drawLinkPath(path) {
    if (!path || path.length < 2) return;

    const points = path
      .map(([r, c]) => {
        const p = cellCenter(r, c);
        return `${p.x},${p.y}`;
      })
      .join(" ");

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "#ef4444");
    polyline.setAttribute("stroke-width", "5");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    polyline.setAttribute("opacity", "0.9");

    linkLayer.appendChild(polyline);

    setTimeout(clearLinkPath, 180);
  }

  function getCellButton(r, c) {
    return boardWrap.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
  }

  function clearSelection() {
    if (selected?.el) {
      selected.el.classList.remove("selected");
    }
    selected = null;
  }

  function setSelection(r, c, el) {
    clearSelection();
    selected = { r, c, el };
    el.classList.add("selected");
  }

  function showHint() {
    const pair = findAnyMove();
    if (!pair) {
      setMessage("No available pairs. Shuffle now.");
      return;
    }

    const a = getCellButton(pair.a.r, pair.a.c);
    const b = getCellButton(pair.b.r, pair.b.c);
    if (!a || !b) return;

    a.classList.add("hint");
    b.classList.add("hint");
    setTimeout(() => {
      a.classList.remove("hint");
      b.classList.remove("hint");
    }, 700);
    setMessage("Hint highlighted.");
  }

  function reshuffleRemaining(silent = false) {
    const coords = [];
    const values = [];

    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        if (board[r][c] !== 0) {
          coords.push([r, c]);
          values.push(board[r][c]);
        }
      }
    }

    if (values.length === 0) return true;

    let tries = 0;
    do {
      shuffle(values);
      for (let i = 0; i < coords.length; i += 1) {
        const [r, c] = coords[i];
        board[r][c] = values[i];
      }
      tries += 1;
    } while (!findAnyMove() && tries < 60);

    drawBoard();
    clearSelection();

    if (!silent) {
      if (findAnyMove()) {
        setMessage("Board shuffled.");
      } else {
        setMessage("Could not find a solvable shuffle.");
      }
    }

    return !!findAnyMove();
  }

  function inRange(r, c) {
    return r >= 0 && r <= ROWS + 1 && c >= 0 && c <= COLS + 1;
  }

  function canPass(r, c, target) {
    if (r === target.r && c === target.c) return true;
    return board[r][c] === 0;
  }

  function compressPath(path) {
    if (path.length <= 2) return path;

    const compressed = [path[0]];
    for (let i = 1; i < path.length - 1; i += 1) {
      const [r0, c0] = path[i - 1];
      const [r1, c1] = path[i];
      const [r2, c2] = path[i + 1];
      const d1r = r1 - r0;
      const d1c = c1 - c0;
      const d2r = r2 - r1;
      const d2c = c2 - c1;
      if (d1r !== d2r || d1c !== d2c) {
        compressed.push(path[i]);
      }
    }
    compressed.push(path[path.length - 1]);
    return compressed;
  }

  function findPath(start, target) {
    if (start.r === target.r && start.c === target.c) return null;
    if (board[start.r][start.c] === 0 || board[target.r][target.c] === 0) return null;
    if (board[start.r][start.c] !== board[target.r][target.c]) return null;

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    const queue = [{ r: start.r, c: start.c, dir: -1, turns: 0 }];
    const visited = new Map();
    const prev = new Map();

    const startKey = `${start.r},${start.c},-1`;
    visited.set(startKey, 0);

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head];
      head += 1;

      for (let nd = 0; nd < dirs.length; nd += 1) {
        const newTurns = cur.dir === -1 || cur.dir === nd ? cur.turns : cur.turns + 1;
        if (newTurns > 2) continue;

        const { dr, dc } = dirs[nd];
        let nr = cur.r + dr;
        let nc = cur.c + dc;

        while (inRange(nr, nc) && canPass(nr, nc, target)) {
          const key = `${nr},${nc},${nd}`;
          const best = visited.get(key);
          if (best === undefined || newTurns < best) {
            visited.set(key, newTurns);
            prev.set(key, `${cur.r},${cur.c},${cur.dir}`);
            queue.push({ r: nr, c: nc, dir: nd, turns: newTurns });

            if (nr === target.r && nc === target.c) {
              const points = [];
              let walk = key;
              while (walk) {
                const [wr, wc, wd] = walk.split(",").map(Number);
                points.push([wr, wc]);
                walk = prev.get(`${wr},${wc},${wd}`);
              }
              points.reverse();
              return compressPath(points);
            }
          }

          nr += dr;
          nc += dc;
        }
      }
    }

    return null;
  }

  function findAnyMove() {
    const occupied = [];
    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        const type = board[r][c];
        if (type !== 0) occupied.push({ r, c, type });
      }
    }

    for (let i = 0; i < occupied.length; i += 1) {
      for (let j = i + 1; j < occupied.length; j += 1) {
        if (occupied[i].type !== occupied[j].type) continue;
        const path = findPath(occupied[i], occupied[j]);
        if (path) {
          return { a: occupied[i], b: occupied[j], path };
        }
      }
    }

    return null;
  }

  function removePair(a, b) {
    board[a.r][a.c] = 0;
    board[b.r][b.c] = 0;
    score += 10;
    moves += 1;
    updateStats();
  }

  function onCellClick(event) {
    const el = event.currentTarget;
    const r = Number(el.dataset.r);
    const c = Number(el.dataset.c);

    if (board[r][c] === 0) return;

    if (!selected) {
      setSelection(r, c, el);
      return;
    }

    if (selected.r === r && selected.c === c) {
      clearSelection();
      return;
    }

    const typeA = board[selected.r][selected.c];
    const typeB = board[r][c];

    if (typeA !== typeB) {
      setSelection(r, c, el);
      return;
    }

    const path = findPath({ r: selected.r, c: selected.c }, { r, c });
    if (!path) {
      setSelection(r, c, el);
      setMessage("Those pets cannot be linked with <=2 turns.");
      return;
    }

    drawLinkPath(path);
    removePair({ r: selected.r, c: selected.c }, { r, c });
    clearSelection();
    drawBoard();

    if (countRemaining() === 0) {
      setMessage("You win! Start a new game to play again.");
      return;
    }

    if (!findAnyMove()) {
      const ok = reshuffleRemaining(true);
      setMessage(ok ? "No moves left. Board auto-shuffled." : "No solvable moves left.");
    } else {
      setMessage("Nice match.");
    }
  }

  function newGame() {
    selected = null;
    score = 0;
    moves = 0;
    initializeBoard();
    drawBoard();
    updateStats();
    setMessage("New game started.");
  }

  newGameBtn.addEventListener("click", newGame);
  hintBtn.addEventListener("click", showHint);
  shuffleBtn.addEventListener("click", () => {
    reshuffleRemaining();
    updateStats();
  });

  window.addEventListener("resize", () => {
    selected = null;
    drawBoard();
  });

  newGame();
})();

var ROWS = 8;
var COLS = 8;
var GEM_TYPES = 6;

window.__MATCH3_BOOT_OK__ = false;

var boardEl = document.getElementById("board");
var scoreEl = document.getElementById("score");
var comboEl = document.getElementById("combo");
var movesEl = document.getElementById("moves");
var restartBtn = document.getElementById("restartBtn");
var runtimeStatusEl = document.getElementById("runtimeStatus");

var board = [];
var cells = [];
var score = 0;
var combo = 0;
var moves = 0;
var selected = null;
var locked = false;
var touchStart = null;

function ensureDomRefs() {
  if (!boardEl) boardEl = document.getElementById("board");
  if (!scoreEl) scoreEl = document.getElementById("score");
  if (!comboEl) comboEl = document.getElementById("combo");
  if (!movesEl) movesEl = document.getElementById("moves");
  if (!restartBtn) restartBtn = document.getElementById("restartBtn");
  if (!runtimeStatusEl) runtimeStatusEl = document.getElementById("runtimeStatus");
}

function setText(el, value) {
  if (!el) return;
  if (typeof el.textContent !== "undefined") {
    el.textContent = String(value);
  } else {
    el.innerText = String(value);
  }
}

function randomGem() {
  return Math.floor(Math.random() * GEM_TYPES);
}

function keyOf(r, c) {
  return r + "," + c;
}

function parseKey(key) {
  var parts = key.split(",");
  return { r: Number(parts[0]), c: Number(parts[1]) };
}

function isInside(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function isAdjacent(a, b) {
  var dist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  return dist === 1;
}

function swap(a, b) {
  var temp = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = temp;
}

function hasMatchAt(r, c) {
  var v = board[r][c];
  if (v == null) return false;

  if (c >= 2 && board[r][c - 1] === v && board[r][c - 2] === v) return true;
  if (r >= 2 && board[r - 1][c] === v && board[r - 2][c] === v) return true;
  return false;
}

function buildInitialBoard() {
  var r;
  var c;
  board = [];
  for (r = 0; r < ROWS; r++) {
    board[r] = [];
    for (c = 0; c < COLS; c++) {
      board[r][c] = 0;
    }
  }

  for (r = 0; r < ROWS; r++) {
    for (c = 0; c < COLS; c++) {
      var gem = randomGem();
      var guard = 0;
      while (guard < 20) {
        board[r][c] = gem;
        if (!hasMatchAt(r, c)) break;
        gem = randomGem();
        guard++;
      }
      board[r][c] = gem;
    }
  }
}

function createBoardDom() {
  var r;
  var c;
  ensureDomRefs();
  if (!boardEl) return;
  boardEl.innerHTML = "";
  cells = [];
  for (r = 0; r < ROWS; r++) {
    cells[r] = [];
  }

  for (r = 0; r < ROWS; r++) {
    for (c = 0; c < COLS; c++) {
      var cell = document.createElement("button");
      cell.className = "cell";
      cell.type = "button";
      cell.setAttribute("data-row", String(r));
      cell.setAttribute("data-col", String(c));
      cell.addEventListener("click", makeCellClickHandler(r, c));

      if (window.PointerEvent) {
        cell.addEventListener("pointerdown", onPointerDown);
        cell.addEventListener("pointerup", onPointerUp);
        cell.addEventListener("pointercancel", onPointerCancel);
      } else {
        cell.addEventListener("touchstart", onTouchStart, false);
        cell.addEventListener("touchend", onTouchEnd, false);
        cell.addEventListener("touchcancel", onTouchCancel, false);
      }

      boardEl.appendChild(cell);
      cells[r][c] = cell;
    }
  }
}

function makeCellClickHandler(r, c) {
  return function () {
    onCellClick(r, c);
  };
}

function drawBoard() {
  var r;
  var c;
  for (r = 0; r < ROWS; r++) {
    for (c = 0; c < COLS; c++) {
      var cell = cells[r][c];
      var gem = board[r][c];
      cell.className = "cell";
      if (gem != null) {
        cell.className += " gem-" + gem;
      }
      if (selected && selected.r === r && selected.c === c) {
        cell.className += " selected";
      }
    }
  }
}

function updateHud() {
  ensureDomRefs();
  setText(scoreEl, score);
  setText(comboEl, combo);
  setText(movesEl, moves);
}

function findMatches() {
  var matchedMap = {};
  var r;
  var c;

  for (r = 0; r < ROWS; r++) {
    var runStartCol = 0;
    for (c = 1; c <= COLS; c++) {
      var prevH = board[r][c - 1];
      var curH = c < COLS ? board[r][c] : null;
      if (curH !== prevH) {
        var lenH = c - runStartCol;
        if (prevH != null && lenH >= 3) {
          var hc;
          for (hc = runStartCol; hc < c; hc++) {
            matchedMap[keyOf(r, hc)] = true;
          }
        }
        runStartCol = c;
      }
    }
  }

  for (c = 0; c < COLS; c++) {
    var runStartRow = 0;
    for (r = 1; r <= ROWS; r++) {
      var prevV = board[r - 1][c];
      var curV = r < ROWS ? board[r][c] : null;
      if (curV !== prevV) {
        var lenV = r - runStartRow;
        if (prevV != null && lenV >= 3) {
          var vr;
          for (vr = runStartRow; vr < r; vr++) {
            matchedMap[keyOf(vr, c)] = true;
          }
        }
        runStartRow = r;
      }
    }
  }

  var keys = [];
  for (var key in matchedMap) {
    if (Object.prototype.hasOwnProperty.call(matchedMap, key)) {
      keys.push(key);
    }
  }
  return keys;
}

function markMatches(matchedKeys) {
  var i;
  for (i = 0; i < matchedKeys.length; i++) {
    var pos = parseKey(matchedKeys[i]);
    cells[pos.r][pos.c].className += " matched";
  }
}

function clearMatches(matchedKeys) {
  var i;
  for (i = 0; i < matchedKeys.length; i++) {
    var pos = parseKey(matchedKeys[i]);
    board[pos.r][pos.c] = null;
  }
}

function getRowStepPx() {
  if (!cells || cells.length < 2 || !cells[0] || !cells[1] || !cells[0][0] || !cells[1][0]) {
    return 64;
  }

  var r0 = cells[0][0].getBoundingClientRect();
  var r1 = cells[1][0].getBoundingClientRect();
  var step = r1.top - r0.top;
  if (!step || step < 1) {
    step = r0.height + 6;
  }
  return step;
}

function animateSwapVisual(a, b, done) {
  var elA = cells[a.r] ? cells[a.r][a.c] : null;
  var elB = cells[b.r] ? cells[b.r][b.c] : null;
  if (!elA || !elB) {
    done();
    return;
  }

  var rectA = elA.getBoundingClientRect();
  var rectB = elB.getBoundingClientRect();
  var dx = rectB.left - rectA.left;
  var dy = rectB.top - rectA.top;

  elA.style.setProperty("--swap-x", dx + "px");
  elA.style.setProperty("--swap-y", dy + "px");
  elB.style.setProperty("--swap-x", -dx + "px");
  elB.style.setProperty("--swap-y", -dy + "px");
  elA.className += " swap-anim";
  elB.className += " swap-anim";

  setTimeout(function () {
    elA.className = elA.className.replace(" swap-anim", "");
    elB.className = elB.className.replace(" swap-anim", "");
    elA.style.removeProperty("--swap-x");
    elA.style.removeProperty("--swap-y");
    elB.style.removeProperty("--swap-x");
    elB.style.removeProperty("--swap-y");
    done();
  }, 145);
}

function collapseColumns() {
  var c;
  var r;
  var fallMap = {};
  for (c = 0; c < COLS; c++) {
    var writeRow = ROWS - 1;
    for (r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] != null) {
        if (writeRow !== r) {
          board[writeRow][c] = board[r][c];
          board[r][c] = null;
          fallMap[keyOf(writeRow, c)] = writeRow - r;
        }
        writeRow--;
      }
    }

    for (; writeRow >= 0; writeRow--) {
      board[writeRow][c] = null;
    }
  }
  return fallMap;
}

function refillColumns() {
  var r;
  var c;
  var spawnMap = {};
  var i;
  for (c = 0; c < COLS; c++) {
    var nullRows = [];
    for (r = 0; r < ROWS; r++) {
      if (board[r][c] != null) {
        continue;
      }
      nullRows.push(r);
    }

    for (i = 0; i < nullRows.length; i++) {
      r = nullRows[i];
      board[r][c] = randomGem();
      spawnMap[keyOf(r, c)] = nullRows.length - i;
    }
  }

  return spawnMap;
}

function animateFalls(distanceMap) {
  var step = getRowStepPx();
  for (var key in distanceMap) {
    if (!Object.prototype.hasOwnProperty.call(distanceMap, key)) {
      continue;
    }

    var distance = distanceMap[key];
    if (!distance || distance <= 0) {
      continue;
    }

    var pos = parseKey(key);
    var cell = cells[pos.r] ? cells[pos.r][pos.c] : null;
    if (!cell) {
      continue;
    }

    cell.style.setProperty("--fall-y", distance * step + "px");
    cell.className += " fall-anim";
  }

  setTimeout(function () {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = cells[r][c];
        if (!cell) {
          continue;
        }
        cell.className = cell.className.replace(" fall-anim", "");
        cell.style.removeProperty("--fall-y");
      }
    }
  }, 215);
}

function resolveBoard(matches, done) {
  var localCombo = 0;

  function step(currentMatches) {
    if (!currentMatches || currentMatches.length === 0) {
      done();
      return;
    }

    localCombo++;
    combo = localCombo;
    score += currentMatches.length * 10 * localCombo;
    updateHud();

    markMatches(currentMatches);
    setTimeout(function () {
      clearMatches(currentMatches);
      drawBoard();

      setTimeout(function () {
        var fallMap = collapseColumns();
        var spawnMap = refillColumns();
        drawBoard();

        for (var k in spawnMap) {
          if (Object.prototype.hasOwnProperty.call(spawnMap, k)) {
            fallMap[k] = (fallMap[k] || 0) + spawnMap[k];
          }
        }

        animateFalls(fallMap);

        setTimeout(function () {
          step(findMatches());
        }, 220);
      }, 110);
    }, 220);
  }

  step(matches);
}

function trySwap(a, b, done) {
  locked = true;

  animateSwapVisual(a, b, function () {
    swap(a, b);
    drawBoard();

    var matches = findMatches();
    if (matches.length === 0) {
      animateSwapVisual(b, a, function () {
        swap(a, b);
        drawBoard();
        combo = 0;
        updateHud();
        locked = false;
        done();
      });
      return;
    }

    moves++;
    updateHud();
    resolveBoard(matches, function () {
      locked = false;
      done();
    });
  });
}

function onCellClick(r, c) {
  if (locked || !isInside(r, c)) return;

  if (!selected) {
    selected = { r: r, c: c };
    drawBoard();
    return;
  }

  if (selected.r === r && selected.c === c) {
    selected = null;
    drawBoard();
    return;
  }

  var current = { r: r, c: c };
  if (!isAdjacent(selected, current)) {
    selected = current;
    drawBoard();
    return;
  }

  var first = selected;
  selected = null;
  drawBoard();
  trySwap(first, current, function () {});
}

function onPointerDown(event) {
  if (locked) return;
  var cell = event.currentTarget;
  var r = Number(cell.getAttribute("data-row"));
  var c = Number(cell.getAttribute("data-col"));
  touchStart = {
    r: r,
    c: c,
    x: event.clientX,
    y: event.clientY,
    id: event.pointerId
  };
}

function onPointerUp(event) {
  var start = touchStart;
  touchStart = null;
  if (!start || start.id !== event.pointerId || locked) return;
  swipeToSwap(start.r, start.c, event.clientX - start.x, event.clientY - start.y);
}

function onPointerCancel() {
  touchStart = null;
}

function onTouchStart(event) {
  if (locked) return;
  if (!event.touches || event.touches.length === 0) return;

  var cell = event.currentTarget;
  var t = event.touches[0];
  touchStart = {
    r: Number(cell.getAttribute("data-row")),
    c: Number(cell.getAttribute("data-col")),
    x: t.clientX,
    y: t.clientY
  };
}

function onTouchEnd(event) {
  var start = touchStart;
  touchStart = null;
  if (!start || locked) return;

  if (!event.changedTouches || event.changedTouches.length === 0) return;
  var t = event.changedTouches[0];
  swipeToSwap(start.r, start.c, t.clientX - start.x, t.clientY - start.y);
}

function onTouchCancel() {
  touchStart = null;
}

function swipeToSwap(startR, startC, dx, dy) {
  var threshold = 18;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return;
  }

  var target = { r: startR, c: startC };
  if (Math.abs(dx) > Math.abs(dy)) {
    target.c += dx > 0 ? 1 : -1;
  } else {
    target.r += dy > 0 ? 1 : -1;
  }

  if (!isInside(target.r, target.c)) return;

  selected = null;
  drawBoard();
  trySwap({ r: startR, c: startC }, target, function () {});
}

function resetGame() {
  ensureDomRefs();
  score = 0;
  combo = 0;
  moves = 0;
  selected = null;
  locked = false;
  touchStart = null;

  buildInitialBoard();
  createBoardDom();
  if (!boardEl) {
    setText(runtimeStatusEl, "初始化失败：页面元素未就绪");
    return;
  }
  drawBoard();
  updateHud();

  setText(runtimeStatusEl, "游戏已就绪：点击或滑动开始");
}

ensureDomRefs();
if (restartBtn) {
  restartBtn.addEventListener("click", resetGame);
}
resetGame();
window.__MATCH3_BOOT_OK__ = true;

window.addEventListener("error", function () {
  ensureDomRefs();
  setText(runtimeStatusEl, "初始化失败：请在系统浏览器打开并强制刷新");
});

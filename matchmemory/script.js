var ICONS = ["🍓", "🍍", "🍉", "🍒", "🍇", "🥝", "🍊", "🍋"];

var boardEl = document.getElementById("board");
var movesEl = document.getElementById("moves");
var timerEl = document.getElementById("timer");
var pairsEl = document.getElementById("pairs");
var restartBtn = document.getElementById("restartBtn");
var winPanel = document.getElementById("winPanel");
var summaryText = document.getElementById("summaryText");
var playAgainBtn = document.getElementById("playAgainBtn");
var runtimeStatus = document.getElementById("runtimeStatus");

var cards = [];
var firstCard = null;
var secondCard = null;
var lockBoard = false;
var moves = 0;
var matchedPairs = 0;
var timerId = null;
var elapsedSeconds = 0;
var hasStarted = false;

function shuffle(array) {
  var arr = array.slice();
  var i;
  for (i = arr.length - 1; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function pad2(num) {
  return num < 10 ? "0" + num : String(num);
}

function formatTime(totalSeconds) {
  var m = pad2(Math.floor(totalSeconds / 60));
  var s = pad2(totalSeconds % 60);
  return m + ":" + s;
}

function updatePairsText() {
  pairsEl.textContent = matchedPairs + " / " + ICONS.length;
}

function updateHud() {
  movesEl.textContent = String(moves);
  timerEl.textContent = formatTime(elapsedSeconds);
  updatePairsText();
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  if (timerId) {
    return;
  }

  timerId = setInterval(function () {
    elapsedSeconds += 1;
    timerEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function createCard(icon, index) {
  var button = document.createElement("button");
  button.className = "card";
  button.type = "button";
  button.setAttribute("data-icon", icon);
  button.setAttribute("data-index", String(index));
  button.setAttribute("aria-label", "隐藏卡片");

  button.innerHTML =
    '<span class="card-inner" aria-hidden="true">' +
    '<span class="face face-back">?</span>' +
    '<span class="face face-front">' + icon + "</span>" +
    "</span>";

  button.addEventListener("click", onCardClick);
  return button;
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function markAsMatched(a, b) {
  a.classList.add("is-matched");
  b.classList.add("is-matched");
  a.disabled = true;
  b.disabled = true;
  a.setAttribute("aria-label", "已匹配卡片");
  b.setAttribute("aria-label", "已匹配卡片");
}

function hideBoth(a, b) {
  a.classList.remove("is-flipped");
  b.classList.remove("is-flipped");
  a.setAttribute("aria-label", "隐藏卡片");
  b.setAttribute("aria-label", "隐藏卡片");
}

function checkWin() {
  if (matchedPairs !== ICONS.length) {
    return;
  }

  stopTimer();
  summaryText.textContent = "你用了 " + moves + " 步，耗时 " + formatTime(elapsedSeconds) + " 完成全部配对。";
  winPanel.hidden = false;
}

function onCardClick(event) {
  var card = event.currentTarget;

  if (lockBoard || card === firstCard || card.classList.contains("is-matched")) {
    return;
  }

  if (!hasStarted) {
    hasStarted = true;
    startTimer();
  }

  card.classList.add("is-flipped");
  card.setAttribute("aria-label", "已翻开卡片");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves += 1;
  movesEl.textContent = String(moves);
  lockBoard = true;

  var isMatch = firstCard.getAttribute("data-icon") === secondCard.getAttribute("data-icon");

  if (isMatch) {
    markAsMatched(firstCard, secondCard);
    matchedPairs += 1;
    updatePairsText();
    resetTurn();
    checkWin();
    return;
  }

  setTimeout(function () {
    hideBoth(firstCard, secondCard);
    resetTurn();
  }, 650);
}

function clearBoard() {
  while (boardEl.firstChild) {
    boardEl.removeChild(boardEl.firstChild);
  }
}

function buildBoard() {
  var deck = shuffle(ICONS.concat(ICONS));
  var i;
  clearBoard();
  cards = [];

  for (i = 0; i < deck.length; i += 1) {
    var card = createCard(deck[i], i);
    cards.push(card);
    boardEl.appendChild(card);
  }
}

function resetGame() {
  stopTimer();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matchedPairs = 0;
  elapsedSeconds = 0;
  hasStarted = false;
  winPanel.hidden = true;
  updateHud();
  buildBoard();
}

restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

resetGame();

if (runtimeStatus) {
  runtimeStatus.hidden = false;
}

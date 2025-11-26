const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ------------------- 게임 설정 변수 -------------------
let tileSize = 20;
let snake = [];
let direction = "right";
let nextDirection = "right";
let food = {};
let items = []; // 아이템 리스트
let gameInterval;
let score = 0;
let speed = 100;
let baseSpeed = 100;
let gameOver = false;
let weeds = [];
let invincible = false; // 무적 플래그
const fenceWidth = tileSize; // 울타리 한 칸 크기
const playArea = canvas.width - fenceWidth * 2;

// 효과 타이머 추적 (한 판 끝나면 전부 clear)
let activeEffectTimeouts = [];

// 아이템 유지 개수 (필요하면 조정)
const desiredItemCount = 4;

// ------------------- UI 함수 -------------------
function chooseDifficulty(level) {
  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById("instructions").classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");

  if (level === "easy") baseSpeed = speed = 150;
  if (level === "normal") baseSpeed = speed = 100;
  if (level === "hard") baseSpeed = speed = 70;

  resetGame();
}

function goToInstructions() {
  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById("instructions").classList.remove("hidden");
}

function goToMainMenu() {
  clearInterval(gameInterval);
  document.getElementById("gameUI").classList.add("hidden");
  document.getElementById("instructions").classList.add("hidden");
  document.getElementById("mainMenu").classList.remove("hidden");
}

// ------------------- 유틸: 타이머 관리 -------------------
function trackTimeout(id) {
  activeEffectTimeouts.push(id);
}
function clearAllEffectTimeouts() {
  for (let id of activeEffectTimeouts) clearTimeout(id);
  activeEffectTimeouts = [];
}

// ------------------- 게임 초기화 -------------------
function resetGame() {
  // 인터벌/타이머 초기화
  clearInterval(gameInterval);
  clearAllEffectTimeouts();

  // 상태 리셋
  score = 0;
  direction = "right";
  nextDirection = "right";
  gameOver = false;
  invincible = false;
  speed = baseSpeed;

  // 초기 뱀 위치
  snake = [
    { x: fenceWidth + tileSize * 5, y: fenceWidth + tileSize * 5 },
    { x: fenceWidth + tileSize * 4, y: fenceWidth + tileSize * 5 },
  ];

  generateFood();
  generateWeeds();
  generateItems(true); // 초기 아이템 여러 개 생성

  document.getElementById("score").innerText = score;
  document.getElementById("status").innerText = "";

  gameInterval = setInterval(gameLoop, speed);
}

// ------------------- 입력 처리 -------------------
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" && direction !== "down") nextDirection = "up";
  else if (e.key === "ArrowDown" && direction !== "up") nextDirection = "down";
  else if (e.key === "ArrowLeft" && direction !== "right") nextDirection = "left";
  else if (e.key === "ArrowRight" && direction !== "left") nextDirection = "right";
});

// ------------------- 음식/배경 요소 -------------------
function generateFood() {
  food.x = Math.floor(Math.random() * (playArea / tileSize)) * tileSize + fenceWidth;
  food.y = Math.floor(Math.random() * (playArea / tileSize)) * tileSize + fenceWidth;
}

function generateWeeds() {
  weeds = [];
  for (let i = 0; i < 5; i++) {
    weeds.push({
      x: Math.floor(Math.random() * (playArea / tileSize)) * tileSize + fenceWidth,
      y: Math.floor(Math.random() * (playArea / tileSize)) * tileSize + fenceWidth,
    });
  }
}

// ------------------- 아이템 생성 (가중치 기반, items 유지) -------------------
// 가중치: 무적(가장 희귀), 보너스(희귀), fast/slow(덜 희귀)
// weights: invincible 1, bonus 2, fast 3, slow 3  (상대적 희귀도)
function pickWeightedItemType() {
  const table = [
    { type: "invincible", w: 1 },
    { type: "bonus", w: 2 },
    { type: "fast", w: 3 },
    { type: "slow", w: 3 },
  ];
  const total = table.reduce((s, t) => s + t.w, 0);
  let r = Math.random() * total;
  for (let t of table) {
    if (r < t.w) return t.type;
    r -= t.w;
  }
  return "bonus";
}

function addItemOfType(type) {
  // 충돌되지 않는 위치 찾기 (간단하게 시도 몇 번)
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = Math.floor(Math.random() * (playArea / tileSize)) * tileSize + fenceWidth;
    const y = Math.floor(Math.random() * (playArea / tileSize)) * tileSize + fenceWidth;

    // 겹침 체크: 음식/뱀/기존 아이템과 중복 피함
    const collidesWithFood = x === food.x && y === food.y;
    const collidesWithSnake = snake.some(s => s.x === x && s.y === y);
    const collidesWithItem = items.some(it => it.x === x && it.y === y);
    if (!collidesWithFood && !collidesWithSnake && !collidesWithItem) {
      items.push({ x, y, type });
      return true;
    }
  }
  // 실패하면 false 반환
  return false;
}

function generateItems(initial = false) {
  if (initial) {
    items = [];
    // 초기에는 desiredItemCount 개수만큼 무작위 타입으로 채움 (가중치 샘플링)
    for (let i = 0; i < desiredItemCount; i++) {
      const type = pickWeightedItemType();
      addItemOfType(type);
    }
  } else {
    // 게임 중에는 항상 desiredItemCount 유지하도록 시도
    let tries = 0;
    while (items.length < desiredItemCount && tries < 10) {
      const type = pickWeightedItemType();
      addItemOfType(type);
      tries++;
    }
  }
}

// ------------------- 메인 게임 루프 -------------------
function gameLoop() {
  if (gameOver) return;
  direction = nextDirection;

  let head = { ...snake[0] };
  if (direction === "up") head.y -= tileSize;
  if (direction === "down") head.y += tileSize;
  if (direction === "left") head.x -= tileSize;
  if (direction === "right") head.x += tileSize;

  // 울타리 충돌 확인
  if (
    head.x < fenceWidth ||
    head.y < fenceWidth ||
    head.x >= canvas.width - fenceWidth ||
    head.y >= canvas.height - fenceWidth
  ) {
    if (!invincible) {
      endGame("울타리에 부딪혔어요!");
      return;
    } else {
      // 무적 상태라면 벽 통과 처리 (텔레포트)
      if (head.x < fenceWidth) head.x = canvas.width - fenceWidth - tileSize;
      if (head.x >= canvas.width - fenceWidth) head.x = fenceWidth;
      if (head.y < fenceWidth) head.y = canvas.height - fenceWidth - tileSize;
      if (head.y >= canvas.height - fenceWidth) head.y = fenceWidth;
    }
  }

  // 자기 몸과 충돌 확인
  for (let s of snake) {
    if (head.x === s.x && head.y === s.y && !invincible) {
      endGame("돼지가 자기 몸에 부딪혔어요!");
      return;
    }
  }

  snake.unshift(head);

  // 짚(먹이) 먹기
  if (head.x === food.x && head.y === food.y) {
    score++;
    document.getElementById("score").innerText = score;
    generateFood();
    // 먹을 때마다 아이템 유지 수량이 채워지도록 시도
    generateItems();
  } else {
    snake.pop();
  }

  // 아이템 먹기
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (head.x === item.x && head.y === item.y) {
      applyItemEffect(item.type);
      items.splice(i, 1);
      // 먹은 뒤에도 desiredItemCount 유지 시도
      generateItems();
      break;
    }
  }

  drawGame();
}

// ------------------- 그리기 -------------------
function drawGame() {
  // 잔디 배경
  const grassGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grassGradient.addColorStop(0, "#A8E063");
  grassGradient.addColorStop(1, "#56AB2F");
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 잡초
  for (let w of weeds) {
    ctx.fillStyle = "#2E8B57";
    ctx.beginPath();
    ctx.arc(w.x + tileSize / 2, w.y + tileSize / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 울타리
  drawFence();

  // 짚
  drawHay(food.x, food.y);

  // 아이템
  for (let item of items) drawItem(item);

  // 돼지
  for (let i = 0; i < snake.length; i++) drawPigFace(snake[i].x, snake[i].y);
}

// ------------------- 울타리 -------------------
function drawFence() {
  const plankColor = "#A0522D";
  const plankHighlight = "#CD853F";
  const plankGap = 3;

  for (let x = 0; x < canvas.width; x += fenceWidth + plankGap) {
    ctx.fillStyle = plankColor;
    ctx.fillRect(x, 0, fenceWidth, tileSize);
    ctx.fillStyle = plankHighlight;
    ctx.fillRect(x, tileSize / 3, fenceWidth, 2);
  }

  for (let x = 0; x < canvas.width; x += fenceWidth + plankGap) {
    ctx.fillStyle = plankColor;
    ctx.fillRect(x, canvas.height - tileSize, fenceWidth, tileSize);
    ctx.fillStyle = plankHighlight;
    ctx.fillRect(x, canvas.height - tileSize / 1.5, fenceWidth, 2);
  }

  for (let y = 0; y < canvas.height; y += fenceWidth + plankGap) {
    ctx.fillStyle = plankColor;
    ctx.fillRect(0, y, tileSize, fenceWidth);
    ctx.fillStyle = plankHighlight;
    ctx.fillRect(tileSize / 3, y, 2, fenceWidth);
  }

  for (let y = 0; y < canvas.height; y += fenceWidth + plankGap) {
    ctx.fillStyle = plankColor;
    ctx.fillRect(canvas.width - tileSize, y, tileSize, fenceWidth);
    ctx.fillStyle = plankHighlight;
    ctx.fillRect(canvas.width - tileSize / 1.5, y, 2, fenceWidth);
  }
}

// ------------------- 아이템 표시 (아이콘 스타일) -------------------
function drawItem(item) {
  const centerX = item.x + tileSize / 2;
  const centerY = item.y + tileSize / 2;
  const r = tileSize / 2.2;

  if (item.type === "slow") {
    // 거북이 등껍질
    ctx.fillStyle = "#2E8B57";
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - r / 2, centerY);
    ctx.lineTo(centerX + r / 2, centerY);
    ctx.moveTo(centerX, centerY - r / 2);
    ctx.lineTo(centerX, centerY + r / 2);
    ctx.stroke();
  } else if (item.type === "fast") {
    // 번개
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(centerX - r / 2, centerY - r / 2);
    ctx.lineTo(centerX, centerY);
    ctx.lineTo(centerX - r / 4, centerY);
    ctx.lineTo(centerX + r / 2, centerY + r / 2);
    ctx.lineTo(centerX, centerY);
    ctx.lineTo(centerX + r / 4, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#FF8C00";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (item.type === "bonus") {
    // 고기
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, r * 0.8, r * 0.6, Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(centerX - r, centerY, r / 4, 0, Math.PI * 2);
    ctx.arc(centerX - r * 1.2, centerY, r / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === "invincible") {
    // 슈퍼맨 느낌
    ctx.fillStyle = "#1E90FF";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - r);
    ctx.lineTo(centerX + r, centerY);
    ctx.lineTo(centerX, centerY + r);
    ctx.lineTo(centerX - r, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - r / 2, centerY - r / 3);
    ctx.lineTo(centerX + r / 2, centerY - r / 3);
    ctx.lineTo(centerX - r / 2, centerY + r / 3);
    ctx.lineTo(centerX + r / 2, centerY + r / 3);
    ctx.stroke();
  } else {
    // fallback 원
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------- 돼지 & 짚 -------------------
function drawPigFace(x, y) {
  ctx.fillStyle = invincible ? "#FFD700" : "#ffc0cb"; // 무적이면 금색
  ctx.fillRect(x, y, tileSize, tileSize);
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 4, y + 4, 3, 3);
  ctx.fillRect(x + 13, y + 4, 3, 3);
  ctx.fillStyle = "#ff69b4";
  ctx.beginPath();
  ctx.ellipse(x + tileSize / 2, y + 13, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(x + tileSize / 2 - 2, y + 13, 1, 0, Math.PI * 2);
  ctx.arc(x + tileSize / 2 + 2, y + 13, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawHay(x, y) {
  ctx.fillStyle = "#d2b48c";
  ctx.fillRect(x, y, tileSize, tileSize);
  ctx.strokeStyle = "#b22222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + tileSize / 3);
  ctx.lineTo(x + tileSize, y + tileSize / 3);
  ctx.moveTo(x, y + (tileSize / 3) * 2);
  ctx.lineTo(x + tileSize, y + (tileSize / 3) * 2);
  ctx.stroke();
}

// ------------------- 아이템 효과 -------------------
function applyItemEffect(type) {
  // 모든 효과 실행 전 기존 효과 타이머는 추적(끝나면 자동 해제)
  if (type === "bonus") {
    score += 5;
    document.getElementById("score").innerText = score;
    showStatusMessage("🍖 보너스 점수 +5!");
  }

  if (type === "slow") {
    showStatusMessage("🐢 속도 느려짐!");
    speed = Math.round(speed * 1.5);
    restartInterval();
    // 5초 뒤 원상복구
    const t = setTimeout(() => {
      resetSpeed();
      showStatusMessage("🐢 느려짐 해제");
    }, 5000);
    trackTimeout(t);
  }

  if (type === "fast") {
    showStatusMessage("⚡ 속도 증가!");
    speed = Math.max(20, Math.round(speed * 0.5));
    restartInterval();
    const t = setTimeout(() => {
      resetSpeed();
      showStatusMessage("⚡ 속도 증가 해제");
    }, 5000);
    trackTimeout(t);
  }

  if (type === "invincible") {
    showStatusMessage("🦸 무적 모드! (5초)");
    invincible = true;
    // 속도 30% 증가: speed *= 0.7 -> 실제 숫자는 작은 값일수록 빠름(인터벌 ms)
    const originalSpeed = speed;
    speed = Math.max(20, Math.round(speed * 0.7));
    restartInterval();

    const t = setTimeout(() => {
      invincible = false;
      resetSpeed(originalSpeed);
      showStatusMessage("🦸 무적 해제!");
    }, 5000);
    trackTimeout(t);
  }
}

function restartInterval() {
  clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, speed);
}

function resetSpeed(original = baseSpeed) {
  clearInterval(gameInterval);
  speed = original;
  gameInterval = setInterval(gameLoop, speed);
}

// ------------------- 상태 메시지 -------------------
function showStatusMessage(msg) {
  const status = document.getElementById("status");
  status.innerText = msg;
  const t = setTimeout(() => {
    if (status.innerText === msg) status.innerText = "";
  }, 2000);
  trackTimeout(t);
}

// ------------------- 게임 종료 -------------------
function endGame(msg) {
  clearInterval(gameInterval);
  // 모든 효과 타이머 및 상태 초기화
  clearAllEffectTimeouts();
  invincible = false;
  speed = baseSpeed;
  gameOver = true;
  document.getElementById("status").innerText = `💀 게임 오버! ${msg}`;
}

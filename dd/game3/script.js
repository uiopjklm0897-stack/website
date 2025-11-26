// =========================
// 초기 변수 및 DOM
// =========================
let isGameStarted = false;
let isPaused = false;
let animationFrameId;
let dropCounter = 0;
let dropInterval = 500;
let lastTime = 0;

const mainMenu = document.getElementById("mainMenu");
const helpScreen = document.getElementById("helpScreen");
const gameContainer = document.getElementById("gameContainer");
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
ctx.scale(20, 20);
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
nextCtx.scale(20, 20);
const scoreElement = document.getElementById('score');

// =========================
// 테트리스 설정
// =========================
const arenaWidth = 12;
const arenaHeight = 20;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

const arena = createMatrix(arenaWidth, arenaHeight);

const pieces = {
  'T': [[0,0,0],[1,1,1],[0,1,0]],
  'O': [[2,2],[2,2]],
  'L': [[0,3,0],[0,3,0],[0,3,3]],
  'J': [[0,4,0],[0,4,0],[4,4,0]],
  'I': [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]],
  'S': [[0,6,6],[6,6,0],[0,0,0]],
  'Z': [[7,7,0],[0,7,7],[0,0,0]],
};

const colors = [null,'#A066A0','#D1C84B','#CC8844','#4466CC','#66CCCC','#66CC66','#CC4444'];

const player = { pos: {x:0,y:0}, matrix: null, score: 0 };
const PREVIEW_COUNT = 4;
const nextQueue = [];

// =========================
// 버튼 이벤트
// =========================
document.getElementById("playBtn").addEventListener("click", () => {
  mainMenu.style.display = "none";
  gameContainer.style.display = "block";
  isGameStarted = true;
  startGame();
});

document.getElementById("helpBtn").addEventListener("click", () => {
  mainMenu.style.display = "none";
  helpScreen.style.display = "block";
});

document.getElementById("backBtn").addEventListener("click", () => {
  helpScreen.style.display = "none";
  mainMenu.style.display = "block";
});

// =========================
// 블록 및 게임 로직
// =========================
function initNextQueue() {
  const keys = Object.keys(pieces);
  while (nextQueue.length < PREVIEW_COUNT) {
    const key = keys[(keys.length * Math.random()) | 0];
    if (!nextQueue.includes(key)) nextQueue.push(key);
  }
}

function collide(arena, player) {
  const m = player.matrix, o = player.pos;
  for (let y=0; y<m.length; ++y)
    for (let x=0; x<m[y].length; ++x)
      if (m[y][x] !== 0 && (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0) return true;
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row,y) => row.forEach((val,x) => {
    if (val !== 0) arena[y+player.pos.y][x+player.pos.x] = val;
  }));
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  while(!collide(arena, player)) player.pos.y++;
  player.pos.y--;
  merge(arena, player);
  playerReset();
  arenaSweep();
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function rotate(matrix, dir) {
  for (let y=0;y<matrix.length;++y)
    for(let x=0;x<y;++x)
      [matrix[x][y],matrix[y][x]]=[matrix[y][x],matrix[x][y]];
  if(dir>0) matrix.forEach(row=>row.reverse());
  else matrix.reverse();
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while(collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset>0?1:-1));
    if(offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function playerReset() {
  const keys = Object.keys(pieces);
  const newKey = nextQueue.shift();
  player.matrix = pieces[newKey];

  let nextKey, attempts=0;
  do {
    nextKey = keys[(keys.length*Math.random())|0];
    attempts++;
    if(attempts>10) break;
  } while(nextQueue.includes(nextKey));
  nextQueue.push(nextKey);

  player.pos.y = 0;
  player.pos.x = ((arenaWidth/2)|0) - ((player.matrix[0].length/2)|0);
  if(collide(arena, player)) showGameOver();
}

function arenaSweep() {
  let rowsCleared=0;
  outer: for(let y=arena.length-1;y>=0;--y){
    for(let x=0;x<arena[y].length;++x){
      if(arena[y][x]===0) continue outer;
    }
    const row = arena.splice(y,1)[0].fill(0);
    arena.unshift(row);
    rowsCleared++; y++;
  }
  const scoreMap={1:40,2:100,3:300,4:1200};
  player.score += scoreMap[rowsCleared]||0;
  updateScore();
}

// =========================
// 그리기
// =========================
function drawBackgroundText(ctx) {
  ctx.save();
  ctx.resetTransform();
  ctx.font="48px Arial";
  ctx.fillStyle="rgba(0, 80, 252, 1)";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText("Artifex", ctx.canvas.width/2, ctx.canvas.height/2);
  ctx.restore();
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row,y) => row.forEach((val,x)=>{
    if(val!==0){
      ctx.fillStyle = colors[val];
      ctx.fillRect(x+offset.x, y+offset.y, 1,1);
      ctx.strokeStyle='black';
      ctx.lineWidth=0.1;
      ctx.strokeRect(x+offset.x,y+offset.y,1,1);
    }
  }));
}

function drawGhostPiece() {
  const ghost = {matrix:player.matrix,pos:{...player.pos}};
  while(!collide(arena,ghost)) ghost.pos.y++;
  ghost.pos.y--;
  ctx.globalAlpha=0.3;
  drawMatrix(ghost.matrix, ghost.pos);
  ctx.globalAlpha=1.0;
}

function drawNextBlocks() {
  nextCtx.fillStyle='#111';
  nextCtx.fillRect(0,0,nextCanvas.width/20,nextCanvas.height/20);

  const blockSize = 1;
  const offsetX = 1;
  const offsetY = 1;

  nextQueue.forEach((key,index)=>{
    const tempMatrix = JSON.parse(JSON.stringify(pieces[key]));
    if(tempMatrix.length>tempMatrix[0].length) rotate(tempMatrix,1);
    const offset = {x:offsetX, y: offsetY+index*5};
    tempMatrix.forEach((row,y)=>row.forEach((value,x)=>{
      if(value!==0){
        nextCtx.fillStyle = colors[value];
        nextCtx.fillRect(x+offset.x,y+offset.y,blockSize,blockSize);
        nextCtx.strokeStyle='black';
        nextCtx.lineWidth=0.05;
        nextCtx.strokeRect(x+offset.x,y+offset.y,blockSize,blockSize);
      }
    }));
  });
}

function draw() {
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width/20,canvas.height/20);

  drawBackgroundText(ctx); // 배경 글자
  drawMatrix(arena,{x:0,y:0});
  drawGhostPiece();
  drawMatrix(player.matrix,player.pos);
  drawNextBlocks();
}

// =========================
// 게임 루프
// =========================
function update(time=0){
  if(isPaused) return;
  const deltaTime = time-lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if(dropCounter>dropInterval) playerDrop();
  draw();
  animationFrameId = requestAnimationFrame(update);
}

// =========================
// 점수
// =========================
function updateScore(){
  scoreElement.innerText='점수: '+player.score;
}

// =========================
// 게임 오버, 일시정지, 재시작
// =========================
function showGameOver(){
  document.getElementById('gameOverMessage').innerText=`Game Over! Final Score: ${player.score}`;
  document.getElementById('gameOverScreen').style.display='flex';
  cancelAnimationFrame(animationFrameId);
}

function pauseGame(){
  if(!isPaused){
    cancelAnimationFrame(animationFrameId);
    isPaused=true;
    document.getElementById('pauseOverlay').style.display='flex';
  } else {
    isPaused=false;
    document.getElementById('pauseOverlay').style.display='none';
    update();
  }
}

function initGame(){
  arena.forEach(row=>row.fill(0));
  player.score=0;
  updateScore();
  nextQueue.length=0;
  initNextQueue();
  playerReset();
  lastTime=0;
  dropCounter=0;
}

function startGame(){
  initGame();
  update();
}

function restartGame(){
  initGame();
  document.getElementById('gameOverScreen').style.display='none';
  update();
}

// =========================
// 키 입력
// =========================
document.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft') playerMove(-1);
  else if(event.key==='ArrowRight') playerMove(1);
  else if(event.key==='ArrowDown') playerDrop();
  else if(event.key==='ArrowUp') playerRotate(1);
  else if(event.key==='h'||event.key===' ') playerHardDrop();
  else if(event.key==='r') restartGame();
  else if(event.key==='p') pauseGame();
});
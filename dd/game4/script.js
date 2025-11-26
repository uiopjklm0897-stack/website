const board = document.getElementById("board");
const rows = 8;
const cols = 8;
const candyColors = ["red", "blue", "green", "yellow", "purple", "orange"];

let grid = [];
let firstSelected = null;

// ======== 보드 생성 ========
function createBoard() {
    // 1. 기존 블록 제거
    board.innerHTML = ""; // 기존 블록 제거
    grid = [];

    // 2. 8x8 그리드 생성
    board.style.display = "grid";
    board.style.gridTemplateRows = `repeat(${rows}, 50px)`;
    board.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
    grid = []; // 기존 배열 초기화

    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            const candy = document.createElement("div");
            candy.classList.add("candy");
            candy.style.backgroundColor = candyColors[Math.floor(Math.random() * candyColors.length)];
            candy.dataset.row = r;
            candy.dataset.col = c;

            candy.addEventListener("click", handleCandyClick);

            board.appendChild(candy);
            grid[r][c] = candy;
        }
    }
}

// ======== 블록 클릭 & 스와핑 ========
function handleCandyClick(e) {
    const candy = e.target;

    if (!firstSelected) {
        firstSelected = candy;
        candy.style.border = "3px solid white"; // 선택 표시
    } else {
        swapCandies(firstSelected, candy);
        firstSelected.style.border = "";
        firstSelected = null;
        setTimeout(checkMatches, 200);
    }
}

function swapCandies(c1, c2) {
    // 서로 인접한 블록만 교환 가능
    const r1 = parseInt(c1.dataset.row);
    const c1Col = parseInt(c1.dataset.col);
    const r2 = parseInt(c2.dataset.row);
    const c2Col = parseInt(c2.dataset.col);

    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1Col - c2Col);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // 색상 교환
        const tempColor = c1.style.backgroundColor;
        c1.style.backgroundColor = c2.style.backgroundColor;
        c2.style.backgroundColor = tempColor;
    }
}

// ======== 매칭 체크 ========
function checkMatches() {
    let matched = [];

    // ----- 가로 체크 -----
    for (let r = 0; r < rows; r++) {
        let count = 1;
        for (let c = 1; c < cols; c++) {
            if (grid[r][c].style.backgroundColor === grid[r][c-1].style.backgroundColor) {
                count++;
                if (c === cols -1 && count >=3) {
                    for (let k = 0; k < count; k++) matched.push(grid[r][c-k]);
                }
            } else {
                if (count >=3) {
                    for (let k = 1; k <= count; k++) matched.push(grid[r][c-k]);
                }
                count = 1;
            }
        }
    }

    // 세로 체크
    for (let c = 0; c < cols; c++) {
        let count = 1;
        for (let r = 1; r < rows; r++) {
            if (grid[r][c].style.backgroundColor === grid[r-1][c].style.backgroundColor) {
                count++;
                if (r === rows -1 && count >=3) {
                    for (let k = 0; k < count; k++) matched.push(grid[r-k][c]);
                }
            } else {
                if (count >=3) {
                    for (let k = 1; k <= count; k++) matched.push(grid[r-k][c]);
                }
                count = 1;
            }
        }
    }

    // 매칭된 블록 제거 + 새 블록 생성
    if (matched.length > 0) {
        score += matched.length * 10;
        scoreText.textContent = "점수: " + score;

        //새로운 색으로 리필
        matched.forEach(candy => {
            candy.style.backgroundColor =
                candyColors[Math.floor(Math.random() * candyColors.length)];
        });

         // 연속 매칭 체크
        setTimeout(checkMatches, 200);
    }
}

// 화면 요소 가져오기
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("end-screen");
const restartBtn = document.getElementById("restart-btn");
const timeText = document.getElementById("time-text")

// 시작 버튼 클릭
startBtn.addEventListener("click", () => {
    console.log("타이머 시작!");
    startScreen.classList.add("hidden"); // 시작 화면 숨김
    gameScreen.classList.remove("hidden"); // 게임 화면 표시

    score = 0;
    scoreText.textContent = "점수: " + score;

    createBoard(); // 게임 보드 생성
    startTimer();   // ★ 타이머 시작
});

document.addEventListener("DOMContentLoaded", () => {
    const timeText = document.getElementById("time-text");
    const startBtn = document.getElementById("start-btn");
    
    startBtn.addEventListener("click", () => {
        console.log("타이머 시작!");
        startTimer();
    });

    let timeLeft = 180;
    let timerInterval = null;

    function startTimer() {
        timeLeft = 180;
        timeText.textContent = "시간: 3:00";

        if(timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeLeft--;
            const min = Math.floor(timeLeft/60);
            const sec = timeLeft % 60;
            timeText.textContent = `시간: ${min}:${sec < 10 ? "0"+sec : sec}`;

            if(timeLeft <= 0){
                clearInterval(timerInterval);
                // endGame() 호출
            }
        }, 1000);
    }
});


// 점수 변수
let score = 0;
const scoreText = document.getElementById("score-text");

// 점수 초기화
scoreText.textContent = "점수: " + score;

restartBtn.addEventListener("click", () => {
    endScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
});

// 타이머 변수
let timeLeft = 180; // 3분(초 단위)
let timerInterval = null;

// ======== 타이머 시작 ========
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 180;
    timeText.textContent = "시간: 3:00";
    isGameOver = false;

    timerInterval = setInterval(() => {
        if (isGameOver) return;

        timeLeft--;
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        timeText.textContent = `시간: ${min}:${sec < 10 ? "0"+sec : sec}`;

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// ======== 게임 종료 ========
function endGame() {
    isGameOver = true;
    clearInterval(timerInterval);
    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
}

/* =====================================================
   MINESWEEPER
   Classic rules: first click is always safe, numbers show the
   count of mines among the 8 neighboring cells, flood-fill opens
   connected zero-cells automatically.
===================================================== */

const DIFFICULTIES = [
    { id: "beginner", name: "Dễ", rows: 9, cols: 9, mines: 10, basePoints: 500 },
    { id: "intermediate", name: "Trung bình", rows: 16, cols: 16, mines: 40, basePoints: 1000 },
    { id: "expert", name: "Khó", rows: 16, cols: 30, mines: 99, basePoints: 2000 }
];


const STORAGE_KEY = "gameHub_minesweeper_difficulty";


/* =====================================================
   STATE
===================================================== */

const state = {
    difficulty: DIFFICULTIES[0],
    board: [],
    tileEls: [],
    rows: 0,
    cols: 0,
    mines: 0,
    flagsPlaced: 0,
    revealedCount: 0,
    firstClickDone: false,
    playing: false,
    over: false,
    won: false,
    elapsed: 0,
    timerId: null,
    flagMode: false,
    soundEnabled: true,
    tileSize: 24
};


/* =====================================================
   DOM REFS
===================================================== */

const el = {
    board: document.getElementById("board"),
    boardScroll: document.getElementById("boardScroll"),
    mineCount: document.getElementById("mineCount"),
    timer: document.getElementById("timer"),
    hudDifficulty: document.getElementById("hudDifficulty"),
    difficultyList: document.getElementById("difficultyList"),
    flagModeButton: document.getElementById("flagModeButton"),
    restartButton: document.getElementById("restartButton"),
    soundButton: document.getElementById("soundButton"),
    overlay: document.getElementById("overlay"),
    overlayIcon: document.getElementById("overlayIcon"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayText: document.getElementById("overlayText"),
    overlayStats: document.getElementById("overlayStats"),
    overlayButton: document.getElementById("overlayButton")
};


/* =====================================================
   STORAGE
========================================================= */

function loadSavedDifficulty() {

    try {

        const id =
            localStorage.getItem(STORAGE_KEY);

        return (
            DIFFICULTIES.find(d => d.id === id) ||
            DIFFICULTIES[0]
        );

    } catch (e) {

        return DIFFICULTIES[0];

    }

}


function saveDifficulty() {

    localStorage.setItem(
        STORAGE_KEY,
        state.difficulty.id
    );

}


/* =====================================================
   BOARD CREATION
===================================================== */

function createEmptyBoard(rows, cols) {

    const board = [];

    for (let r = 0; r < rows; r++) {

        const row = [];

        for (let c = 0; c < cols; c++) {

            row.push({
                mine: false,
                revealed: false,
                flagged: false,
                wrongFlag: false,
                hit: false,
                adjacent: 0
            });

        }

        board.push(row);

    }

    return board;

}


function forEachNeighbor(row, col, callback) {

    for (let dr = -1; dr <= 1; dr++) {

        for (let dc = -1; dc <= 1; dc++) {

            if (dr === 0 && dc === 0) continue;

            const nr = row + dr;
            const nc = col + dc;

            if (
                nr >= 0 && nr < state.rows &&
                nc >= 0 && nc < state.cols
            ) {

                callback(nr, nc);

            }

        }

    }

}


function placeMines(safeRow, safeCol) {

    const excluded = new Set();

    excluded.add(safeRow + "," + safeCol);

    forEachNeighbor(
        safeRow,
        safeCol,
        (r, c) => excluded.add(r + "," + c)
    );

    let placed = 0;

    while (placed < state.mines) {

        const r = Math.floor(Math.random() * state.rows);
        const c = Math.floor(Math.random() * state.cols);

        const key = r + "," + c;

        if (excluded.has(key) || state.board[r][c].mine) continue;

        state.board[r][c].mine = true;

        placed++;

    }

    for (let r = 0; r < state.rows; r++) {

        for (let c = 0; c < state.cols; c++) {

            if (state.board[r][c].mine) continue;

            let count = 0;

            forEachNeighbor(
                r,
                c,
                (nr, nc) => {
                    if (state.board[nr][nc].mine) count++;
                }
            );

            state.board[r][c].adjacent = count;

        }

    }

}


/* =====================================================
   REVEAL / FLAG
===================================================== */

function floodReveal(startRow, startCol) {

    const stack = [[startRow, startCol]];

    while (stack.length) {

        const [r, c] = stack.pop();

        const cell = state.board[r][c];

        if (cell.revealed || cell.flagged) continue;

        cell.revealed = true;

        state.revealedCount++;

        renderCell(r, c);

        if (cell.adjacent === 0) {

            forEachNeighbor(
                r,
                c,
                (nr, nc) => {

                    if (!state.board[nr][nc].revealed) {
                        stack.push([nr, nc]);
                    }

                }
            );

        }

    }

}


function revealCell(row, col) {

    if (!state.playing || state.over) return;

    const cell = state.board[row][col];

    if (cell.revealed || cell.flagged) return;


    if (!state.firstClickDone) {

        placeMines(row, col);

        state.firstClickDone = true;

        startTimer();

    }


    if (cell.mine) {

        cell.revealed = true;
        cell.hit = true;

        renderCell(row, col);

        playBeep(120, .3);

        endGame(false);

        return;

    }


    floodReveal(row, col);

    playBeep(500, .03);

    updateMineCount();


    if (
        state.revealedCount >=
        (state.rows * state.cols) - state.mines
    ) {

        endGame(true);

    }

}


function toggleFlag(row, col) {

    if (!state.playing || state.over) return;

    const cell = state.board[row][col];

    if (cell.revealed) return;

    cell.flagged = !cell.flagged;

    state.flagsPlaced += cell.flagged ? 1 : -1;

    renderCell(row, col);

    updateMineCount();

    playBeep(cell.flagged ? 350 : 250, .04);

}


/* =====================================================
   TIMER
===================================================== */

function startTimer() {

    stopTimer();

    state.elapsed = 0;

    updateTimerDisplay();

    state.timerId = setInterval(() => {

        state.elapsed++;

        updateTimerDisplay();

    }, 1000);

}


function stopTimer() {

    if (state.timerId) {

        clearInterval(state.timerId);

        state.timerId = null;

    }

}


function updateTimerDisplay() {

    el.timer.textContent = state.elapsed;

}


/* =====================================================
   GAME FLOW
===================================================== */

function newGame() {

    stopTimer();

    const config = state.difficulty;

    state.rows = config.rows;
    state.cols = config.cols;
    state.mines = config.mines;

    state.board = createEmptyBoard(state.rows, state.cols);

    state.flagsPlaced = 0;
    state.revealedCount = 0;
    state.firstClickDone = false;
    state.playing = true;
    state.over = false;
    state.won = false;
    state.elapsed = 0;

    buildBoardDom();
    resizeBoard();
    updateMineCount();
    updateTimerDisplay();
    renderDifficultyList();

    hideOverlay();

}


function endGame(won) {

    state.playing = false;
    state.over = true;
    state.won = won;

    stopTimer();


    for (let r = 0; r < state.rows; r++) {

        for (let c = 0; c < state.cols; c++) {

            const cell = state.board[r][c];

            if (cell.mine) {

                // Win: flag every mine (none get marked "revealed", so
                // they stay drawn as flags, not exploded mines).
                // Loss: reveal every mine so the player sees them all.
                if (won) {

                    cell.flagged = true;

                } else if (!cell.revealed) {

                    cell.revealed = true;

                }

            } else if (cell.flagged && !won) {

                cell.wrongFlag = true;

            }

            renderCell(r, c);

        }

    }


    if (won) {

        state.flagsPlaced = state.mines;

    }

    updateMineCount();


    if (won) {

        const score = Math.max(
            50,
            state.difficulty.basePoints - state.elapsed * 2
        );

        if (typeof GameStorage !== "undefined") {

            GameStorage.setHighScore("minesweeper", score);

        }

        playBeep(880, .18);

        showOverlay(
            "🎉 Chiến thắng!",
            `Bạn đã dò xong bàn ${state.difficulty.name} trong ${state.elapsed} giây.`,
            [
                ["Thời gian", state.elapsed + "s"],
                ["Điểm", score.toLocaleString()]
            ]
        );

    } else {

        showOverlay(
            "💥 Trúng mìn!",
            `Bạn đã mở ${state.revealedCount} ô an toàn trước khi trúng mìn.`,
            [
                ["Thời gian", state.elapsed + "s"],
                ["Đã mở", state.revealedCount]
            ]
        );

    }


    el.overlayButton.textContent = "🔄 Chơi lại";

}


/* =====================================================
   DIFFICULTY
===================================================== */

function selectDifficulty(id) {

    const difficulty =
        DIFFICULTIES.find(d => d.id === id);

    if (!difficulty) return;

    state.difficulty = difficulty;

    saveDifficulty();

    el.hudDifficulty.textContent = difficulty.name;

    newGame();

}


function renderDifficultyList() {

    el.difficultyList.innerHTML = "";

    DIFFICULTIES.forEach(difficulty => {

        const button = document.createElement("button");

        button.type = "button";

        button.textContent =
            `${difficulty.name} (${difficulty.rows}×${difficulty.cols}, ${difficulty.mines} mìn)`;

        if (difficulty.id === state.difficulty.id) {

            button.classList.add("active");

        }

        button.addEventListener(
            "click",
            () => selectDifficulty(difficulty.id)
        );

        el.difficultyList.appendChild(button);

    });

}


/* =====================================================
   RENDER: BOARD DOM
===================================================== */

function buildBoardDom() {

    el.board.innerHTML = "";

    state.tileEls = [];

    for (let r = 0; r < state.rows; r++) {

        const rowEls = [];

        for (let c = 0; c < state.cols; c++) {

            const button = document.createElement("button");

            button.type = "button";
            button.className = "cell";
            button.dataset.row = r;
            button.dataset.col = c;
            button.setAttribute("aria-label", "Ô che");

            el.board.appendChild(button);

            rowEls.push(button);

        }

        state.tileEls.push(rowEls);

    }

}


function renderCell(row, col) {

    const cell = state.board[row][col];
    const button = state.tileEls[row][col];

    button.classList.remove(
        "revealed", "flagged", "mine", "mine-hit", "wrong-flag",
        "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"
    );

    button.textContent = "";


    if (cell.revealed) {

        button.classList.add("revealed");

        if (cell.mine) {

            button.classList.add(
                cell.hit ? "mine-hit" : "mine"
            );

            button.textContent = "💣";

        } else if (cell.adjacent > 0) {

            button.classList.add("n" + cell.adjacent);

            button.textContent = cell.adjacent;

        }

        button.setAttribute(
            "aria-label",
            cell.mine
                ? "Ô mìn"
                : `Ô đã mở, ${cell.adjacent} mìn xung quanh`
        );

    } else if (cell.flagged) {

        button.classList.add("flagged");

        if (cell.wrongFlag) {
            button.classList.add("wrong-flag");
        }

        button.textContent = "🚩";

        button.setAttribute("aria-label", "Ô đã cắm cờ");

    } else {

        button.setAttribute("aria-label", "Ô che");

    }

}


el.board.addEventListener("click", event => {

    const button = event.target.closest(".cell");

    if (!button) return;

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    if (state.flagMode) {

        toggleFlag(row, col);

    } else {

        revealCell(row, col);

    }

});


el.board.addEventListener("contextmenu", event => {

    const button = event.target.closest(".cell");

    if (!button) return;

    event.preventDefault();

    toggleFlag(
        Number(button.dataset.row),
        Number(button.dataset.col)
    );

});


/* =====================================================
   RESPONSIVE SIZING
===================================================== */

function resizeBoard() {

    const available = el.boardScroll.clientWidth;

    const maxTile = 36;
    const minTile = 14;

    let tileSize = maxTile;

    for (let size = maxTile; size >= minTile; size--) {

        const gap = 2;

        const width = state.cols * size + (state.cols - 1) * gap;

        if (width <= available) {

            tileSize = size;
            break;

        }

        tileSize = minTile;

    }

    state.tileSize = tileSize;

    el.board.style.gridTemplateColumns = `repeat(${state.cols}, ${tileSize}px)`;
    el.board.style.gridTemplateRows = `repeat(${state.rows}, ${tileSize}px)`;
    el.board.style.gap = "2px";

}


window.addEventListener("resize", () => {

    if (state.rows) resizeBoard();

});


/* =====================================================
   HUD
===================================================== */

function updateMineCount() {

    el.mineCount.textContent =
        state.mines - state.flagsPlaced;

}


/* =====================================================
   FLAG MODE (mobile)
===================================================== */

el.flagModeButton.addEventListener("click", () => {

    state.flagMode = !state.flagMode;

    el.flagModeButton.textContent =
        `🚩 Chế độ đặt cờ: ${state.flagMode ? "Bật" : "Tắt"}`;

    el.flagModeButton.classList.toggle("active", state.flagMode);

});


/* =====================================================
   OVERLAY
===================================================== */

function showOverlay(title, text, stats) {

    el.overlayTitle.textContent = title;
    el.overlayText.textContent = text;

    el.overlayStats.innerHTML =
        (stats || [])
            .map(([label, value]) =>
                `<div class="overlay-stat"><span>${label}</span><strong>${value}</strong></div>`
            )
            .join("");

    el.overlay.style.display = "flex";

}


function hideOverlay() {

    el.overlay.style.display = "none";

}


el.overlayButton.addEventListener("click", newGame);

el.restartButton.addEventListener("click", newGame);


/* =====================================================
   AUDIO
===================================================== */

let audioContext = null;


function playBeep(frequency, duration) {

    if (!state.soundEnabled) return;

    try {

        if (!audioContext) {

            audioContext =
                new (window.AudioContext || window.webkitAudioContext)();

        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(.03, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

    } catch (e) {

        // Web Audio not available: game keeps running silently.

    }

}


el.soundButton.addEventListener("click", () => {

    state.soundEnabled = !state.soundEnabled;

    el.soundButton.textContent =
        state.soundEnabled ? "🔊 Âm thanh" : "🔇 Tắt âm thanh";

});


/* =====================================================
   KEYBOARD
===================================================== */

document.addEventListener("keydown", event => {

    if (event.key.toLowerCase() === "r") {

        newGame();

    }

});


/* =====================================================
   INIT
===================================================== */

function init() {

    state.difficulty = loadSavedDifficulty();

    el.hudDifficulty.textContent = state.difficulty.name;

    newGame();

}


init();

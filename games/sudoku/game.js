/* =====================================================
   SUDOKU
   Generates a full solved grid via randomized backtracking, then
   removes clues one at a time - only keeping a removal if a
   solution-counting solver still finds exactly one solution - so
   every generated puzzle is guaranteed uniquely solvable.
===================================================== */

const DIFFICULTIES = [
    { id: "easy", name: "Dễ", givens: 42, basePoints: 400 },
    { id: "medium", name: "Trung bình", givens: 32, basePoints: 700 },
    { id: "hard", name: "Khó", givens: 26, basePoints: 1200 }
];


const STORAGE_KEY = "gameHub_sudoku_difficulty";


/* =====================================================
   SUDOKU RULES
===================================================== */

function isValidPlacement(grid, row, col, value) {

    for (let i = 0; i < 9; i++) {

        if (grid[row][i] === value) return false;
        if (grid[i][col] === value) return false;

    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {

        for (let c = boxCol; c < boxCol + 3; c++) {

            if (grid[r][c] === value) return false;

        }

    }

    return true;

}


function shuffledDigits() {

    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let i = digits.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [digits[i], digits[j]] = [digits[j], digits[i]];

    }

    return digits;

}


function shuffleArray(array) {

    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];

    }

    return result;

}


function createEmptyGrid() {

    return Array.from(
        { length: 9 },
        () => Array(9).fill(0)
    );

}


function findFirstEmpty(grid) {

    for (let r = 0; r < 9; r++) {

        for (let c = 0; c < 9; c++) {

            if (grid[r][c] === 0) return [r, c];

        }

    }

    return null;

}


function fillGrid(grid) {

    const pos = findFirstEmpty(grid);

    if (!pos) return true;

    const [row, col] = pos;

    for (const value of shuffledDigits()) {

        if (isValidPlacement(grid, row, col, value)) {

            grid[row][col] = value;

            if (fillGrid(grid)) return true;

            grid[row][col] = 0;

        }

    }

    return false;

}


function generateSolvedGrid() {

    const grid = createEmptyGrid();

    fillGrid(grid);

    return grid;

}


/* =====================================================
   SOLVER (used only to verify a puzzle has exactly one
   solution while generating it - picks the emptiest cell
   first so it can bail out fast on dead ends)
===================================================== */

function findMinCandidateCell(grid) {

    let best = null;

    for (let r = 0; r < 9; r++) {

        for (let c = 0; c < 9; c++) {

            if (grid[r][c] !== 0) continue;

            const candidates = [];

            for (let value = 1; value <= 9; value++) {

                if (isValidPlacement(grid, r, c, value)) {

                    candidates.push(value);

                }

            }

            if (candidates.length === 0) return [r, c, candidates];

            if (!best || candidates.length < best[2].length) {

                best = [r, c, candidates];

                if (candidates.length === 1) return best;

            }

        }

    }

    return best;

}


function countSolutions(grid, limit) {

    let count = 0;

    function solve() {

        if (count >= limit) return;

        const cell =
            findMinCandidateCell(grid);

        if (!cell) {

            count++;

            return;

        }

        const [row, col, candidates] = cell;

        for (const value of candidates) {

            if (count >= limit) return;

            grid[row][col] = value;

            solve();

            grid[row][col] = 0;

        }

    }

    solve();

    return count;

}


/* =====================================================
   PUZZLE GENERATION
===================================================== */

function generatePuzzle(targetGivens) {

    const solution = generateSolvedGrid();

    const puzzle =
        solution.map(row => row.slice());

    const positions = [];

    for (let r = 0; r < 9; r++) {

        for (let c = 0; c < 9; c++) {

            positions.push([r, c]);

        }

    }

    let givens = 81;

    for (const [r, c] of shuffleArray(positions)) {

        if (givens <= targetGivens) break;

        const backup = puzzle[r][c];

        puzzle[r][c] = 0;

        const testGrid =
            puzzle.map(row => row.slice());

        const solutions =
            countSolutions(testGrid, 2);

        if (solutions === 1) {

            givens--;

        } else {

            puzzle[r][c] = backup;

        }

    }

    return { puzzle, solution };

}


/* =====================================================
   STATE
===================================================== */

const state = {
    difficulty: DIFFICULTIES[0],
    puzzle: [],
    solution: [],
    board: [],
    tileEls: [],
    selected: null,
    hints: 3,
    mistakes: 0,
    playing: false,
    over: false,
    won: false,
    elapsed: 0,
    timerId: null,
    soundEnabled: true
};


/* =====================================================
   DOM REFS
===================================================== */

const el = {
    board: document.getElementById("board"),
    boardScroll: document.getElementById("boardScroll"),
    numberPad: document.getElementById("numberPad"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistakeCount"),
    hintCount: document.getElementById("hintCount"),
    difficultyList: document.getElementById("difficultyList"),
    hintButton: document.getElementById("hintButton"),
    restartButton: document.getElementById("restartButton"),
    soundButton: document.getElementById("soundButton"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayText: document.getElementById("overlayText"),
    overlayStats: document.getElementById("overlayStats"),
    overlayButton: document.getElementById("overlayButton")
};


/* =====================================================
   STORAGE
===================================================== */

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
   GAME FLOW
===================================================== */

function newGame() {

    stopTimer();

    const { puzzle, solution } =
        generatePuzzle(state.difficulty.givens);

    state.puzzle = puzzle;
    state.solution = solution;
    state.board = puzzle.map(row => row.slice());

    state.selected = null;
    state.hints = 3;
    state.mistakes = 0;
    state.elapsed = 0;
    state.playing = true;
    state.over = false;
    state.won = false;

    buildBoardDom();
    resizeBoard();
    renderAll();
    updateStats();
    renderDifficultyList();
    startTimer();

    hideOverlay();

}


function endGame(won) {

    state.playing = false;
    state.over = true;
    state.won = won;

    stopTimer();


    if (won) {

        const score =
            Math.max(
                50,
                state.difficulty.basePoints -
                state.elapsed * 2 -
                state.mistakes * 10
            );

        if (typeof GameStorage !== "undefined") {

            GameStorage.setHighScore("sudoku", score);

        }

        playBeep(880, .18);

        showOverlay(
            "🎉 Hoàn thành!",
            `Bạn đã giải xong độ khó ${state.difficulty.name} trong ${state.elapsed} giây, ${state.mistakes} lỗi.`,
            [
                ["Thời gian", state.elapsed + "s"],
                ["Điểm", score.toLocaleString()]
            ]
        );

        el.overlayButton.textContent = "🔄 Ván mới";

    }

}


/* =====================================================
   SELECTION / INPUT
===================================================== */

function selectCell(row, col) {

    if (!state.playing || state.over) return;

    state.selected = { row, col };

    renderAll();

}


function inputNumber(value) {

    if (!state.playing || state.over || !state.selected) return;

    const { row, col } = state.selected;

    if (state.puzzle[row][col] !== 0) return;

    state.board[row][col] = value;

    if (value !== 0) {

        if (value !== state.solution[row][col]) {

            state.mistakes++;

            playBeep(180, .08);

        } else {

            playBeep(500, .04);

        }

    }

    renderAll();
    updateStats();
    checkWin();

}


function checkWin() {

    for (let r = 0; r < 9; r++) {

        for (let c = 0; c < 9; c++) {

            if (
                state.board[r][c] === 0 ||
                state.board[r][c] !== state.solution[r][c]
            ) {

                return;

            }

        }

    }

    endGame(true);

}


/* =====================================================
   HINT
===================================================== */

function useHint() {

    if (!state.playing || state.over || state.hints <= 0) return;

    const candidates = [];

    for (let r = 0; r < 9; r++) {

        for (let c = 0; c < 9; c++) {

            if (
                state.puzzle[r][c] === 0 &&
                state.board[r][c] !== state.solution[r][c]
            ) {

                candidates.push([r, c]);

            }

        }

    }

    if (!candidates.length) return;

    const [row, col] =
        candidates[Math.floor(Math.random() * candidates.length)];

    state.board[row][col] = state.solution[row][col];

    state.hints--;

    playBeep(650, .08);

    renderAll();
    updateStats();
    checkWin();

}


el.hintButton.addEventListener("click", useHint);


/* =====================================================
   DIFFICULTY
===================================================== */

function selectDifficulty(id) {

    const difficulty =
        DIFFICULTIES.find(d => d.id === id);

    if (!difficulty) return;

    state.difficulty = difficulty;

    saveDifficulty();

    newGame();

}


function renderDifficultyList() {

    el.difficultyList.innerHTML = "";

    DIFFICULTIES.forEach(difficulty => {

        const button = document.createElement("button");

        button.type = "button";

        button.textContent =
            `${difficulty.name} (${difficulty.givens} ô cho sẵn)`;

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

    for (let r = 0; r < 9; r++) {

        const rowEls = [];

        for (let c = 0; c < 9; c++) {

            const button = document.createElement("button");

            button.type = "button";
            button.className = "cell";
            button.dataset.row = r;
            button.dataset.col = c;

            if (c === 2 || c === 5) {
                button.classList.add("box-right");
            }

            if (r === 2 || r === 5) {
                button.classList.add("box-bottom");
            }

            el.board.appendChild(button);

            rowEls.push(button);

        }

        state.tileEls.push(rowEls);

    }

}


function renderAll() {

    for (let r = 0; r < 9; r++) {

        for (let c = 0; c < 9; c++) {

            renderCell(r, c);

        }

    }

}


function renderCell(row, col) {

    const button = state.tileEls[row][col];

    const value = state.board[row][col];

    const isGiven = state.puzzle[row][col] !== 0;

    const isError =
        value !== 0 &&
        value !== state.solution[row][col];

    button.textContent =
        value === 0 ? "" : value;

    button.classList.toggle("given", isGiven);
    button.classList.toggle("error", isError);


    let isSelected = false;
    let isPeer = false;
    let isSameValue = false;

    if (state.selected) {

        const sel = state.selected;

        isSelected =
            sel.row === row &&
            sel.col === col;

        const sameRow = sel.row === row;
        const sameCol = sel.col === col;

        const sameBox =
            Math.floor(sel.row / 3) === Math.floor(row / 3) &&
            Math.floor(sel.col / 3) === Math.floor(col / 3);

        isPeer =
            !isSelected &&
            (sameRow || sameCol || sameBox);

        const selectedValue =
            state.board[sel.row][sel.col];

        isSameValue =
            !isSelected &&
            selectedValue !== 0 &&
            value === selectedValue;

    }

    button.classList.toggle("selected", isSelected);
    button.classList.toggle("peer", isPeer);
    button.classList.toggle("same-value", isSameValue);

}


el.board.addEventListener("click", event => {

    const button = event.target.closest(".cell");

    if (!button) return;

    selectCell(
        Number(button.dataset.row),
        Number(button.dataset.col)
    );

});


el.numberPad.addEventListener("click", event => {

    const button = event.target.closest("button[data-number]");

    if (!button) return;

    inputNumber(Number(button.dataset.number));

});


/* =====================================================
   KEYBOARD
===================================================== */

function moveSelection(dr, dc) {

    if (!state.playing || state.over) return;

    if (!state.selected) {

        selectCell(0, 0);

        return;

    }

    const row =
        Math.min(8, Math.max(0, state.selected.row + dr));

    const col =
        Math.min(8, Math.max(0, state.selected.col + dc));

    selectCell(row, col);

}


document.addEventListener("keydown", event => {

    if (event.key >= "1" && event.key <= "9") {

        inputNumber(Number(event.key));

    } else if (
        event.key === "0" ||
        event.key === "Backspace" ||
        event.key === "Delete"
    ) {

        inputNumber(0);

    } else if (event.key === "ArrowUp") {

        moveSelection(-1, 0);

    } else if (event.key === "ArrowDown") {

        moveSelection(1, 0);

    } else if (event.key === "ArrowLeft") {

        moveSelection(0, -1);

    } else if (event.key === "ArrowRight") {

        moveSelection(0, 1);

    }

});


/* =====================================================
   RESPONSIVE SIZING
===================================================== */

function resizeBoard() {

    const available = el.boardScroll.clientWidth;

    const maxTile = 48;
    const minTile = 24;

    let tileSize = maxTile;

    for (let size = maxTile; size >= minTile; size--) {

        if (size * 9 <= available) {

            tileSize = size;
            break;

        }

        tileSize = minTile;

    }

    el.board.style.gridTemplateColumns = `repeat(9, ${tileSize}px)`;
    el.board.style.gridTemplateRows = `repeat(9, ${tileSize}px)`;

}


window.addEventListener("resize", () => {

    if (state.tileEls.length) resizeBoard();

});


/* =====================================================
   TIMER
===================================================== */

function startTimer() {

    stopTimer();

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
   STATS
===================================================== */

function updateStats() {

    el.mistakeCount.textContent = state.mistakes;

    el.hintCount.textContent = state.hints;

    el.hintButton.disabled = state.hints <= 0;

}


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
   INIT
===================================================== */

function init() {

    state.difficulty = loadSavedDifficulty();

    newGame();

}


init();

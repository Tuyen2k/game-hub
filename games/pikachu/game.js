/* =====================================================
   PIKACHU CONNECT
   Onet-style pair matching with BFS path finding
   Data-driven levels: gameplay never branches on level id,
   it only reads numbers out of LEVELS / ICONS below.
===================================================== */


/* =====================================================
   LEVEL CONFIG
   Adding level 21, 22, ... 100 later only means pushing
   more entries here. Nothing else in this file needs to
   change (see isLastLevel / LEVELS.length usage below).
===================================================== */

const LEVELS = [
    { id: 1, name: "Beginner", rows: 6, cols: 6, time: 70, hints: 3, shuffles: 2, iconCount: 6 },
    { id: 2, name: "Warm Up", rows: 6, cols: 8, time: 80, hints: 3, shuffles: 2, iconCount: 7 },
    { id: 3, name: "Little Maze", rows: 7, cols: 8, time: 85, hints: 3, shuffles: 2, iconCount: 8 },
    { id: 4, name: "Quick Match", rows: 8, cols: 8, time: 90, hints: 3, shuffles: 2, iconCount: 8 },
    { id: 5, name: "Color Storm", rows: 8, cols: 10, time: 100, hints: 3, shuffles: 2, iconCount: 9 },
    { id: 6, name: "Hard Road", rows: 9, cols: 10, time: 105, hints: 3, shuffles: 2, iconCount: 10 },
    { id: 7, name: "Fast Hands", rows: 10, cols: 10, time: 110, hints: 3, shuffles: 2, iconCount: 10 },
    { id: 8, name: "Expert", rows: 10, cols: 12, time: 120, hints: 3, shuffles: 2, iconCount: 11 },
    { id: 9, name: "Master", rows: 12, cols: 12, time: 135, hints: 3, shuffles: 2, iconCount: 12 },
    { id: 10, name: "Final Stage I", rows: 12, cols: 14, time: 150, hints: 3, shuffles: 2, iconCount: 12 },
    { id: 11, name: "Advanced I", rows: 10, cols: 14, time: 140, hints: 3, shuffles: 2, iconCount: 14 },
    { id: 12, name: "Advanced II", rows: 12, cols: 14, time: 145, hints: 3, shuffles: 2, iconCount: 14 },
    { id: 13, name: "Challenge I", rows: 12, cols: 16, time: 155, hints: 2, shuffles: 2, iconCount: 15 },
    { id: 14, name: "Challenge II", rows: 14, cols: 16, time: 165, hints: 2, shuffles: 2, iconCount: 16 },
    { id: 15, name: "Nightmare I", rows: 14, cols: 16, time: 170, hints: 2, shuffles: 1, iconCount: 16 },
    { id: 16, name: "Nightmare II", rows: 14, cols: 18, time: 180, hints: 2, shuffles: 1, iconCount: 17 },
    { id: 17, name: "Master Challenge", rows: 16, cols: 18, time: 190, hints: 2, shuffles: 1, iconCount: 18 },
    { id: 18, name: "Ultimate", rows: 16, cols: 18, time: 200, hints: 1, shuffles: 1, iconCount: 18 },
    { id: 19, name: "Legend", rows: 18, cols: 20, time: 220, hints: 1, shuffles: 1, iconCount: 18 },
    { id: 20, name: "Grand Master", rows: 18, cols: 20, time: 240, hints: 1, shuffles: 1, iconCount: 18 }
];


const ICONS = [
    "🐱", "🐶", "🐼", "🐸", "🐯", "🦊",
    "🐰", "🐨", "🐵", "🐙", "🦄", "🐷",
    "🐮", "🐹", "🐻", "🐥", "🦋", "🐢"
];


const ICON_LABELS = {
    "🐱": "mèo", "🐶": "chó", "🐼": "gấu trúc", "🐸": "ếch",
    "🐯": "hổ", "🦊": "cáo", "🐰": "thỏ", "🐨": "gấu koala",
    "🐵": "khỉ", "🐙": "bạch tuộc", "🦄": "kỳ lân", "🐷": "heo",
    "🐮": "bò", "🐹": "chuột hamster", "🐻": "gấu", "🐥": "gà con",
    "🦋": "bươm bướm", "🐢": "rùa"
};


const STORAGE_KEY = "gameHub_pikachu_progress";


/* =====================================================
   STATE
===================================================== */

const state = {
    level: 1,
    unlocked: 1,
    score: 0,
    levelScore: 0,
    combo: 0,
    time: 0,
    initialTime: 0,
    hints: 3,
    shuffles: 2,
    selected: null,
    board: [],
    rows: 6,
    cols: 6,
    playing: false,
    paused: false,
    matchedPairs: 0,
    totalPairs: 0,
    starsByLevel: {},
    soundEnabled: true,
    overlayMode: "start",
    tileEls: [],
    tileSize: 24,
    gap: 4,
    unit: 28,
    timerId: null,
    pendingTimeouts: []
};


/* =====================================================
   DOM REFS
===================================================== */

const el = {
    board: document.getElementById("board"),
    boardStage: document.getElementById("boardStage"),
    boardScroll: document.getElementById("boardScroll"),
    canvas: document.getElementById("lineCanvas"),
    hudLevel: document.getElementById("hudLevel"),
    hudScore: document.getElementById("hudScore"),
    hudTime: document.getElementById("hudTime"),
    hudTimeWrap: document.getElementById("hudTimeWrap"),
    hudCombo: document.getElementById("hudCombo"),
    hudStars: document.getElementById("hudStars"),
    deadlockBanner: document.getElementById("deadlockBanner"),
    levelId: document.getElementById("levelId"),
    levelName: document.getElementById("levelName"),
    hintButton: document.getElementById("hintButton"),
    hintCount: document.getElementById("hintCount"),
    shuffleButton: document.getElementById("shuffleButton"),
    shuffleCount: document.getElementById("shuffleCount"),
    progressLabel: document.getElementById("progressLabel"),
    progressFill: document.getElementById("progressFill"),
    pauseButton: document.getElementById("pauseButton"),
    restartButton: document.getElementById("restartButton"),
    soundButton: document.getElementById("soundButton"),
    levelGrid: document.getElementById("levelGrid"),
    resetProgressButton: document.getElementById("resetProgressButton"),
    overlay: document.getElementById("overlay"),
    overlayIcon: document.getElementById("overlayIcon"),
    overlayLevelLabel: document.getElementById("overlayLevelLabel"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayText: document.getElementById("overlayText"),
    overlayStars: document.getElementById("overlayStars"),
    overlayStats: document.getElementById("overlayStats"),
    overlayPrimaryButton: document.getElementById("overlayPrimaryButton"),
    overlaySecondaryButton: document.getElementById("overlaySecondaryButton")
};


const ctx = el.canvas.getContext("2d");


/* =====================================================
   PROGRESS (localStorage)
===================================================== */

function defaultProgress() {
    return { level: 1, unlocked: 1, score: 0, stars: {} };
}


function loadProgress() {

    try {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return defaultProgress();

        const data = JSON.parse(raw);

        return {
            level: clamp(Number(data.level) || 1, 1, LEVELS.length),
            unlocked: clamp(Number(data.unlocked) || 1, 1, LEVELS.length),
            score: Number(data.score) || 0,
            stars: (data.stars && typeof data.stars === "object") ? data.stars : {}
        };

    } catch (e) {

        return defaultProgress();

    }

}


function saveProgress() {

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        level: state.level,
        unlocked: state.unlocked,
        score: state.score,
        stars: state.starsByLevel
    }));

    GameStorage.setHighScore("pikachu", state.score);

}


function resetAllProgress() {

    const ok = confirm("Bạn có chắc muốn xóa toàn bộ tiến trình Pikachu?");

    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);

    location.reload();

}


/* =====================================================
   HELPERS
===================================================== */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


function getConfig(levelId) {
    return LEVELS[levelId - 1];
}


function isLastLevel(levelId) {
    return levelId >= LEVELS.length;
}


function shuffleArray(array) {

    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];

    }

    return result;

}


/* =====================================================
   BOARD GENERATION

   Rules enforced here (see section 35 of the spec):
   - tile count is always even (rows*cols for every level
     in LEVELS is even by construction)
   - every icon used forms complete pairs, no singles
   - at least one matching pair must be immediately
     connectable, otherwise we reshuffle (bounded retries)
     and, as a last resort, force one pair adjacent so the
     loop can never spin forever.
===================================================== */

function buildIconPool(config) {

    const totalTiles = config.rows * config.cols;

    const pairs = totalTiles / 2;

    const iconPool = ICONS.slice(0, config.iconCount);

    const icons = [];

    for (let p = 0; p < pairs; p++) {

        const icon = iconPool[p % iconPool.length];

        icons.push(icon, icon);

    }

    return icons;

}


function layoutToGrid(icons, rows, cols) {

    const board = [];

    let index = 0;

    for (let r = 0; r < rows; r++) {

        const row = [];

        for (let c = 0; c < cols; c++) {

            row.push({ icon: icons[index], row: r, col: c });

            index++;

        }

        board.push(row);

    }

    return board;

}


function forceOneAdjacentPair(board, rows, cols) {

    // Deterministic fallback: guarantees a 0-turn pair exists
    // without ever needing another random attempt.
    const first = board[0][0];

    const partnerPos = findIconPosition(board, rows, cols, first.icon, 0, 0);

    if (!partnerPos) return;

    const target = { row: 0, col: cols > 1 ? 1 : 0 };

    if (target.row === partnerPos.row && target.col === partnerPos.col) return;

    const temp = board[target.row][target.col];

    board[target.row][target.col] = board[partnerPos.row][partnerPos.col];

    board[target.row][target.col].row = target.row;

    board[target.row][target.col].col = target.col;

    board[partnerPos.row][partnerPos.col] = temp;

    temp.row = partnerPos.row;

    temp.col = partnerPos.col;

}


function findIconPosition(board, rows, cols, icon, skipRow, skipCol) {

    for (let r = 0; r < rows; r++) {

        for (let c = 0; c < cols; c++) {

            if (r === skipRow && c === skipCol) continue;

            if (board[r][c] && board[r][c].icon === icon) return { row: r, col: c };

        }

    }

    return null;

}


function createBoard(config) {

    const icons = buildIconPool(config);

    const MAX_ATTEMPTS = 40;

    let board = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

        board = layoutToGrid(shuffleArray(icons), config.rows, config.cols);

        if (findAvailablePair(board, config.rows, config.cols)) {

            return board;

        }

    }

    // Extremely unlikely fallback: force a guaranteed adjacent pair.
    forceOneAdjacentPair(board, config.rows, config.cols);

    return board;

}


/* =====================================================
   PATH FINDING (BFS, state = row, col, direction, turns)

   The board is treated as if padded by one extra ring of
   always-open cells all around it (rows+2 by cols+2), which
   is what lets a connection travel outside the visible
   board edge. A cell is "open" (walkable) when it is empty
   (tile already removed) or when it lies in that outer ring.

   We search level by level: all reachable cells using 0
   turns are expanded first, then all cells reachable with
   exactly 1 turn, then with exactly 2. Because a state is
   keyed by (row, col, direction) and marked visited the
   first time it is reached, and levels are processed in
   non-decreasing turn order, the first time we see a state
   is guaranteed to be with the minimum number of turns - so
   we never wrongly block a low-turn arrival behind a
   higher-turn one that happened to reach the same cell.
===================================================== */

const DIRECTIONS = [
    { dr: -1, dc: 0, name: "UP" },
    { dr: 1, dc: 0, name: "DOWN" },
    { dr: 0, dc: -1, name: "LEFT" },
    { dr: 0, dc: 1, name: "RIGHT" }
];


function isOpenCell(board, rows, cols, r, c) {

    if (r < -1 || r > rows || c < -1 || c > cols) return false;

    if (r < 0 || r >= rows || c < 0 || c >= cols) return true; // outer padding ring

    return board[r][c] === null;

}


function findPath(board, rows, cols, a, b) {

    if (a.row === b.row && a.col === b.col) return null;

    const visited = new Set();

    let frontier = [];


    // Level 0: step out of tile A in each of the 4 directions.
    for (let d = 0; d < 4; d++) {

        const nr = a.row + DIRECTIONS[d].dr;
        const nc = a.col + DIRECTIONS[d].dc;

        if (nr === b.row && nc === b.col) {

            return [[a.row, a.col], [b.row, b.col]];

        }

        if (isOpenCell(board, rows, cols, nr, nc)) {

            const key = nr + "," + nc + "," + d;

            if (!visited.has(key)) {

                visited.add(key);

                frontier.push({ r: nr, c: nc, dir: d, corners: [] });

            }

        }

    }


    for (let turns = 0; turns <= 2; turns++) {

        // Exhaust every straight-line move available at this turn count.
        let i = 0;

        while (i < frontier.length) {

            const cur = frontier[i++];

            const dir = DIRECTIONS[cur.dir];

            const nr = cur.r + dir.dr;
            const nc = cur.c + dir.dc;

            if (nr === b.row && nc === b.col) {

                return [[a.row, a.col], ...cur.corners, [b.row, b.col]];

            }

            if (isOpenCell(board, rows, cols, nr, nc)) {

                const key = nr + "," + nc + "," + cur.dir;

                if (!visited.has(key)) {

                    visited.add(key);

                    frontier.push({ r: nr, c: nc, dir: cur.dir, corners: cur.corners });

                }

            }

        }


        if (turns === 2) break; // no more turns allowed


        // Build the next turn-level by trying every other direction.
        const next = [];

        for (const cur of frontier) {

            for (let d = 0; d < 4; d++) {

                if (d === cur.dir) continue;

                const dir = DIRECTIONS[d];

                const nr = cur.r + dir.dr;
                const nc = cur.c + dir.dc;

                if (nr === b.row && nc === b.col) {

                    return [[a.row, a.col], ...cur.corners, [cur.r, cur.c], [b.row, b.col]];

                }

                if (isOpenCell(board, rows, cols, nr, nc)) {

                    const key = nr + "," + nc + "," + d;

                    if (!visited.has(key)) {

                        visited.add(key);

                        next.push({
                            r: nr,
                            c: nc,
                            dir: d,
                            corners: [...cur.corners, [cur.r, cur.c]]
                        });

                    }

                }

            }

        }

        frontier = next;

    }

    return null;

}


function findAvailablePair(board, rows, cols) {

    const groups = new Map();

    for (let r = 0; r < rows; r++) {

        for (let c = 0; c < cols; c++) {

            const tile = board[r][c];

            if (!tile) continue;

            if (!groups.has(tile.icon)) groups.set(tile.icon, []);

            groups.get(tile.icon).push({ row: r, col: c });

        }

    }

    for (const positions of groups.values()) {

        for (let i = 0; i < positions.length; i++) {

            for (let j = i + 1; j < positions.length; j++) {

                const path = findPath(board, rows, cols, positions[i], positions[j]);

                if (path) return { a: positions[i], b: positions[j], path };

            }

        }

    }

    return null;

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

            const tile = state.board[r][c];

            const button = document.createElement("button");

            button.type = "button";
            button.className = "tile";
            button.dataset.row = r;
            button.dataset.col = c;

            if (tile) {

                button.textContent = tile.icon;
                button.setAttribute("aria-label", "Ô " + (ICON_LABELS[tile.icon] || tile.icon));

            } else {

                button.classList.add("removed");
                button.setAttribute("aria-hidden", "true");
                button.disabled = true;

            }

            el.board.appendChild(button);

            rowEls.push(button);

        }

        state.tileEls.push(rowEls);

    }

}


function refreshTileIcons() {

    for (let r = 0; r < state.rows; r++) {

        for (let c = 0; c < state.cols; c++) {

            const tile = state.board[r][c];
            const button = state.tileEls[r][c];

            if (tile) {

                button.textContent = tile.icon;
                button.setAttribute("aria-label", "Ô " + (ICON_LABELS[tile.icon] || tile.icon));

            }

        }

    }

}


el.board.addEventListener("click", event => {

    const button = event.target.closest(".tile");

    if (!button || button.disabled) return;

    onTileClick(Number(button.dataset.row), Number(button.dataset.col));

});


/* =====================================================
   RESPONSIVE SIZING
===================================================== */

function resizeBoardAndCanvas() {

    const available = el.boardScroll.clientWidth;

    const maxTile = 44;
    const minTile = 14;

    const gapFor = size => (size >= 26 ? 6 : size >= 18 ? 4 : 2);

    let tileSize = maxTile;

    for (let size = maxTile; size >= minTile; size--) {

        const gap = gapFor(size);

        const width = state.cols * size + (state.cols - 1) * gap;

        if (width <= available) {

            tileSize = size;
            break;

        }

        tileSize = minTile;

    }

    const gap = gapFor(tileSize);
    const unit = tileSize + gap;

    state.tileSize = tileSize;
    state.gap = gap;
    state.unit = unit;

    el.board.style.gridTemplateColumns = `repeat(${state.cols}, ${tileSize}px)`;
    el.board.style.gridTemplateRows = `repeat(${state.rows}, ${tileSize}px)`;
    el.board.style.gap = `${gap}px`;

    el.boardStage.style.padding = `${unit}px`;

    const stageWidth = el.boardStage.offsetWidth;
    const stageHeight = el.boardStage.offsetHeight;

    el.canvas.width = stageWidth;
    el.canvas.height = stageHeight;
    el.canvas.style.width = stageWidth + "px";
    el.canvas.style.height = stageHeight + "px";

}


window.addEventListener("resize", () => {

    if (state.rows) resizeBoardAndCanvas();

});


/* =====================================================
   CONNECTION LINE (canvas)
===================================================== */

function cellCenter(row, col) {

    const x = state.unit + col * (state.tileSize + state.gap) + state.tileSize / 2;
    const y = state.unit + row * (state.tileSize + state.gap) + state.tileSize / 2;

    return [x, y];

}


function drawConnectionLine(path) {

    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);

    if (!path || path.length < 2) return;

    ctx.save();

    ctx.strokeStyle = "#ffd45a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(255, 212, 90, .85)";
    ctx.shadowBlur = 10;

    ctx.beginPath();

    path.forEach((point, index) => {

        const [x, y] = cellCenter(point[0], point[1]);

        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

    });

    ctx.stroke();

    ctx.restore();

}


function clearConnectionLine() {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
}


/* =====================================================
   TILE VISUAL STATE HELPERS
===================================================== */

function setTileClass(row, col, className, on) {

    const button = state.tileEls[row] && state.tileEls[row][col];

    if (!button) return;

    button.classList.toggle(className, on);

}


function clearSelection() {

    if (state.selected) {

        setTileClass(state.selected.row, state.selected.col, "selected", false);

    }

    state.selected = null;

}


/* =====================================================
   INTERACTION
===================================================== */

function onTileClick(row, col) {

    if (!state.playing || state.paused) return;

    const tile = state.board[row][col];

    if (!tile) return;


    if (state.selected && state.selected.row === row && state.selected.col === col) {

        clearSelection();

        return;

    }


    if (!state.selected) {

        state.selected = { row, col };

        setTileClass(row, col, "selected", true);

        playBeep(420, .04);

        return;

    }


    const first = state.selected;
    const firstTile = state.board[first.row][first.col];

    if (firstTile.icon !== tile.icon) {

        // Different symbol: just move the selection, not a failed match.
        clearSelection();

        state.selected = { row, col };

        setTileClass(row, col, "selected", true);

        playBeep(420, .04);

        return;

    }


    const path = findPath(state.board, state.rows, state.cols, first, { row, col });

    if (path) {

        resolveMatch(first, { row, col }, path);

    } else {

        failMatch(first, { row, col });

    }

}


function failMatch(a, b) {

    state.combo = 0;

    updateHud();

    setTileClass(a.row, a.col, "shake", true);
    setTileClass(b.row, b.col, "shake", true);

    playBeep(160, .12);

    const timeoutId = setTimeout(() => {

        setTileClass(a.row, a.col, "shake", false);
        setTileClass(b.row, b.col, "shake", false);

    }, 320);

    trackTimeout(timeoutId);

    clearSelection();

}


function resolveMatch(a, b, path) {

    clearSelection();

    drawConnectionLine(path);

    // Commit the board/score state immediately, not inside the timeout
    // below. Otherwise these two cells stay "occupied" for 230ms while
    // only *looking* gone, so a click, Hint, or Shuffle fired during that
    // window can still see and touch them - e.g. Shuffle would fold them
    // into its icon pool and the deferred null-out below would then wipe
    // out whatever tile ended up at these coordinates, orphaning its real
    // partner elsewhere on the board. Only the purely cosmetic cleanup
    // (fade-out class, disabling the buttons) is deferred.
    state.board[a.row][a.col] = null;
    state.board[b.row][b.col] = null;

    state.matchedPairs++;

    setTileClass(a.row, a.col, "matched", true);
    setTileClass(b.row, b.col, "matched", true);

    state.combo++;

    const points = 100 + (state.combo - 1) * 25;

    state.levelScore += points;
    state.score += points;

    playBeep(650 + state.combo * 40, .1);

    updateHud();


    const timeoutId = setTimeout(() => {

        setTileClass(a.row, a.col, "removed", true);
        setTileClass(b.row, b.col, "removed", true);

        state.tileEls[a.row][a.col].disabled = true;
        state.tileEls[b.row][b.col].disabled = true;

        clearConnectionLine();

        if (state.matchedPairs >= state.totalPairs) {

            finishLevel();

        } else {

            checkDeadlock();

        }

    }, 230);

    trackTimeout(timeoutId);

}


function trackTimeout(id) {
    state.pendingTimeouts.push(id);
}


function clearPendingTimeouts() {

    state.pendingTimeouts.forEach(id => clearTimeout(id));

    state.pendingTimeouts = [];

}


/* =====================================================
   DEADLOCK HANDLING
===================================================== */

function checkDeadlock() {

    if (!state.playing || state.paused) return;

    if (state.matchedPairs >= state.totalPairs) return;

    const pair = findAvailablePair(state.board, state.rows, state.cols);

    if (pair) {

        el.deadlockBanner.classList.add("hidden");

        return;

    }

    if (state.shuffles > 0) {

        el.deadlockBanner.classList.add("hidden");

        shuffleBoard(true);

    } else {

        el.deadlockBanner.classList.remove("hidden");

    }

}


/* =====================================================
   HINT
===================================================== */

function useHint() {

    if (!state.playing || state.paused) return;

    const pair = findAvailablePair(state.board, state.rows, state.cols);

    if (!pair) {

        checkDeadlock();

        return;

    }

    if (state.hints <= 0) return;

    state.hints--;

    updateHud();

    setTileClass(pair.a.row, pair.a.col, "hint", true);
    setTileClass(pair.b.row, pair.b.col, "hint", true);

    const timeoutId = setTimeout(() => {

        setTileClass(pair.a.row, pair.a.col, "hint", false);
        setTileClass(pair.b.row, pair.b.col, "hint", false);

    }, 1800);

    trackTimeout(timeoutId);

}


/* =====================================================
   SHUFFLE

   Only the icons of tiles still on the board are permuted;
   removed tiles stay removed, selection/combo reset, and
   we re-check solvability the same way the initial board
   generation does before committing to the new layout.
===================================================== */

function shuffleBoard(isAuto) {

    if (!state.playing || state.paused) return;

    if (!isAuto && state.shuffles <= 0) return;

    if (!isAuto) state.shuffles--;
    else state.shuffles = Math.max(0, state.shuffles - 1);

    const positions = [];
    const icons = [];

    for (let r = 0; r < state.rows; r++) {

        for (let c = 0; c < state.cols; c++) {

            if (state.board[r][c]) {

                positions.push({ r, c });
                icons.push(state.board[r][c].icon);

            }

        }

    }

    const MAX_ATTEMPTS = 40;
    let shuffled = icons;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

        shuffled = shuffleArray(icons);

        applyShuffle(positions, shuffled);

        if (findAvailablePair(state.board, state.rows, state.cols)) break;

    }

    clearSelection();

    state.combo = 0;

    refreshTileIcons();
    updateHud();

    playBeep(300, .08);

    checkDeadlock();

}


function applyShuffle(positions, icons) {

    positions.forEach((pos, index) => {

        state.board[pos.r][pos.c].icon = icons[index];

    });

}


/* =====================================================
   SCORE / STARS
===================================================== */

function computeStars(remaining, initial) {

    if (initial <= 0) return 3;

    const ratio = remaining / initial;

    if (ratio >= 0.5) return 3;
    if (ratio >= 0.22) return 2;

    return 1;

}


function starGlyphs(count) {
    return "★".repeat(count) + "☆".repeat(3 - count);
}


/* =====================================================
   TIMER
===================================================== */

function startTimer() {

    stopTimer();

    state.timerId = setInterval(() => {

        if (!state.playing || state.paused) return;

        state.time--;

        updateTimerDisplay();

        if (state.time <= 0) {

            state.time = 0;

            updateTimerDisplay();

            gameOver();

        }

    }, 1000);

}


function stopTimer() {

    if (state.timerId) {

        clearInterval(state.timerId);

        state.timerId = null;

    }

}


function updateTimerDisplay() {

    el.hudTime.textContent = state.time;

    const warning = state.initialTime > 0 && state.time <= Math.max(10, Math.floor(state.initialTime * 0.15));

    el.hudTimeWrap.classList.toggle("time-warning", warning);

}


/* =====================================================
   LEVEL FLOW
===================================================== */

function startLevel(levelId) {

    clearPendingTimeouts();

    stopTimer();

    const config = getConfig(levelId);

    state.level = levelId;
    state.rows = config.rows;
    state.cols = config.cols;
    state.hints = config.hints;
    state.shuffles = config.shuffles;
    state.time = config.time;
    state.initialTime = config.time;
    state.combo = 0;
    state.levelScore = 0;
    state.matchedPairs = 0;
    state.totalPairs = (config.rows * config.cols) / 2;
    state.selected = null;
    state.playing = true;
    state.paused = false;
    state.overlayMode = "playing";

    state.board = createBoard(config);

    buildBoardDom();
    resizeBoardAndCanvas();
    clearConnectionLine();

    el.deadlockBanner.classList.add("hidden");

    el.levelId.textContent = levelId;
    el.levelName.textContent = `${config.name} · ${config.rows} × ${config.cols}`;

    el.pauseButton.textContent = "Ⅱ Tạm dừng";

    updateHud();
    renderLevelGrid();
    hideOverlay();
    startTimer();

    saveProgress();

}


function restartLevel() {
    startLevel(state.level);
}


function chooseLevel(levelId) {

    const progress = loadProgress();

    if (levelId > progress.unlocked) return;

    startLevel(levelId);

}


function finishLevel() {

    if (!state.playing) return;

    state.playing = false;

    stopTimer();

    const stars = computeStars(state.time, state.initialTime);

    const timeBonus = state.time * 10 * stars;

    state.levelScore += timeBonus;
    state.score += timeBonus;

    state.starsByLevel[state.level] = Math.max(state.starsByLevel[state.level] || 0, stars);

    if (!isLastLevel(state.level)) {

        state.unlocked = Math.max(state.unlocked, state.level + 1);

    }

    saveProgress();
    updateHud();
    renderLevelGrid();

    playBeep(880, .18);

    if (isLastLevel(state.level)) {

        showFinalVictory(stars, timeBonus);

    } else {

        showLevelClear(stars, timeBonus);

    }

}


function gameOver() {

    state.playing = false;

    stopTimer();

    playBeep(110, .3);

    state.overlayMode = "gameover";

    el.overlayIcon.textContent = "⏰";
    el.overlayLevelLabel.textContent = `MÀN ${state.level}`;
    el.overlayTitle.textContent = "Hết giờ!";
    el.overlayText.textContent = `Bạn đạt ${state.score.toLocaleString()} điểm ở màn ${state.level}.`;
    el.overlayStars.innerHTML = "";
    el.overlayStats.innerHTML = "";

    el.overlayPrimaryButton.textContent = "🔄 Chơi lại";
    el.overlaySecondaryButton.classList.add("hidden");

    showOverlay();

}


function showLevelClear(stars, timeBonus) {

    state.overlayMode = "levelclear";

    el.overlayIcon.textContent = "🎉";
    el.overlayLevelLabel.textContent = `MÀN ${state.level}`;
    el.overlayTitle.textContent = "Level Clear!";
    el.overlayText.textContent = `Hoàn thành màn ${state.level}.`;
    el.overlayStars.textContent = starGlyphs(stars);

    el.overlayStats.innerHTML = statBlock("Điểm màn", state.levelScore.toLocaleString())
        + statBlock("Bonus thời gian", "+" + timeBonus.toLocaleString())
        + statBlock("Tổng điểm", state.score.toLocaleString());

    el.overlayPrimaryButton.textContent = "🔄 Chơi lại màn";
    el.overlaySecondaryButton.textContent = "Màn tiếp theo →";
    el.overlaySecondaryButton.classList.remove("hidden");

    showOverlay();

}


function showFinalVictory(stars, timeBonus) {

    state.overlayMode = "final";

    el.overlayIcon.textContent = "🏆";
    el.overlayLevelLabel.textContent = "GRAND MASTER";
    el.overlayTitle.textContent = "Bạn đã hoàn thành toàn bộ 20 level!";
    el.overlayText.textContent = "Chúc mừng bạn đã chinh phục Pikachu Connect.";
    el.overlayStars.textContent = starGlyphs(stars);

    el.overlayStats.innerHTML = statBlock("Bonus thời gian", "+" + timeBonus.toLocaleString())
        + statBlock("Total Score", state.score.toLocaleString())
        + statBlock("Levels Completed", `${LEVELS.length} / ${LEVELS.length}`);

    el.overlayPrimaryButton.textContent = `Chơi lại Level ${LEVELS.length}`;
    el.overlaySecondaryButton.textContent = "Chơi từ Level 1";
    el.overlaySecondaryButton.classList.remove("hidden");

    showOverlay();

}


function statBlock(label, value) {

    return `<div class="overlay-stat"><span>${label}</span><strong>${value}</strong></div>`;

}


/* =====================================================
   PAUSE
===================================================== */

function togglePause() {

    if (!state.playing) return;

    state.paused = !state.paused;

    if (state.paused) {

        state.overlayMode = "pause";

        el.overlayIcon.textContent = "⏸️";
        el.overlayLevelLabel.textContent = `MÀN ${state.level}`;
        el.overlayTitle.textContent = "Tạm dừng";
        el.overlayText.textContent = "Nhấn tiếp tục để chơi.";
        el.overlayStars.innerHTML = "";
        el.overlayStats.innerHTML = "";

        el.overlayPrimaryButton.textContent = "▶ Tiếp tục";
        el.overlaySecondaryButton.classList.add("hidden");

        showOverlay();

        el.pauseButton.textContent = "▶ Tiếp tục";

    } else {

        hideOverlay();

        el.pauseButton.textContent = "Ⅱ Tạm dừng";

    }

}


/* =====================================================
   OVERLAY (start / pause / clear / game over / final)
===================================================== */

function showOverlay() {
    el.overlay.style.display = "flex";
}


function hideOverlay() {
    el.overlay.style.display = "none";
}


el.overlayPrimaryButton.addEventListener("click", () => {

    if (state.overlayMode === "pause") {

        togglePause();

    } else if (state.overlayMode === "final") {

        startLevel(LEVELS.length);

    } else {

        startLevel(state.level);

    }

});


el.overlaySecondaryButton.addEventListener("click", () => {

    if (state.overlayMode === "levelclear" && !isLastLevel(state.level)) {

        startLevel(state.level + 1);

    } else if (state.overlayMode === "final") {

        startLevel(1);

    }

});


/* =====================================================
   HUD
===================================================== */

function updateHud() {

    el.hudLevel.textContent = `${state.level} / ${LEVELS.length}`;
    el.hudScore.textContent = state.score.toLocaleString();
    el.hudCombo.textContent = `x${state.combo}`;

    el.hudStars.textContent = starGlyphs(computeStars(state.time, state.initialTime));

    updateTimerDisplay();

    el.hintCount.textContent = state.hints;
    el.shuffleCount.textContent = state.shuffles;

    el.hintButton.disabled = state.hints <= 0;
    el.shuffleButton.disabled = state.shuffles <= 0;

    el.progressLabel.textContent = `${state.matchedPairs} / ${state.totalPairs} cặp`;

    const percent = state.totalPairs > 0 ? (state.matchedPairs / state.totalPairs) * 100 : 0;

    el.progressFill.style.width = `${percent}%`;

}


function renderLevelGrid() {

    const progress = loadProgress();

    el.levelGrid.innerHTML = "";

    for (let i = 1; i <= LEVELS.length; i++) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "level-cell";

        if (i === state.level) button.classList.add("active");

        if (i < progress.unlocked) {

            button.classList.add("completed");
            button.textContent = "✓" + i;

        } else if (i === progress.unlocked) {

            button.textContent = "🔓" + i;

        } else {

            button.textContent = "🔒" + i;
            button.disabled = true;
            button.classList.add("locked");

        }

        button.addEventListener("click", () => chooseLevel(i));

        el.levelGrid.appendChild(button);

    }

}


/* =====================================================
   AUDIO (Web Audio API, no autoplay, no bundled files)
===================================================== */

let audioContext = null;


function playBeep(frequency, duration) {

    if (!state.soundEnabled) return;

    try {

        if (!audioContext) {

            audioContext = new (window.AudioContext || window.webkitAudioContext)();

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


/* =====================================================
   BUTTONS
===================================================== */

el.hintButton.addEventListener("click", useHint);

el.shuffleButton.addEventListener("click", () => shuffleBoard(false));

el.pauseButton.addEventListener("click", togglePause);

el.restartButton.addEventListener("click", restartLevel);

el.resetProgressButton.addEventListener("click", resetAllProgress);


el.soundButton.addEventListener("click", () => {

    state.soundEnabled = !state.soundEnabled;

    el.soundButton.textContent = state.soundEnabled ? "🔊 Âm thanh" : "🔇 Tắt âm thanh";

});


/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

document.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    if (key === "h") useHint();
    else if (key === "r") restartLevel();
    else if (key === "p") togglePause();

});


/* =====================================================
   SELF TESTS FOR findPath()
   Runs once at startup against a throwaway board so the
   turn-limited BFS is verified without touching game state.
   Uses console.assert, which stays silent when everything
   passes.
===================================================== */

function runPathFindingSelfTests() {

    try {

        const empty = (rows, cols) => Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => null)
        );


        // 0 turns: same row, clear path.
        let board = empty(5, 5);
        board[2][0] = { icon: "A" };
        board[2][4] = { icon: "A" };
        console.assert(
            !!findPath(board, 5, 5, { row: 2, col: 0 }, { row: 2, col: 4 }),
            "expected a 0-turn same-row path"
        );


        // 1 turn (single open corner).
        board = empty(5, 5);
        board[0][0] = { icon: "A" };
        board[3][3] = { icon: "A" };
        console.assert(
            !!findPath(board, 5, 5, { row: 0, col: 0 }, { row: 3, col: 3 }),
            "expected a 1-turn path around an open corner"
        );


        // No path at all: the tile is boxed in on all 4 sides, so it can't
        // even take a first step (this also can't be rescued by the
        // border wrap-around trick, since it never leaves its box).
        board = empty(5, 5);
        board[2][2] = { icon: "A" };
        board[1][2] = { icon: "X" };
        board[3][2] = { icon: "X" };
        board[2][1] = { icon: "X" };
        board[2][3] = { icon: "X" };
        board[0][0] = { icon: "A" };
        console.assert(
            findPath(board, 5, 5, { row: 2, col: 2 }, { row: 0, col: 0 }) === null,
            "expected no path when the tile is fully boxed in"
        );


        // Exactly 3 turns required -> must be rejected (turns <= 2 only).
        // The whole grid is walled on its outer ring so the border
        // wrap-around trick is unavailable, and every interior cell
        // except one single-width spiral corridor is walled too, so the
        // only route from A to B needs 3 direction changes.
        board = empty(6, 6);
        for (let c = 0; c < 6; c++) { board[0][c] = { icon: "X" }; board[5][c] = { icon: "X" }; }
        for (let r = 0; r < 6; r++) { board[r][0] = { icon: "X" }; board[r][5] = { icon: "X" }; }
        for (let r = 1; r <= 4; r++) {
            for (let c = 1; c <= 4; c++) board[r][c] = { icon: "X" };
        }
        board[1][1] = { icon: "A" };       // start
        board[1][2] = null;                // corridor: right
        board[1][3] = null;                // corridor: right
        board[2][3] = null;                // corridor: down (turn 1)
        board[3][3] = null;                // corridor: down
        board[3][4] = null;                // corridor: right (turn 2)
        board[4][4] = { icon: "A" };       // end, reached via down (turn 3) - too many
        console.assert(
            findPath(board, 6, 6, { row: 1, col: 1 }, { row: 4, col: 4 }) === null,
            "expected a path needing 3 turns to be rejected"
        );


        // Wrap-around outside the board edge: the only route between the
        // two corner tiles is through the padding ring, using exactly 2
        // turns (out, across, back in).
        board = empty(5, 5);
        board[0][0] = { icon: "A" };
        board[4][0] = { icon: "A" };
        for (let c = 1; c < 5; c++) board[0][c] = { icon: "X" };
        for (let r = 1; r < 4; r++) board[r][0] = { icon: "X" };
        console.assert(
            !!findPath(board, 5, 5, { row: 0, col: 0 }, { row: 4, col: 0 }),
            "expected a path that travels outside the board edge"
        );

    } catch (e) {

        console.error("Pikachu Connect self-tests threw:", e);

    }

}


runPathFindingSelfTests();


/* =====================================================
   INIT
===================================================== */

function init() {

    const progress = loadProgress();

    state.unlocked = progress.unlocked;
    state.score = progress.score;
    state.starsByLevel = progress.stars || {};

    startLevel(progress.level || 1);

}


init();

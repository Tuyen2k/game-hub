/* =====================================================
   BUBBLE SHOOTER

   Hex-grid ball popping game. Every row (even or odd) keeps a fixed
   number of columns (COLS) - only the pixel x-offset differs by
   parity - so shifting rows down when a new row is inserted never
   needs to resize a row's array, avoiding the classic "column count
   depends on row parity" bug.
===================================================== */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/* =====================================================
   CONFIG
===================================================== */

const RADIUS = 16;
const TILE_SIZE = RADIUS * 2;

const COLS = 10;
const GRID_ROWS = 13;
const DANGER_ROW = 11;

const PLAY_PADDING = 8;
const SHOOTER_AREA = 110;

const ROW_SPACING = TILE_SIZE * (Math.sqrt(3) / 2);

const WORLD_WIDTH =
    PLAY_PADDING * 2 + COLS * TILE_SIZE + RADIUS;

const WORLD_HEIGHT = Math.ceil(
    PLAY_PADDING +
    (GRID_ROWS - 1) * ROW_SPACING +
    RADIUS +
    SHOOTER_AREA +
    PLAY_PADDING
);

const PLAY_LEFT = PLAY_PADDING;
const PLAY_RIGHT = WORLD_WIDTH - PLAY_PADDING;

const SHOOTER_X = WORLD_WIDTH / 2;
const SHOOTER_Y = WORLD_HEIGHT - SHOOTER_AREA / 2 - PLAY_PADDING;

const PROJECTILE_SPEED = 780;

const AIM_MIN = -(Math.PI - 0.22);
const AIM_MAX = -0.22;
const AIM_STEP = 0.06;

const POP_SCORE_PER_BUBBLE = 10;
const DROP_SCORE_PER_BUBBLE = 20;

const BUBBLE_COLORS = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#f97316"
];

const LEVELS = [
    { startRows: 5, colors: 4, shotsPerNewRow: 9 },
    { startRows: 5, colors: 4, shotsPerNewRow: 8 },
    { startRows: 6, colors: 5, shotsPerNewRow: 7 },
    { startRows: 6, colors: 5, shotsPerNewRow: 6 },
    { startRows: 7, colors: 6, shotsPerNewRow: 6 },
    { startRows: 7, colors: 6, shotsPerNewRow: 5 }
];


function getLevelConfig(level) {

    const index = Math.min(level - 1, LEVELS.length - 1);

    return LEVELS[Math.max(0, index)];

}


/* =====================================================
   GEOMETRY (hex grid, "odd row shoved right")
===================================================== */

function isOddRow(row) {
    return row % 2 === 1;
}


function pixelX(row, col) {

    return (
        PLAY_PADDING +
        col * TILE_SIZE +
        (isOddRow(row) ? RADIUS : 0) +
        RADIUS
    );

}


function pixelY(row, col) {

    return PLAY_PADDING + row * ROW_SPACING + RADIUS;

}


function inBounds(row, col) {

    return row >= 0 && row < GRID_ROWS && col >= 0 && col < COLS;

}


function getNeighbors(row, col) {

    const offsets = isOddRow(row)
        ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
        : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

    return offsets
        .map(([dr, dc]) => [row + dr, col + dc])
        .filter(([r, c]) => inBounds(r, c));

}


function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));

}


/* =====================================================
   STATE
===================================================== */

// A properly-shaped (GRID_ROWS x COLS) grid of nulls from the very start,
// not an empty []: render() runs on the first animation frame before the
// player ever clicks Start, and drawGrid()/drawDangerLine() index into
// grid[r][c] unconditionally - an empty [] made that throw immediately,
// which silently killed the requestAnimationFrame loop for good (the
// crash happened before the next frame was scheduled), so nothing ever
// drew again even after a real game was started.
let grid = makeEmptyGrid();

const state = {
    score: 0,
    level: 1,
    running: false,
    paused: false,
    over: false,
    shotsSinceRow: 0,
    aimAngle: -Math.PI / 2,
    currentColor: 0,
    nextColor: 0,
    projectile: null,
    fallingBubbles: [],
    soundEnabled: true
};

let lastTime = 0;
let audioContext = null;


/* =====================================================
   STORAGE
===================================================== */

function getHighScore() {

    if (typeof GameStorage !== "undefined") {

        return GameStorage.getHighScore("bubble-shooter");

    }

    return Number(localStorage.getItem("gameHub_highScore_bubble-shooter") || 0);

}


function saveHighScore() {

    if (typeof GameStorage !== "undefined") {

        GameStorage.setHighScore("bubble-shooter", state.score);

    }

}


/* =====================================================
   CANVAS
===================================================== */

function resizeCanvas() {

    const dpr = window.devicePixelRatio || 1;

    canvas.width = WORLD_WIDTH * dpr;
    canvas.height = WORLD_HEIGHT * dpr;

    canvas.style.aspectRatio = `${WORLD_WIDTH} / ${WORLD_HEIGHT}`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

}


resizeCanvas();

window.addEventListener("resize", resizeCanvas);


/* =====================================================
   GRID
===================================================== */

function makeEmptyGrid() {

    const rows = [];

    for (let r = 0; r < GRID_ROWS; r++) {

        rows.push(new Array(COLS).fill(null));

    }

    return rows;

}


function makeRandomRow(colorCount) {

    const row = new Array(COLS).fill(null);

    for (let c = 0; c < COLS; c++) {

        row[c] = Math.floor(Math.random() * colorCount);

    }

    return row;

}


function generateGrid(levelConfig) {

    grid = makeEmptyGrid();

    for (let r = 0; r < levelConfig.startRows; r++) {

        grid[r] = makeRandomRow(levelConfig.colors);

    }

}


function isGridEmpty() {

    return grid.every(row => row.every(cell => cell === null));

}


function isDanger() {

    for (let r = DANGER_ROW; r < GRID_ROWS; r++) {

        if (grid[r].some(cell => cell !== null)) return true;

    }

    return false;

}


/* =====================================================
   QUEUE (current / next bubble color)
===================================================== */

function pickRandomColor(colorCount) {

    const present = new Set();

    grid.forEach(row => row.forEach(cell => {
        if (cell !== null) present.add(cell);
    }));

    const pool = present.size > 0
        ? Array.from(present)
        : Array.from({ length: colorCount }, (_, i) => i);

    return pool[Math.floor(Math.random() * pool.length)];

}


function refillQueue() {

    const colorCount = getLevelConfig(state.level).colors;

    state.currentColor = pickRandomColor(colorCount);
    state.nextColor = pickRandomColor(colorCount);

}


function advanceQueue() {

    const colorCount = getLevelConfig(state.level).colors;

    state.currentColor = state.nextColor;
    state.nextColor = pickRandomColor(colorCount);

}


/* =====================================================
   MATCHING / POPPING
===================================================== */

function floodFillSameColor(row, col) {

    const target = grid[row][col];

    if (target === null) return [];

    const visited = new Set();
    const stack = [[row, col]];
    const group = [];

    while (stack.length) {

        const [r, c] = stack.pop();
        const key = `${r},${c}`;

        if (visited.has(key)) continue;

        visited.add(key);

        if (grid[r][c] !== target) continue;

        group.push([r, c]);

        for (const [nr, nc] of getNeighbors(r, c)) {

            if (!visited.has(`${nr},${nc}`)) stack.push([nr, nc]);

        }

    }

    return group;

}


function findFloatingBubbles() {

    const reachable = new Set();
    const stack = [];

    for (let c = 0; c < COLS; c++) {

        if (grid[0][c] !== null) {

            stack.push([0, c]);
            reachable.add(`0,${c}`);

        }

    }

    while (stack.length) {

        const [r, c] = stack.pop();

        for (const [nr, nc] of getNeighbors(r, c)) {

            const key = `${nr},${nc}`;

            if (!reachable.has(key) && grid[nr][nc] !== null) {

                reachable.add(key);
                stack.push([nr, nc]);

            }

        }

    }

    const floating = [];

    for (let r = 0; r < GRID_ROWS; r++) {

        for (let c = 0; c < COLS; c++) {

            if (grid[r][c] !== null && !reachable.has(`${r},${c}`)) {

                floating.push([r, c]);

            }

        }

    }

    return floating;

}


function popGroup(group) {

    for (const [r, c] of group) {

        grid[r][c] = null;

    }

    state.score += group.length * POP_SCORE_PER_BUBBLE;

    beep(520, 0.12);

}


function dropBubbles(list) {

    for (const [r, c] of list) {

        state.fallingBubbles.push({
            x: pixelX(r, c),
            y: pixelY(r, c),
            color: grid[r][c],
            vy: 60,
            life: 1
        });

        grid[r][c] = null;

    }

    state.score += list.length * DROP_SCORE_PER_BUBBLE;

    if (list.length > 0) beep(680, 0.15);

}


/* =====================================================
   ROW INSERTION
===================================================== */

function insertNewRow() {

    if (isDanger()) {

        endGame();
        return;

    }

    const colorCount = getLevelConfig(state.level).colors;

    grid.pop();
    grid.unshift(makeRandomRow(colorCount));

    if (isDanger()) endGame();

}


function onShotLanded() {

    state.shotsSinceRow++;

    const cfg = getLevelConfig(state.level);

    if (state.shotsSinceRow >= cfg.shotsPerNewRow) {

        state.shotsSinceRow = 0;

        insertNewRow();

    }

}


/* =====================================================
   LANDING RESOLUTION
===================================================== */

function allEmptyCellsSortedByDistance(px, py) {

    const cells = [];

    for (let r = 0; r < GRID_ROWS; r++) {

        for (let c = 0; c < COLS; c++) {

            if (grid[r][c] === null) cells.push([r, c]);

        }

    }

    cells.sort((a, b) => {

        const da = Math.hypot(px - pixelX(a[0], a[1]), py - pixelY(a[0], a[1]));
        const db = Math.hypot(px - pixelX(b[0], b[1]), py - pixelY(b[0], b[1]));

        return da - db;

    });

    return cells;

}


function findHitBubble(px, py) {

    let hit = null;
    let hitDist = Infinity;

    for (let r = 0; r < GRID_ROWS; r++) {

        for (let c = 0; c < COLS; c++) {

            if (grid[r][c] === null) continue;

            const d = Math.hypot(px - pixelX(r, c), py - pixelY(r, c));

            if (d < TILE_SIZE && d < hitDist) {

                hit = [r, c];
                hitDist = d;

            }

        }

    }

    return hit;

}


function resolveLanding(px, py) {

    const hit = findHitBubble(px, py);

    let candidates = [];

    if (hit) {

        candidates = getNeighbors(hit[0], hit[1])
            .filter(([r, c]) => grid[r][c] === null);

    } else {

        const approxCol = clamp(
            Math.round((px - PLAY_PADDING - RADIUS) / TILE_SIZE),
            0,
            COLS - 1
        );

        if (grid[0][approxCol] === null) candidates = [[0, approxCol]];

    }

    if (candidates.length === 0) {

        candidates = allEmptyCellsSortedByDistance(px, py).slice(0, 1);

    }

    let best = candidates[0];
    let bestDist = Infinity;

    for (const [r, c] of candidates) {

        const d = Math.hypot(px - pixelX(r, c), py - pixelY(r, c));

        if (d < bestDist) {

            bestDist = d;
            best = [r, c];

        }

    }

    return best;

}


function landProjectile(row, col, color) {

    grid[row][col] = color;

    state.projectile = null;

    const group = floodFillSameColor(row, col);

    if (group.length >= 3) {

        popGroup(group);

        const floating = findFloatingBubbles();

        if (floating.length > 0) dropBubbles(floating);

    } else {

        beep(300, 0.08);

    }

    onShotLanded();

    checkWinCondition();

    if (!state.over) checkGameOverNow();

}


function checkGameOverNow() {

    if (isDanger()) endGame();

}


function checkWinCondition() {

    if (state.over) return;

    if (isGridEmpty()) {

        state.level++;
        state.shotsSinceRow = 0;

        generateGrid(getLevelConfig(state.level));
        refillQueue();

        beep(880, 0.25);

    }

}


/* =====================================================
   SHOOTING
===================================================== */

function clampAim(angle) {

    return clamp(angle, AIM_MIN, AIM_MAX);

}


function updateAimFromPoint(x, y) {

    if (!state.running || state.paused || state.over) return;

    state.aimAngle = clampAim(Math.atan2(y - SHOOTER_Y, x - SHOOTER_X));

}


function fireBubble() {

    if (state.projectile) return;
    if (!state.running || state.paused || state.over) return;

    const angle = state.aimAngle;

    state.projectile = {
        x: SHOOTER_X,
        y: SHOOTER_Y,
        vx: Math.cos(angle) * PROJECTILE_SPEED,
        vy: Math.sin(angle) * PROJECTILE_SPEED,
        color: state.currentColor
    };

    advanceQueue();

    beep(420, 0.05);

}


function fireOrStart() {

    if (!state.running || state.over) {

        startGame();
        return;

    }

    if (state.paused) return;

    fireBubble();

}


function updateProjectile(dt) {

    const p = state.projectile;

    if (!p) return;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x - RADIUS < PLAY_LEFT) {

        p.x = PLAY_LEFT + RADIUS;
        p.vx *= -1;

    }

    if (p.x + RADIUS > PLAY_RIGHT) {

        p.x = PLAY_RIGHT - RADIUS;
        p.vx *= -1;

    }

    if (p.y - RADIUS <= PLAY_PADDING) {

        const [row, col] = resolveLanding(p.x, PLAY_PADDING + RADIUS);

        landProjectile(row, col, p.color);
        return;

    }

    if (findHitBubble(p.x, p.y)) {

        const [row, col] = resolveLanding(p.x, p.y);

        landProjectile(row, col, p.color);
        return;

    }

    if (p.y > WORLD_HEIGHT) {

        state.projectile = null;

    }

}


function updateFallingBubbles(dt) {

    state.fallingBubbles = state.fallingBubbles.filter(b => {

        b.vy += 500 * dt;
        b.y += b.vy * dt;
        b.life -= dt * 0.8;

        return b.life > 0 && b.y < WORLD_HEIGHT + RADIUS * 2;

    });

}


/* =====================================================
   GAME FLOW
===================================================== */

function startGame() {

    state.score = 0;
    state.level = 1;
    state.running = true;
    state.paused = false;
    state.over = false;
    state.shotsSinceRow = 0;
    state.aimAngle = -Math.PI / 2;
    state.projectile = null;
    state.fallingBubbles = [];

    generateGrid(getLevelConfig(1));
    refillQueue();

    hideOverlay();
    updateHud();

}


function endGame() {

    state.running = false;
    state.over = true;
    state.projectile = null;

    saveHighScore();

    showOverlay(
        "💥",
        "Thua rồi!",
        `Điểm của bạn: ${state.score}`,
        "🔁 Chơi lại"
    );

    updateHud();

}


function togglePause() {

    if (!state.running || state.over) return;

    state.paused = !state.paused;

    if (state.paused) {

        showOverlay("⏸️", "Tạm dừng", "Nhấn tiếp tục để chơi tiếp", "▶ Tiếp tục");

    } else {

        hideOverlay();

    }

}


/* =====================================================
   HUD / OVERLAY
===================================================== */

const el = {
    score: document.getElementById("score"),
    highScore: document.getElementById("highScore"),
    level: document.getElementById("level"),
    shotsLeft: document.getElementById("shotsLeft"),
    overlay: document.getElementById("gameOverlay"),
    overlayIcon: document.getElementById("overlayIcon"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayText: document.getElementById("overlayText"),
    overlayButton: document.getElementById("overlayButton"),
    pauseButton: document.getElementById("pauseButton"),
    soundButton: document.getElementById("soundButton")
};


function updateHud() {

    el.score.textContent = state.score;
    el.highScore.textContent = Math.max(getHighScore(), state.score);
    el.level.textContent = state.level;

    const cfg = getLevelConfig(state.level);

    el.shotsLeft.textContent = state.running && !state.over
        ? `${cfg.shotsPerNewRow - state.shotsSinceRow} phát`
        : "-";

}


function showOverlay(icon, title, text, buttonLabel) {

    el.overlayIcon.textContent = icon;
    el.overlayTitle.textContent = title;
    el.overlayText.textContent = text;
    el.overlayButton.textContent = buttonLabel;

    el.overlay.style.display = "flex";

}


function hideOverlay() {

    el.overlay.style.display = "none";

}


/* =====================================================
   SOUND
===================================================== */

function beep(frequency, duration) {

    if (!state.soundEnabled) return;

    try {

        if (!audioContext) {

            audioContext = new (
                window.AudioContext || window.webkitAudioContext
            )();

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
   DRAWING
===================================================== */

function drawBubble(x, y, colorIndex, radius = RADIUS) {

    const color = BUBBLE_COLORS[colorIndex];

    const gradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
    );

    gradient.addColorStop(0, "rgba(255,255,255,0.65)");
    gradient.addColorStop(0.35, color);
    gradient.addColorStop(1, color);

    ctx.beginPath();
    ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

}


function drawGrid() {

    for (let r = 0; r < GRID_ROWS; r++) {

        for (let c = 0; c < COLS; c++) {

            if (grid[r][c] !== null) {

                drawBubble(pixelX(r, c), pixelY(r, c), grid[r][c]);

            }

        }

    }

}


function drawDangerLine() {

    const y = pixelY(DANGER_ROW, 0) - RADIUS;

    ctx.save();
    ctx.strokeStyle = "rgba(239,68,68,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(PLAY_LEFT, y);
    ctx.lineTo(PLAY_RIGHT, y);
    ctx.stroke();

    ctx.restore();

}


function drawFallingBubbles() {

    for (const b of state.fallingBubbles) {

        ctx.save();
        ctx.globalAlpha = clamp(b.life, 0, 1);

        drawBubble(b.x, b.y, b.color);

        ctx.restore();

    }

}


function drawShooter() {

    if (!state.running) return;

    ctx.save();

    if (!state.over && !state.paused) {

        ctx.strokeStyle = "rgba(148,163,184,0.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 7]);

        ctx.beginPath();
        ctx.moveTo(SHOOTER_X, SHOOTER_Y);
        ctx.lineTo(
            SHOOTER_X + Math.cos(state.aimAngle) * 130,
            SHOOTER_Y + Math.sin(state.aimAngle) * 130
        );
        ctx.stroke();

    }

    ctx.restore();

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(SHOOTER_X, SHOOTER_Y, RADIUS + 10, 0, Math.PI * 2);
    ctx.fill();

    drawBubble(SHOOTER_X, SHOOTER_Y, state.currentColor);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TIẾP", SHOOTER_X + 44, SHOOTER_Y - RADIUS - 4);

    drawBubble(SHOOTER_X + 44, SHOOTER_Y, state.nextColor, RADIUS * 0.7);

}


function drawProjectile() {

    if (!state.projectile) return;

    drawBubble(state.projectile.x, state.projectile.y, state.projectile.color);

}


function render() {

    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawDangerLine();
    drawGrid();
    drawFallingBubbles();
    drawProjectile();
    drawShooter();

}


/* =====================================================
   INPUT
===================================================== */

function pointFromEvent(clientX, clientY) {

    const rect = canvas.getBoundingClientRect();

    return {
        x: (clientX - rect.left) * (WORLD_WIDTH / rect.width),
        y: (clientY - rect.top) * (WORLD_HEIGHT / rect.height)
    };

}


canvas.addEventListener("mousemove", event => {

    const p = pointFromEvent(event.clientX, event.clientY);

    updateAimFromPoint(p.x, p.y);

});


canvas.addEventListener("click", () => {

    fireOrStart();

});


canvas.addEventListener("touchstart", event => {

    event.preventDefault();

    const t = event.touches[0];

    if (!t) return;

    const p = pointFromEvent(t.clientX, t.clientY);

    updateAimFromPoint(p.x, p.y);

}, { passive: false });


canvas.addEventListener("touchmove", event => {

    event.preventDefault();

    const t = event.touches[0];

    if (!t) return;

    const p = pointFromEvent(t.clientX, t.clientY);

    updateAimFromPoint(p.x, p.y);

}, { passive: false });


canvas.addEventListener("touchend", event => {

    event.preventDefault();

    fireOrStart();

}, { passive: false });


document.addEventListener("keydown", event => {

    if (event.key === "ArrowLeft") {

        event.preventDefault();
        state.aimAngle = clampAim(state.aimAngle - AIM_STEP);

    }

    if (event.key === "ArrowRight") {

        event.preventDefault();
        state.aimAngle = clampAim(state.aimAngle + AIM_STEP);

    }

    if (event.code === "Space") {

        event.preventDefault();
        fireOrStart();

    }

    if (event.key.toLowerCase() === "p") {

        togglePause();

    }

});


document.getElementById("startButton")
    .addEventListener("click", startGame);


document.getElementById("pauseButton")
    .addEventListener("click", togglePause);


document.getElementById("overlayButton")
    .addEventListener("click", () => {

        if (state.paused) {

            togglePause();

        } else {

            startGame();

        }

    });


document.getElementById("soundButton")
    .addEventListener("click", () => {

        state.soundEnabled = !state.soundEnabled;

        el.soundButton.textContent = state.soundEnabled
            ? "🔊 Âm thanh"
            : "🔇 Tắt âm thanh";

    });


/* =====================================================
   GAME LOOP
===================================================== */

function update(dt) {

    if (!state.running || state.paused || state.over) return;

    updateProjectile(dt);
    updateFallingBubbles(dt);

    updateHud();

}


function gameLoop(time = 0) {

    const dt = Math.min((time - lastTime) / 1000, 0.05);

    lastTime = time;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);

}


el.highScore.textContent = getHighScore();

requestAnimationFrame(gameLoop);

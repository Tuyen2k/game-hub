/* =====================================================
   DOT MUNCHER (Pac-Man style maze chase)

   Grid-based maze with continuous sub-tile movement. Ghosts run a
   simplified version of the classic 3-mode AI: scatter (retreat to
   a home corner), chase (each ghost targets a different point
   relative to the player - direct / ahead / shy - for distinct
   personalities), and frightened (power pellet, random movement,
   can be eaten).
===================================================== */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/* =====================================================
   MAZE

   Validated offline with a flood fill before being hand-copied
   here: every non-wall tile is reachable from the player spawn,
   including through the left/right tunnel wrap.
   # wall   . dot   o power pellet   space empty (no dot)
   T tunnel mouth   D ghost-house door (ghosts only)   P player spawn
===================================================== */

const MAZE = [
    "###################",
    "#o...............o#",
    "#.#.#.#.#.#.#.#.#.#",
    "#.................#",
    "#.#.#.#.#.#.#.#.#.#",
    "#.................#",
    "#.#.#.#.#.#.#.#.#.#",
    "#.................#",
    "#.#.#.###D###.#.#.#",
    "#......#   #......#",
    "T......#####......T",
    "#.................#",
    "#.#.#.#.#.#.#.#.#.#",
    "#........P........#",
    "#.#.#.#.#.#.#.#.#.#",
    "#.................#",
    "#.#.#.#.#.#.#.#.#.#",
    "#.................#",
    "#.#.#.#.#.#.#.#.#.#",
    "#o...............o#",
    "###################"
];

const ROWS = MAZE.length;
const COLS = MAZE[0].length;


/* =====================================================
   CONFIG
========================================================= */

const TILE = 24;

const WORLD_WIDTH = COLS * TILE;
const WORLD_HEIGHT = ROWS * TILE;

const PLAYER_SPEED = 4.6;
const FRIGHTENED_SPEED = 2.6;
const EATEN_SPEED = 7;

const FRIGHTENED_DURATION = 8;

const GHOST_EAT_SCORES = [200, 400, 800, 1600];

const MODE_SCHEDULE = [
    { mode: "scatter", duration: 7 },
    { mode: "chase", duration: 20 },
    { mode: "scatter", duration: 7 },
    { mode: "chase", duration: 20 },
    { mode: "scatter", duration: 5 },
    { mode: "chase", duration: Infinity }
];


const GHOST_SPEED_TIERS = [
    { level: 1, speed: 2.9 },
    { level: 2, speed: 3.15 },
    { level: 3, speed: 3.4 },
    { level: 4, speed: 3.65 },
    { level: 5, speed: 3.9 },
    { level: 6, speed: 4.1 }
];


function getGhostSpeed(level) {

    let speed = GHOST_SPEED_TIERS[0].speed;

    for (const tier of GHOST_SPEED_TIERS) {

        if (level >= tier.level) speed = tier.speed;

    }

    return speed;

}


const DIRS = {

    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 }

};


/* =====================================================
   PARSE MAZE
===================================================== */

let tiles = [];

let doorTile = null;
let houseCenter = null;
let playerSpawn = null;

const cornerTargets = {
    topLeft: { row: 1, col: 1 },
    topRight: { row: 1, col: COLS - 2 },
    bottomLeft: { row: ROWS - 2, col: 1 },
    bottomRight: { row: ROWS - 2, col: COLS - 2 }
};


function parseMaze() {

    tiles = [];

    for (let r = 0; r < ROWS; r++) {

        const row = [];

        for (let c = 0; c < COLS; c++) {

            const ch = MAZE[r][c];

            if (ch === "#") row.push("wall");
            else if (ch === "D") { row.push("door"); doorTile = { row: r, col: c }; }
            else if (ch === "T") row.push("empty");
            else if (ch === "P") { row.push("empty"); playerSpawn = { row: r, col: c }; }
            else if (ch === "o") row.push("pellet");
            else if (ch === ".") row.push("dot");
            else row.push("empty");

        }

        tiles.push(row);

    }

    houseCenter = { row: doorTile.row + 1, col: doorTile.col };

}


function tileAt(row, col) {

    if (row < 0 || row >= ROWS) return "wall";

    let c = col;

    if (c < 0) c += COLS;
    if (c >= COLS) c -= COLS;

    return tiles[row][c];

}


function isWalkable(row, col, isGhost) {

    const tile = tileAt(row, col);

    if (tile === "wall") return false;

    if (tile === "door" && !isGhost) return false;

    return true;

}


/* =====================================================
   STATE
===================================================== */

const state = {
    score: 0,
    lives: 3,
    level: 1,
    dotsRemaining: 0,
    running: false,
    paused: false,
    over: false,
    frightenedTimer: 0,
    ghostsEatenThisPellet: 0,
    modeIndex: 0,
    modeTimer: 0,
    globalMode: "scatter",
    releaseElapsed: 0,
    soundEnabled: true
};


let player = null;
let ghosts = [];
let lastTime = 0;


/* =====================================================
   STORAGE
===================================================== */

function getHighScore() {

    if (typeof GameStorage !== "undefined") {

        return GameStorage.getHighScore("pacman");

    }

    return Number(localStorage.getItem("gameHub_highScore_pacman") || 0);

}


function saveHighScore() {

    if (typeof GameStorage !== "undefined") {

        GameStorage.setHighScore("pacman", state.score);

    }

}


/* =====================================================
   CANVAS
========================================================= */

function resizeCanvas() {

    const dpr = window.devicePixelRatio || 1;

    canvas.width = WORLD_WIDTH * dpr;
    canvas.height = WORLD_HEIGHT * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

}


resizeCanvas();

window.addEventListener("resize", resizeCanvas);


/* =====================================================
   ENTITIES
===================================================== */

function createPlayer() {

    return {
        row: playerSpawn.row,
        col: playerSpawn.col,
        dir: null,
        nextDir: null,
        speed: PLAYER_SPEED
    };

}


function createGhosts() {

    const defs = [

        { personality: "chaser", color: "#f87171", corner: cornerTargets.topRight, releaseTime: 0 },
        { personality: "ambusher", color: "#f9a8d4", corner: cornerTargets.topLeft, releaseTime: 4 },
        { personality: "erratic", color: "#67e8f9", corner: cornerTargets.bottomRight, releaseTime: 8 },
        { personality: "shy", color: "#fb923c", corner: cornerTargets.bottomLeft, releaseTime: 12 }

    ];

    return defs.map(def => ({

        row: houseCenter.row,
        col: houseCenter.col,
        dir: null,

        personality: def.personality,
        color: def.color,
        homeCorner: def.corner,
        releaseTime: def.releaseTime,

        state: "idle",
        mode: "scatter",

        speed: getGhostSpeed(state.level),

        forceReverse: false

    }));

}


/* =====================================================
   NEW GAME / LEVEL
===================================================== */

function fillDots() {

    let count = 0;

    for (let r = 0; r < ROWS; r++) {

        for (let c = 0; c < COLS; c++) {

            const ch = MAZE[r][c];

            if (ch === ".") { tiles[r][c] = "dot"; count++; }
            else if (ch === "o") { tiles[r][c] = "pellet"; count++; }

        }

    }

    state.dotsRemaining = count;

}


function resetPositions() {

    player = createPlayer();
    ghosts = createGhosts();

    state.modeIndex = 0;
    state.modeTimer = 0;
    state.globalMode = MODE_SCHEDULE[0].mode;

    state.frightenedTimer = 0;
    state.ghostsEatenThisPellet = 0;
    state.releaseElapsed = 0;

}


function startGame() {

    parseMaze();

    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.running = true;
    state.paused = false;
    state.over = false;

    fillDots();
    resetPositions();

    hideOverlay();
    updateUI();

    beep(500, .06);

}


function nextLevel() {

    state.level++;

    fillDots();
    resetPositions();

    showOverlay(
        "🎉 Qua màn!",
        `Chuẩn bị màn ${state.level}...`
    );

    beep(880, .2);

    setTimeout(() => {

        if (!state.over) hideOverlay();

    }, 1400);

}


function loseLife() {

    state.lives--;

    beep(140, .3);

    updateUI();

    if (state.lives <= 0) {

        endGame();

        return;

    }

    resetPositions();

    showOverlay(
        "💥 Mất 1 mạng!",
        `Còn ${state.lives} mạng.`
    );

    setTimeout(() => {

        if (!state.over) hideOverlay();

    }, 1200);

}


function endGame() {

    state.running = false;
    state.over = true;

    saveHighScore();

    beep(120, .35);

    showOverlay(
        "💀 Game Over",
        `Bạn đạt ${state.score.toLocaleString()} điểm ở màn ${state.level}.`
    );

    document.getElementById("overlayButton").textContent = "🔄 Chơi lại";

    updateUI();

}


/* =====================================================
   MOVEMENT
===================================================== */

function stepPlayer(delta) {

    const row = Math.round(player.row);
    const col = Math.round(player.col);

    const atCenter =
        Math.abs(player.row - row) < 0.06 &&
        Math.abs(player.col - col) < 0.06;

    if (atCenter) {

        player.row = row;
        player.col = col;

        if (player.nextDir && isWalkable(row + player.nextDir.dr, col + player.nextDir.dc, false)) {

            player.dir = player.nextDir;

        }

        if (player.dir && !isWalkable(row + player.dir.dr, col + player.dir.dc, false)) {

            player.dir = null;

        }

        onPlayerEnterTile(row, col);

    }

    if (player.dir) {

        player.row += player.dir.dr * player.speed * delta;
        player.col += player.dir.dc * player.speed * delta;

        wrapEntity(player);

    }

}


function wrapEntity(entity) {

    if (entity.col < -0.5) entity.col += COLS;
    if (entity.col > COLS - 0.5) entity.col -= COLS;

}


function onPlayerEnterTile(row, col) {

    const tile = tiles[row][col];

    if (tile === "dot") {

        tiles[row][col] = "empty";

        state.score += 10;

        state.dotsRemaining--;

        beep(500, .03);

    } else if (tile === "pellet") {

        tiles[row][col] = "empty";

        state.score += 50;

        state.dotsRemaining--;

        startFrightened();

        beep(700, .08);

    }

    updateUI();

    if (state.dotsRemaining <= 0) {

        nextLevel();

    }

}


function startFrightened() {

    state.frightenedTimer = FRIGHTENED_DURATION;

    state.ghostsEatenThisPellet = 0;

    ghosts.forEach(ghost => {

        if (ghost.state === "active" && ghost.mode !== "eaten") {

            ghost.mode = "frightened";

            ghost.dir = {
                dr: -ghost.dir.dr,
                dc: -ghost.dir.dc
            };

        }

    });

}


/* =====================================================
   GHOST AI
===================================================== */

function getAheadOfPlayer(distance) {

    const dir = player.dir || DIRS.left;

    return {
        row: Math.round(player.row) + dir.dr * distance,
        col: Math.round(player.col) + dir.dc * distance
    };

}


function distanceSquared(row, col, target) {

    const dr = row - target.row;
    const dc = col - target.col;

    return dr * dr + dc * dc;

}


function getGhostTarget(ghost) {

    if (ghost.mode === "eaten") return doorTile;

    if (ghost.mode === "scatter") return ghost.homeCorner;

    const playerTile = {
        row: Math.round(player.row),
        col: Math.round(player.col)
    };

    switch (ghost.personality) {

        case "chaser":
            return playerTile;

        case "ambusher":
            return getAheadOfPlayer(4);

        case "erratic":
            return getAheadOfPlayer(2 + Math.floor(Math.random() * 3));

        case "shy": {

            const near =
                distanceSquared(ghost.row, ghost.col, playerTile) < 36;

            return near ? ghost.homeCorner : playerTile;

        }

        default:
            return playerTile;

    }

}


function chooseGhostDirection(ghost, row, col) {

    const target = getGhostTarget(ghost);

    const options = [];

    for (const key in DIRS) {

        const dir = DIRS[key];

        if (
            ghost.dir &&
            !ghost.forceReverse &&
            dir.dr === -ghost.dir.dr &&
            dir.dc === -ghost.dir.dc
        ) continue;

        if (!isWalkable(row + dir.dr, col + dir.dc, true)) continue;

        options.push(dir);

    }

    ghost.forceReverse = false;

    if (options.length === 0) {

        return ghost.dir
            ? { dr: -ghost.dir.dr, dc: -ghost.dir.dc }
            : DIRS.up;

    }

    if (ghost.mode === "frightened") {

        return options[Math.floor(Math.random() * options.length)];

    }

    options.sort((a, b) =>
        distanceSquared(row + a.dr, col + a.dc, target) -
        distanceSquared(row + b.dr, col + b.dc, target)
    );

    return options[0];

}


function stepGhost(ghost, delta) {

    if (ghost.state === "idle") return;


    const row = Math.round(ghost.row);
    const col = Math.round(ghost.col);

    const atCenter =
        Math.abs(ghost.row - row) < 0.06 &&
        Math.abs(ghost.col - col) < 0.06;

    if (atCenter) {

        ghost.row = row;
        ghost.col = col;


        if (ghost.mode === "eaten" && row === doorTile.row && col === doorTile.col) {

            ghost.mode = state.globalMode;
            ghost.speed = getGhostSpeed(state.level);
            ghost.dir = DIRS.down;

        } else {

            ghost.dir = chooseGhostDirection(ghost, row, col);

        }

    }


    const speed =
        ghost.mode === "frightened"
            ? FRIGHTENED_SPEED
            : ghost.mode === "eaten"
                ? EATEN_SPEED
                : ghost.speed;

    if (ghost.dir) {

        ghost.row += ghost.dir.dr * speed * delta;
        ghost.col += ghost.dir.dc * speed * delta;

        wrapEntity(ghost);

    }

}


function updateGhostRelease(delta) {

    state.releaseElapsed += delta;

    ghosts.forEach(ghost => {

        if (ghost.state === "idle" && state.releaseElapsed >= ghost.releaseTime) {

            ghost.state = "active";

            ghost.row = houseCenter.row;
            ghost.col = houseCenter.col;

            ghost.dir = DIRS.up;

            ghost.mode = state.globalMode;

        }

    });

}


/* =====================================================
   MODE SCHEDULE (scatter / chase)
===================================================== */

function updateModeSchedule(delta) {

    if (state.frightenedTimer > 0) return;

    state.modeTimer += delta;

    const current = MODE_SCHEDULE[state.modeIndex];

    if (state.modeTimer >= current.duration) {

        state.modeIndex =
            Math.min(state.modeIndex + 1, MODE_SCHEDULE.length - 1);

        state.modeTimer = 0;

        const next = MODE_SCHEDULE[state.modeIndex];

        if (next.mode !== state.globalMode) {

            state.globalMode = next.mode;

            ghosts.forEach(ghost => {

                if (ghost.state === "active" && ghost.mode !== "frightened" && ghost.mode !== "eaten") {

                    ghost.mode = state.globalMode;
                    ghost.forceReverse = true;

                }

            });

        }

    }

}


function updateFrightened(delta) {

    if (state.frightenedTimer <= 0) return;

    state.frightenedTimer -= delta;

    if (state.frightenedTimer <= 0) {

        state.frightenedTimer = 0;

        ghosts.forEach(ghost => {

            if (ghost.mode === "frightened") {

                ghost.mode = state.globalMode;

            }

        });

    }

}


/* =====================================================
   COLLISIONS
===================================================== */

function checkGhostCollisions() {

    for (const ghost of ghosts) {

        if (ghost.state !== "active") continue;

        const dr = ghost.row - player.row;
        const dc = ghost.col - player.col;

        if (dr * dr + dc * dc > 0.36) continue;


        if (ghost.mode === "frightened") {

            ghost.mode = "eaten";

            const points =
                GHOST_EAT_SCORES[
                    Math.min(state.ghostsEatenThisPellet, GHOST_EAT_SCORES.length - 1)
                ];

            state.score += points;

            state.ghostsEatenThisPellet++;

            beep(900, .1);

            updateUI();

        } else if (ghost.mode !== "eaten") {

            loseLife();

            return;

        }

    }

}


/* =====================================================
   DRAW
===================================================== */

function drawMaze() {

    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (let r = 0; r < ROWS; r++) {

        for (let c = 0; c < COLS; c++) {

            const tile = tiles[r][c];

            const x = c * TILE;
            const y = r * TILE;

            if (tile === "wall") {

                ctx.fillStyle = "#1d3a6e";
                ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);

            } else if (tile === "dot") {

                ctx.fillStyle = "#f6d97a";
                ctx.beginPath();
                ctx.arc(x + TILE / 2, y + TILE / 2, 2.6, 0, Math.PI * 2);
                ctx.fill();

            } else if (tile === "pellet") {

                ctx.fillStyle = "#f6d97a";
                ctx.beginPath();
                ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
                ctx.fill();

            } else if (tile === "door") {

                ctx.fillStyle = "#7dd3fc";
                ctx.fillRect(x + 3, y + TILE / 2 - 2, TILE - 6, 3);

            }

        }

    }

}


function drawPlayer() {

    const x = (player.col + .5) * TILE;
    const y = (player.row + .5) * TILE;

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(x, y, TILE / 2 - 2, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(x, y);
    ctx.fill();

}


function drawGhost(ghost) {

    if (ghost.state !== "active" && ghost.state !== "idle") return;

    const x = (ghost.col + .5) * TILE;
    const y = (ghost.row + .5) * TILE;

    const color =
        ghost.mode === "frightened"
            ? "#3b82f6"
            : ghost.mode === "eaten"
                ? "#334155"
                : ghost.color;

    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, TILE / 2 - 2, Math.PI, 0);
    ctx.lineTo(x + TILE / 2 - 2, y + TILE / 2 - 2);
    ctx.lineTo(x, y + TILE / 2 - 5);
    ctx.lineTo(x - TILE / 2 + 2, y + TILE / 2 - 2);
    ctx.closePath();
    ctx.fill();

    if (ghost.mode !== "eaten") {

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 2.6, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 2.6, 0, Math.PI * 2);
        ctx.fill();

    }

}


function draw() {

    drawMaze();

    ghosts.forEach(drawGhost);

    drawPlayer();

}


/* =====================================================
   UPDATE / LOOP
===================================================== */

function update(delta) {

    if (!state.running || state.paused || state.over) return;

    updateGhostRelease(delta);
    updateModeSchedule(delta);
    updateFrightened(delta);

    stepPlayer(delta);

    ghosts.forEach(ghost => stepGhost(ghost, delta));

    checkGhostCollisions();

}


function gameLoop(time = 0) {

    const delta = Math.min((time - lastTime) / 1000, .05);

    lastTime = time;

    update(delta);
    draw();

    requestAnimationFrame(gameLoop);

}


/* =====================================================
   UI
===================================================== */

function updateUI() {

    document.getElementById("score").textContent =
        state.score.toLocaleString();

    document.getElementById("highScore").textContent =
        getHighScore().toLocaleString();

    document.getElementById("level").textContent =
        state.level;

    document.getElementById("lives").textContent =
        "❤️".repeat(Math.max(0, state.lives));

}


/* =====================================================
   PAUSE
===================================================== */

function togglePause() {

    if (state.over || !state.running) return;

    state.paused = !state.paused;

    if (state.paused) {

        showOverlay("⏸️ Tạm dừng", "Nhấn tiếp tục để chơi tiếp");

        document.getElementById("overlayButton").textContent = "▶ Tiếp tục";
        document.getElementById("pauseButton").textContent = "▶ Tiếp tục";

    } else {

        hideOverlay();

        document.getElementById("pauseButton").textContent = "Ⅱ Tạm dừng";

    }

}


/* =====================================================
   OVERLAY
===================================================== */

function showOverlay(title, text) {

    document.getElementById("overlayTitle").textContent = title;
    document.getElementById("overlayText").textContent = text;

    document.getElementById("gameOverlay").style.display = "flex";

}


function hideOverlay() {

    document.getElementById("gameOverlay").style.display = "none";

}


/* =====================================================
   SOUND
===================================================== */

let audioContext = null;


function beep(frequency, duration) {

    if (!state.soundEnabled) return;

    try {

        if (!audioContext) {

            audioContext =
                new (window.AudioContext || window.webkitAudioContext)();

        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(.025, audioContext.currentTime);
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
   INPUT
===================================================== */

function queueDirection(key) {

    if (!player) return;

    player.nextDir = DIRS[key];

}


const KEY_MAP = {

    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
    W: "up", S: "down", A: "left", D: "right"

};


document.addEventListener("keydown", event => {

    const dirKey = KEY_MAP[event.key];

    if (dirKey) {

        event.preventDefault();

        queueDirection(dirKey);

    }

    if (event.key.toLowerCase() === "p") {

        togglePause();

    }

});


document
    .querySelectorAll("[data-action]")
    .forEach(button => {

        button.addEventListener("click", () => {

            const action = button.dataset.action;

            if (action === "pause") {

                togglePause();

            } else if (DIRS[action]) {

                queueDirection(action);

            }

        });

    });


document
    .getElementById("startButton")
    .addEventListener("click", startGame);


document
    .getElementById("pauseButton")
    .addEventListener("click", togglePause);


document
    .getElementById("overlayButton")
    .addEventListener("click", () => {

        if (state.paused) {

            togglePause();

        } else {

            startGame();

        }

    });


document
    .getElementById("soundButton")
    .addEventListener("click", () => {

        state.soundEnabled = !state.soundEnabled;

        document.getElementById("soundButton").textContent =
            state.soundEnabled ? "🔊 Âm thanh" : "🔇 Tắt âm thanh";

    });


/* =====================================================
   INITIALIZE
===================================================== */

parseMaze();

fillDots();

resetPositions();

updateUI();

draw();

requestAnimationFrame(gameLoop);

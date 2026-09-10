/* =====================================================
   DUCK HUNT

   One duck on screen at a time, flying a wobbling path upward from
   the ground. Click/tap it before it flies off or its time runs out.
   Missing a duck costs a life (shared across the whole run, not reset
   per level); finishing a level's 8 ducks with enough hits advances
   to a faster level.
===================================================== */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/* =====================================================
   CONFIG
===================================================== */

const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 500;

const GROUND_HEIGHT = 56;
const TOP_BOUND = 30;

const DUCK_RADIUS = 26;
const DUCK_LIFETIME = 4.2;
const SPAWN_DELAY = 0.55;

const DUCKS_PER_LEVEL = 6;
const REQUIRED_HITS = 5;
const LIVES_START = 3;

const SCORE_PER_HIT = 100;

const SPEED_TIERS = [
    { level: 1, speed: 85 },
    { level: 2, speed: 100 },
    { level: 3, speed: 118 },
    { level: 4, speed: 136 },
    { level: 5, speed: 154 },
    { level: 6, speed: 172 }
];


function getDuckSpeed(level) {

    let speed = SPEED_TIERS[0].speed;

    for (const tier of SPEED_TIERS) {

        if (level >= tier.level) speed = tier.speed;

    }

    return speed;

}


function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));

}


/* =====================================================
   STATE
===================================================== */

const state = {
    score: 0,
    level: 1,
    lives: LIVES_START,
    hitsThisLevel: 0,
    duckIndexInLevel: 0,
    running: false,
    paused: false,
    over: false,
    pendingSpawnTimer: 0,
    aimX: WORLD_WIDTH / 2,
    aimY: WORLD_HEIGHT / 2,
    duck: null,
    fallingDucks: [],
    soundEnabled: true
};

let lastTime = 0;
let audioContext = null;


/* =====================================================
   STORAGE
===================================================== */

function getHighScore() {

    if (typeof GameStorage !== "undefined") {

        return GameStorage.getHighScore("duck-hunt");

    }

    return Number(localStorage.getItem("gameHub_highScore_duck-hunt") || 0);

}


function saveHighScore() {

    if (typeof GameStorage !== "undefined") {

        GameStorage.setHighScore("duck-hunt", state.score);

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
   DUCK SPAWN / FLIGHT
===================================================== */

function spawnDuck() {

    const speed = getDuckSpeed(state.level);

    const startX = 60 + Math.random() * (WORLD_WIDTH - 120);
    const goingRight = Math.random() < 0.5;

    state.duck = {
        x: startX,
        y: WORLD_HEIGHT - GROUND_HEIGHT - DUCK_RADIUS,
        vx: (goingRight ? 1 : -1) * speed * 0.6,
        vy: -speed,
        facing: goingRight ? 1 : -1,
        elapsed: 0,
        hitState: "flying"
    };

}


function scheduleNextDuck() {

    state.duck = null;
    state.pendingSpawnTimer = SPAWN_DELAY;

}


function updateDuckSpawn(dt) {

    if (state.pendingSpawnTimer <= 0) return;

    state.pendingSpawnTimer -= dt;

    if (state.pendingSpawnTimer <= 0 && state.running && !state.over && !state.paused) {

        spawnDuck();

    }

}


function updateDuck(dt) {

    const duck = state.duck;

    if (!duck || duck.hitState !== "flying") return;

    duck.elapsed += dt;

    duck.x += duck.vx * dt;
    duck.y += duck.vy * dt;

    if (duck.x < DUCK_RADIUS) {

        duck.x = DUCK_RADIUS;
        duck.vx = Math.abs(duck.vx);
        duck.facing = 1;

    }

    if (duck.x > WORLD_WIDTH - DUCK_RADIUS) {

        duck.x = WORLD_WIDTH - DUCK_RADIUS;
        duck.vx = -Math.abs(duck.vx);
        duck.facing = -1;

    }

    const escaped = duck.y < TOP_BOUND || duck.elapsed >= DUCK_LIFETIME;

    if (escaped) {

        duck.hitState = "escaped";
        resolveDuckOutcome(false);

    }

}


function updateFallingDucks(dt) {

    state.fallingDucks = state.fallingDucks.filter(d => {

        d.vy += 480 * dt;
        d.y += d.vy * dt;
        d.life -= dt * 0.7;

        return d.life > 0 && d.y < WORLD_HEIGHT + DUCK_RADIUS * 2;

    });

}


/* =====================================================
   SHOOTING
===================================================== */

function hitDuck() {

    const duck = state.duck;

    if (!duck || duck.hitState !== "flying") return false;

    duck.hitState = "hit";

    state.fallingDucks.push({
        x: duck.x,
        y: duck.y,
        vy: 40,
        facing: duck.facing,
        life: 1
    });

    resolveDuckOutcome(true);

    return true;

}


function handleShoot(px, py) {

    if (!state.running || state.paused || state.over) return;

    state.aimX = px;
    state.aimY = py;

    const duck = state.duck;

    if (duck && duck.hitState === "flying") {

        const dist = Math.hypot(px - duck.x, py - duck.y);

        if (dist <= DUCK_RADIUS) {

            hitDuck();
            return;

        }

    }

    beep(220, 0.05);

}


function shootOrStart(px, py) {

    if (!state.running || state.over) {

        startGame();
        return;

    }

    if (state.paused) return;

    handleShoot(px, py);

}


/* =====================================================
   OUTCOME / LEVEL FLOW
===================================================== */

function resolveDuckOutcome(hit) {

    if (hit) {

        state.score += SCORE_PER_HIT;
        state.hitsThisLevel++;

        beep(760, 0.12);

    } else {

        state.lives--;

        beep(160, 0.25);

        if (state.lives <= 0) {

            endGame();
            return;

        }

    }

    state.duckIndexInLevel++;

    if (state.duckIndexInLevel >= DUCKS_PER_LEVEL) {

        if (state.hitsThisLevel >= REQUIRED_HITS) {

            nextLevel();

        } else {

            endGame();

        }

        return;

    }

    scheduleNextDuck();

}


function nextLevel() {

    state.level++;
    state.hitsThisLevel = 0;
    state.duckIndexInLevel = 0;

    beep(880, 0.25);

    scheduleNextDuck();

}


/* =====================================================
   GAME FLOW
===================================================== */

function startGame() {

    state.score = 0;
    state.level = 1;
    state.lives = LIVES_START;
    state.hitsThisLevel = 0;
    state.duckIndexInLevel = 0;
    state.running = true;
    state.paused = false;
    state.over = false;
    state.duck = null;
    state.fallingDucks = [];

    hideOverlay();
    updateHud();

    scheduleNextDuck();

}


function endGame() {

    state.running = false;
    state.over = true;
    state.duck = null;
    state.pendingSpawnTimer = 0;

    saveHighScore();

    const passed = state.lives > 0;

    showOverlay(
        passed ? "🏆" : "💥",
        passed ? "Hết màn!" : "Thua rồi!",
        `Điểm của bạn: ${state.score} — Màn ${state.level}`,
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
    lives: document.getElementById("lives"),
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
    el.lives.textContent = "❤️".repeat(Math.max(0, state.lives)) || "💔";

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

function drawBackground() {

    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT - GROUND_HEIGHT);

    sky.addColorStop(0, "#1d4ed8");
    sky.addColorStop(1, "#7dd3fc");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT - GROUND_HEIGHT);

    ctx.fillStyle = "#3f6212";
    ctx.fillRect(0, WORLD_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = "#4d7c0f";

    for (let i = 0; i < 14; i++) {

        const x = (i / 14) * WORLD_WIDTH + 6;

        ctx.fillRect(x, WORLD_HEIGHT - GROUND_HEIGHT, 4, 10);

    }

}


function drawDuck(x, y, facing, alpha = 1, rotation = 0) {

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(facing < 0 ? -1 : 1, 1);

    ctx.font = `${DUCK_RADIUS * 1.8}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🦆", 0, 0);

    ctx.restore();

}


function drawDuckLayer() {

    for (const d of state.fallingDucks) {

        drawDuck(d.x, d.y, d.facing, clamp(d.life, 0, 1), (1 - d.life) * 1.4);

    }

    if (state.duck && state.duck.hitState === "flying") {

        drawDuck(state.duck.x, state.duck.y, state.duck.facing);

    }

}


function drawCrosshair() {

    if (!state.running || state.paused || state.over) return;

    const { aimX, aimY } = state;

    ctx.save();
    ctx.strokeStyle = "rgba(248,250,252,0.85)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(aimX, aimY, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(aimX - 20, aimY);
    ctx.lineTo(aimX - 6, aimY);
    ctx.moveTo(aimX + 6, aimY);
    ctx.lineTo(aimX + 20, aimY);
    ctx.moveTo(aimX, aimY - 20);
    ctx.lineTo(aimX, aimY - 6);
    ctx.moveTo(aimX, aimY + 6);
    ctx.lineTo(aimX, aimY + 20);
    ctx.stroke();

    ctx.restore();

}


function drawLevelProgress() {

    ctx.save();
    ctx.fillStyle = "rgba(8,13,25,0.55)";
    ctx.fillRect(8, 8, 140, 20);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText(
        `Vịt: ${state.duckIndexInLevel}/${DUCKS_PER_LEVEL}  Trúng: ${state.hitsThisLevel}/${REQUIRED_HITS}`,
        14,
        18
    );

    ctx.restore();

}


function render() {

    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawBackground();
    drawDuckLayer();

    if (state.running && !state.over) drawLevelProgress();

    drawCrosshair();

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

    state.aimX = p.x;
    state.aimY = p.y;

});


canvas.addEventListener("click", event => {

    const p = pointFromEvent(event.clientX, event.clientY);

    shootOrStart(p.x, p.y);

});


canvas.addEventListener("touchstart", event => {

    event.preventDefault();

    const t = event.touches[0];

    if (!t) return;

    const p = pointFromEvent(t.clientX, t.clientY);

    shootOrStart(p.x, p.y);

}, { passive: false });


canvas.addEventListener("touchmove", event => {

    event.preventDefault();

    const t = event.touches[0];

    if (!t) return;

    const p = pointFromEvent(t.clientX, t.clientY);

    state.aimX = p.x;
    state.aimY = p.y;

}, { passive: false });


document.addEventListener("keydown", event => {

    if (event.code === "Space") {

        event.preventDefault();

        if (!state.running || state.over) {

            startGame();

        } else if (!state.paused) {

            hitDuck();

        }

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

    updateDuckSpawn(dt);
    updateDuck(dt);
    updateFallingDucks(dt);

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

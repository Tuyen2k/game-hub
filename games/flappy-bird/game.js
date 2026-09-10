/* =====================================================
   FLAPPY BIRD

   Gravity-driven bird, tap/click/space to flap. Pipes spawn on a
   fixed horizontal spacing and scroll left; passing a pipe pair
   scores a point. Difficulty (pipe speed + gap size) scales through
   a fixed, capped tier table keyed off score - same convention used
   across the rest of the hub.
===================================================== */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/* =====================================================
   CONFIG
===================================================== */

const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 520;

const GROUND_HEIGHT = 60;

const BIRD_X = 110;
const BIRD_RADIUS = 15;

const GRAVITY = 1400;
const FLAP_VELOCITY = -380;
const MAX_FALL_SPEED = 620;

const PIPE_WIDTH = 52;
const PIPE_SPACING = 220;
const PIPE_MARGIN = 40;

const DIFFICULTY_TIERS = [
    { score: 0, gap: 165, speed: 130 },
    { score: 5, gap: 155, speed: 145 },
    { score: 10, gap: 145, speed: 160 },
    { score: 15, gap: 135, speed: 175 },
    { score: 20, gap: 128, speed: 190 },
    { score: 30, gap: 120, speed: 205 }
];


function getDifficulty(score) {

    let result = DIFFICULTY_TIERS[0];

    for (const tier of DIFFICULTY_TIERS) {

        if (score >= tier.score) result = tier;

    }

    return result;

}


function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));

}


/* =====================================================
   STATE
===================================================== */

const state = {
    score: 0,
    running: false,
    paused: false,
    over: false,
    distanceSinceLastPipe: 0,
    soundEnabled: true
};

let bird = null;
let pipes = [];
let lastTime = 0;
let audioContext = null;


/* =====================================================
   STORAGE
===================================================== */

function getHighScore() {

    if (typeof GameStorage !== "undefined") {

        return GameStorage.getHighScore("flappy-bird");

    }

    return Number(localStorage.getItem("gameHub_highScore_flappy-bird") || 0);

}


function saveHighScore() {

    if (typeof GameStorage !== "undefined") {

        GameStorage.setHighScore("flappy-bird", state.score);

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
   PIPES
===================================================== */

function spawnPipe() {

    const difficulty = getDifficulty(state.score);

    const playHeight = WORLD_HEIGHT - GROUND_HEIGHT;

    const minCenter = PIPE_MARGIN + difficulty.gap / 2;
    const maxCenter = playHeight - PIPE_MARGIN - difficulty.gap / 2;

    const gapCenter = minCenter + Math.random() * Math.max(1, maxCenter - minCenter);

    pipes.push({
        x: WORLD_WIDTH,
        gapCenter,
        gapSize: difficulty.gap,
        passed: false
    });

}


function updatePipes(dt) {

    const difficulty = getDifficulty(state.score);

    state.distanceSinceLastPipe += difficulty.speed * dt;

    if (state.distanceSinceLastPipe >= PIPE_SPACING) {

        state.distanceSinceLastPipe = 0;
        spawnPipe();

    }

    for (const pipe of pipes) {

        pipe.x -= difficulty.speed * dt;

        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {

            pipe.passed = true;
            state.score++;

            beep(660, 0.08);

        }

    }

    pipes = pipes.filter(p => p.x + PIPE_WIDTH > -10);

}


/* =====================================================
   COLLISION
===================================================== */

function circleRectCollide(cx, cy, radius, rx, ry, rw, rh) {

    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);

    const dx = cx - closestX;
    const dy = cy - closestY;

    return (dx * dx + dy * dy) < radius * radius;

}


function checkCollisions() {

    const playHeight = WORLD_HEIGHT - GROUND_HEIGHT;

    if (bird.y - BIRD_RADIUS <= 0) {

        bird.y = BIRD_RADIUS;
        endGame();
        return;

    }

    if (bird.y + BIRD_RADIUS >= playHeight) {

        bird.y = playHeight - BIRD_RADIUS;
        endGame();
        return;

    }

    for (const pipe of pipes) {

        const topHeight = pipe.gapCenter - pipe.gapSize / 2;
        const bottomY = pipe.gapCenter + pipe.gapSize / 2;

        const hitTop = circleRectCollide(
            bird.x, bird.y, BIRD_RADIUS,
            pipe.x, 0, PIPE_WIDTH, topHeight
        );

        const hitBottom = circleRectCollide(
            bird.x, bird.y, BIRD_RADIUS,
            pipe.x, bottomY, PIPE_WIDTH, playHeight - bottomY
        );

        if (hitTop || hitBottom) {

            endGame();
            return;

        }

    }

}


/* =====================================================
   BIRD
===================================================== */

function flap() {

    if (!state.running || state.over) {

        startGame();
        return;

    }

    if (state.paused) return;

    bird.vy = FLAP_VELOCITY;

    beep(420, 0.06);

}


function updateBird(dt) {

    bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL_SPEED);
    bird.y += bird.vy * dt;
    bird.rotation = clamp(bird.vy / MAX_FALL_SPEED, -0.5, 1.1);

}


/* =====================================================
   GAME FLOW
===================================================== */

function startGame() {

    state.score = 0;
    state.running = true;
    state.paused = false;
    state.over = false;
    state.distanceSinceLastPipe = PIPE_SPACING * 0.55;

    bird = {
        x: BIRD_X,
        y: WORLD_HEIGHT / 2,
        vy: 0,
        rotation: 0
    };

    pipes = [];

    hideOverlay();
    updateHud();

}


function endGame() {

    state.running = false;
    state.over = true;

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

    sky.addColorStop(0, "#0ea5e9");
    sky.addColorStop(1, "#bae6fd");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT - GROUND_HEIGHT);

    ctx.fillStyle = "#a16207";
    ctx.fillRect(0, WORLD_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = "#65a30d";
    ctx.fillRect(0, WORLD_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, 10);

}


function drawPipes() {

    const playHeight = WORLD_HEIGHT - GROUND_HEIGHT;

    for (const pipe of pipes) {

        const topHeight = pipe.gapCenter - pipe.gapSize / 2;
        const bottomY = pipe.gapCenter + pipe.gapSize / 2;

        ctx.fillStyle = "#22c55e";

        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, playHeight - bottomY);

        ctx.fillStyle = "#16a34a";

        ctx.fillRect(pipe.x - 4, topHeight - 18, PIPE_WIDTH + 8, 18);
        ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 18);

    }

}


function drawBird() {

    if (!bird) return;

    ctx.save();

    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    ctx.font = `${BIRD_RADIUS * 2.2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐤", 0, 0);

    ctx.restore();

}


function render() {

    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawBackground();
    drawPipes();
    drawBird();

}


/* =====================================================
   INPUT
===================================================== */

canvas.addEventListener("click", () => {

    flap();

});


canvas.addEventListener("touchstart", event => {

    event.preventDefault();

    flap();

}, { passive: false });


document.addEventListener("keydown", event => {

    if (event.code === "Space") {

        event.preventDefault();
        flap();

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

    updateBird(dt);
    updatePipes(dt);
    checkCollisions();

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

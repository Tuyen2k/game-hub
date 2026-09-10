/* =====================================================
   TOWER STACK
   Endless block-stacking reflex game. A block slides back and
   forth above the tower; drop it to cut it to the overlap with
   the block below (or keep full width on a "Perfect" hit). Miss
   completely and the run ends.
===================================================== */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/* =========================
   CONFIG
========================= */

const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 560;

const BLOCK_HEIGHT = 34;
const BASE_WIDTH = 170;

const TOP_MARGIN = 110;
const PERFECT_TOLERANCE = 6;

const GRAVITY = 900;


/* =========================
   SPEED TABLE

   Fixed horizontal speed (px/second) per stacked-layer milestone,
   capped once the tower is tall enough instead of speeding up
   forever - same approach used for Snake and Tetris.
========================= */

const SPEED_TIERS = [
    { minLayers: 0, speed: 120 },
    { minLayers: 15, speed: 155 },
    { minLayers: 30, speed: 190 },
    { minLayers: 45, speed: 225 },
    { minLayers: 60, speed: 260 },
    { minLayers: 75, speed: 295 },
    { minLayers: 90, speed: 330 },
    { minLayers: 105, speed: 365 }
];


function getSpeed(layers) {

    let speed =
        SPEED_TIERS[0].speed;

    for (
        const tier
        of SPEED_TIERS
    ) {

        if (
            layers >=
            tier.minLayers
        ) {

            speed =
                tier.speed;

        }

    }

    return speed;

}


/* =========================
   STATE
========================= */

let blocks = [];

let current = null;

let fallingPieces = [];

let cameraOffset = 0;

let score = 0;

let streak = 0;

let running = false;

let paused = false;

let over = false;

let lastTime = 0;

let soundEnabled = true;

let audioContext = null;


/* =========================
   STORAGE
========================= */

function getHighScore() {

    if (
        typeof GameStorage !==
        "undefined"
    ) {

        return GameStorage
            .getHighScore("tower-stack");

    }

    return Number(
        localStorage.getItem(
            "gameHub_highScore_tower-stack"
        ) || 0
    );

}


function saveHighScore() {

    if (
        typeof GameStorage !==
        "undefined"
    ) {

        GameStorage.setHighScore(
            "tower-stack",
            score
        );

        return;

    }

    const current =
        getHighScore();

    if (
        score > current
    ) {

        localStorage.setItem(
            "gameHub_highScore_tower-stack",
            score
        );

    }

}


/* =========================
   CANVAS
========================= */

function resizeCanvas() {

    const dpr =
        window.devicePixelRatio ||
        1;

    canvas.width =
        WORLD_WIDTH * dpr;

    canvas.height =
        WORLD_HEIGHT * dpr;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

}


resizeCanvas();

window.addEventListener(
    "resize",
    resizeCanvas
);


/* =========================
   CAMERA

   The base block always sits at the bottom of the world. Once the
   tower grows tall enough that the moving block would render above
   TOP_MARGIN, the camera scrolls up (cameraOffset only ever grows)
   to keep it pinned there, while lower blocks scroll out of view.
========================= */

function screenY(layerIndex) {

    const worldY =
        layerIndex * BLOCK_HEIGHT;

    return (
        WORLD_HEIGHT - BLOCK_HEIGHT
    ) - (
        worldY - cameraOffset
    );

}


function updateCamera() {

    const movingLayer =
        blocks.length;

    const rawScreenY =
        screenY(movingLayer);

    if (
        rawScreenY < TOP_MARGIN
    ) {

        cameraOffset +=
            TOP_MARGIN - rawScreenY;

    }

}


/* =========================
   SPAWN
========================= */

function spawnNext() {

    const below =
        blocks[blocks.length - 1];

    const layer =
        blocks.length;

    const startFromLeft =
        layer % 2 === 0;

    current = {

        x:
            startFromLeft
                ? -below.width
                : WORLD_WIDTH,

        width:
            below.width,

        dir:
            startFromLeft
                ? 1
                : -1,

        speed:
            getSpeed(layer),

        hue:
            (layer * 27) % 360

    };

}


/* =========================
   FALLING PIECES (cosmetic)
========================= */

function makeFallingPiece(x, layerIndex, width, hue, dir) {

    return {

        x,

        y:
            screenY(layerIndex),

        width,

        height:
            BLOCK_HEIGHT,

        hue,

        vy: 0,

        vx:
            dir * 50,

        alpha: 1

    };

}


/* =========================
   PLACE / DROP
========================= */

function placeBlock(x, width, hue, isPerfect) {

    blocks.push(
        { x, width, hue }
    );

    if (isPerfect) {

        streak++;

        score +=
            1 + Math.min(streak, 10);

        beep(
            700 + streak * 30,
            .08
        );

    } else {

        streak = 0;

        score += 1;

        beep(
            400,
            .06
        );

    }

    current = null;

    saveHighScore();

    updateUI();

    spawnNext();

    updateCamera();

}


function drop() {

    if (
        !running ||
        paused ||
        over ||
        !current
    ) return;

    const below =
        blocks[blocks.length - 1];

    const dx =
        current.x - below.x;


    if (
        Math.abs(dx) <=
        PERFECT_TOLERANCE
    ) {

        placeBlock(
            below.x,
            below.width,
            current.hue,
            true
        );

        return;

    }


    const left =
        Math.max(
            current.x,
            below.x
        );

    const right =
        Math.min(
            current.x + current.width,
            below.x + below.width
        );

    const overlap =
        right - left;


    if (overlap <= 0) {

        fallingPieces.push(
            makeFallingPiece(
                current.x,
                blocks.length,
                current.width,
                current.hue,
                current.dir
            )
        );

        current = null;

        endGame();

        return;

    }


    if (current.x < left) {

        fallingPieces.push(
            makeFallingPiece(
                current.x,
                blocks.length,
                left - current.x,
                current.hue,
                -1
            )
        );

    }

    if (current.x + current.width > right) {

        fallingPieces.push(
            makeFallingPiece(
                right,
                blocks.length,
                (current.x + current.width) - right,
                current.hue,
                1
            )
        );

    }


    placeBlock(
        left,
        overlap,
        current.hue,
        false
    );

}


/* =========================
   UPDATE
========================= */

function update(delta) {

    if (
        running &&
        !paused &&
        !over &&
        current
    ) {

        current.x +=
            current.dir *
            current.speed *
            (delta / 1000);


        if (
            current.dir === 1 &&
            current.x + current.width > WORLD_WIDTH
        ) {

            current.x =
                WORLD_WIDTH - current.width;

            current.dir = -1;

        } else if (
            current.dir === -1 &&
            current.x < 0
        ) {

            current.x = 0;

            current.dir = 1;

        }

    }


    fallingPieces.forEach(
        piece => {

            piece.vy +=
                GRAVITY * (delta / 1000);

            piece.y +=
                piece.vy * (delta / 1000);

            piece.x +=
                piece.vx * (delta / 1000);

            piece.alpha -=
                delta / 700;

        }
    );

    fallingPieces =
        fallingPieces.filter(
            piece =>
                piece.alpha > 0 &&
                piece.y < WORLD_HEIGHT + 100
        );

}


/* =========================
   DRAW
========================= */

function drawBlockRaw(x, y, width, height, hue) {

    ctx.fillStyle =
        `hsl(${hue}, 65%, 55%)`;

    ctx.fillRect(
        x,
        y,
        width,
        height
    );

    ctx.strokeStyle =
        `hsl(${hue}, 65%, 32%)`;

    ctx.lineWidth = 2;

    ctx.strokeRect(
        x,
        y,
        width,
        height
    );

}


function draw() {

    ctx.clearRect(
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );


    blocks.forEach(
        (block, index) => {

            const y =
                screenY(index);

            if (
                y > -BLOCK_HEIGHT &&
                y < WORLD_HEIGHT
            ) {

                drawBlockRaw(
                    block.x,
                    y,
                    block.width,
                    BLOCK_HEIGHT,
                    block.hue
                );

            }

        }
    );


    if (current) {

        drawBlockRaw(
            current.x,
            screenY(blocks.length),
            current.width,
            BLOCK_HEIGHT,
            current.hue
        );

    }


    fallingPieces.forEach(
        piece => {

            ctx.save();

            ctx.globalAlpha =
                Math.max(0, piece.alpha);

            drawBlockRaw(
                piece.x,
                piece.y,
                piece.width,
                piece.height,
                piece.hue
            );

            ctx.restore();

        }
    );

}


/* =========================
   GAME LOOP
========================= */

function gameLoop(time = 0) {

    const delta =
        Math.min(time - lastTime, 50);

    lastTime = time;

    update(delta);

    draw();

    requestAnimationFrame(
        gameLoop
    );

}


/* =========================
   START / END
========================= */

function startGame() {

    blocks = [
        {
            x: (WORLD_WIDTH - BASE_WIDTH) / 2,
            width: BASE_WIDTH,
            hue: 0
        }
    ];

    fallingPieces = [];

    cameraOffset = 0;

    score = 0;

    streak = 0;

    running = true;

    paused = false;

    over = false;


    spawnNext();

    updateCamera();

    hideOverlay();

    updateUI();


    document.getElementById(
        "pauseButton"
    ).textContent =
        "Ⅱ Tạm dừng";


    beep(
        500,
        .06
    );

}


function endGame() {

    running = false;

    over = true;


    saveHighScore();

    beep(
        120,
        .3
    );


    showOverlay(
        "💥 Game Over",
        `Bạn xếp được ${Math.max(0, blocks.length - 1)} tầng, ${score.toLocaleString()} điểm`
    );

    document.getElementById(
        "overlayButton"
    ).textContent =
        "🔄 Chơi lại";


    updateUI();

}


/* =========================
   PAUSE
========================= */

function togglePause() {

    if (
        over ||
        !running
    ) return;

    paused = !paused;


    if (paused) {

        showOverlay(
            "⏸️ Tạm dừng",
            "Nhấn tiếp tục để quay lại"
        );

        document.getElementById(
            "overlayButton"
        ).textContent =
            "▶ Tiếp tục";


        document.getElementById(
            "pauseButton"
        ).textContent =
            "▶ Tiếp tục";

    } else {

        hideOverlay();

        document.getElementById(
            "pauseButton"
        ).textContent =
            "Ⅱ Tạm dừng";

    }

}


/* =========================
   UI
========================= */

function updateUI() {

    document.getElementById(
        "score"
    ).textContent =
        score.toLocaleString();

    document.getElementById(
        "highScore"
    ).textContent =
        getHighScore().toLocaleString();

    document.getElementById(
        "layers"
    ).textContent =
        Math.max(0, blocks.length - 1);

    document.getElementById(
        "streak"
    ).textContent =
        streak;

}


/* =========================
   OVERLAY
========================= */

function showOverlay(title, text) {

    document.getElementById(
        "overlayTitle"
    ).textContent =
        title;

    document.getElementById(
        "overlayText"
    ).textContent =
        text;

    document.getElementById(
        "gameOverlay"
    ).style.display =
        "flex";

}


function hideOverlay() {

    document.getElementById(
        "gameOverlay"
    ).style.display =
        "none";

}


/* =========================
   SOUND
========================= */

function beep(frequency, duration) {

    if (!soundEnabled) return;

    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "sine";

        oscillator.frequency.value =
            frequency;

        gain.gain.setValueAtTime(
            .03,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            .001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + duration
        );

    } catch (e) {

        // Web Audio not available: game keeps running silently.

    }

}


/* =========================
   INPUT
========================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.code === "Space") {

            event.preventDefault();

            if (!running || over) {

                startGame();

            } else {

                drop();

            }

        }

        if (event.key.toLowerCase() === "p") {

            togglePause();

        }

    }
);


canvas.addEventListener(
    "pointerdown",
    event => {

        event.preventDefault();

        if (!running || over) {

            startGame();

        } else {

            drop();

        }

    }
);


document
    .getElementById("startButton")
    .addEventListener(
        "click",
        startGame
    );


document
    .getElementById("pauseButton")
    .addEventListener(
        "click",
        togglePause
    );


document
    .getElementById("overlayButton")
    .addEventListener(
        "click",
        () => {

            if (paused) {

                togglePause();

            } else {

                startGame();

            }

        }
    );


document
    .getElementById("soundButton")
    .addEventListener(
        "click",
        () => {

            soundEnabled = !soundEnabled;

            document.getElementById(
                "soundButton"
            ).textContent =
                soundEnabled
                    ? "🔊 Âm thanh"
                    : "🔇 Tắt âm thanh";

        }
    );


/* =========================
   INITIALIZE
========================= */

updateUI();

draw();

requestAnimationFrame(
    gameLoop
);

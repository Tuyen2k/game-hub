/* =====================================================
   DINO RUN
===================================================== */

const canvas =
    document.getElementById(
        "gameCanvas"
    );

const ctx =
    canvas.getContext("2d");


/* =====================================================
   CONFIG
===================================================== */

const WORLD_WIDTH = 760;

const WORLD_HEIGHT = 320;

const GROUND_Y = 255;

const GRAVITY = 2200;

const JUMP_FORCE = -780;

const INITIAL_SPEED = 320;

const MAX_SPEED = 850;


/* =====================================================
   STATE
===================================================== */

let running = false;

let paused = false;

let gameOver = false;

let soundEnabled = true;

let score = 0;

let distance = 0;

let speed = INITIAL_SPEED;

let lastTime = 0;

let obstacleTimer = 0;

let nextObstacle =
    1.2;


/* =====================================================
   DINO
===================================================== */

const dino = {

    x: 80,

    y: GROUND_Y - 54,

    width: 44,

    height: 54,

    velocityY: 0,

    jumping: false

};


/* =====================================================
   OBSTACLES
===================================================== */

let obstacles = [];


/* =====================================================
   CLOUDS
===================================================== */

let clouds = [

    {
        x: 120,
        y: 55,
        width: 70
    },

    {
        x: 420,
        y: 80,
        width: 90
    },

    {
        x: 650,
        y: 45,
        width: 60
    }

];


/* =====================================================
   STORAGE
===================================================== */

const HIGH_SCORE_KEY =
    "gameHub_dino_highScore";


function getHighScore() {

    return Number(
        localStorage.getItem(
            HIGH_SCORE_KEY
        ) || 0
    );

}


function saveHighScore() {

    if (
        score >
        getHighScore()
    ) {

        localStorage.setItem(
            HIGH_SCORE_KEY,
            Math.floor(score)
        );

    }

}


/* =====================================================
   CANVAS
===================================================== */

function resizeCanvas() {

    const rect =
        canvas.getBoundingClientRect();


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


/* =====================================================
   DRAW SKY
===================================================== */

function drawBackground() {

    const night =
        Math.floor(
            distance / 800
        ) % 2 === 1;


    ctx.fillStyle =
        night
            ? "#17213b"
            : "#e7f0fb";


    ctx.fillRect(
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );


    drawClouds();


    ctx.fillStyle =
        night
            ? "#8da1c2"
            : "#8fa5bd";


    ctx.fillRect(
        0,
        GROUND_Y,
        WORLD_WIDTH,
        2
    );


    drawGround();

}


/* =====================================================
   CLOUDS
===================================================== */

function drawClouds() {

    ctx.fillStyle =
        "rgba(255,255,255,.75)";


    clouds.forEach(
        cloud => {

            ctx.beginPath();


            ctx.arc(
                cloud.x,
                cloud.y,
                18,
                0,
                Math.PI * 2
            );


            ctx.arc(
                cloud.x + 20,
                cloud.y - 8,
                23,
                0,
                Math.PI * 2
            );


            ctx.arc(
                cloud.x + 45,
                cloud.y,
                17,
                0,
                Math.PI * 2
            );


            ctx.fill();

        }
    );

}


/* =====================================================
   GROUND
===================================================== */

function drawGround() {

    ctx.fillStyle =
        "#63758c";


    const offset =
        (
            distance * 2
        ) % 32;


    for (
        let x = -offset;
        x < WORLD_WIDTH;
        x += 32
    ) {

        ctx.fillRect(
            x,
            GROUND_Y + 15,
            18,
            2
        );

    }

}


/* =====================================================
   DRAW DINO
===================================================== */

function drawDino() {

    const x =
        dino.x;

    const y =
        dino.y;


    ctx.fillStyle =
        "#243b5c";


    /*
     * Body
     */

    ctx.fillRect(
        x + 8,
        y + 20,
        28,
        25
    );


    /*
     * Head
     */

    ctx.fillRect(
        x + 22,
        y + 5,
        25,
        25
    );


    /*
     * Snout
     */

    ctx.fillRect(
        x + 40,
        y + 15,
        15,
        10
    );


    /*
     * Tail
     */

    ctx.beginPath();

    ctx.moveTo(
        x + 10,
        y + 25
    );

    ctx.lineTo(
        x - 10,
        y + 38
    );

    ctx.lineTo(
        x + 12,
        y + 36
    );

    ctx.fill();


    /*
     * Legs
     */

    const legOffset =
        Math.floor(
            distance / 15
        ) % 2 === 0
            ? 0
            : 5;


    ctx.fillRect(
        x + 10,
        y + 42,
        8,
        12 + legOffset
    );


    ctx.fillRect(
        x + 28,
        y + 42,
        8,
        12 - legOffset
    );


    /*
     * Eye
     */

    ctx.fillStyle =
        "#ffffff";


    ctx.fillRect(
        x + 39,
        y + 10,
        4,
        4
    );

}


/* =====================================================
   DRAW OBSTACLE
===================================================== */

function drawObstacle(
    obstacle
) {

    ctx.fillStyle =
        obstacle.type === "bird"
            ? "#334155"
            : "#356b4e";


    if (
        obstacle.type === "cactus"
    ) {

        ctx.fillRect(
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
        );


        ctx.fillRect(
            obstacle.x - 8,
            obstacle.y + 18,
            8,
            17
        );


        ctx.fillRect(
            obstacle.x + obstacle.width,
            obstacle.y + 28,
            8,
            17
        );

    } else {

        /*
         * Bird
         */

        ctx.fillRect(
            obstacle.x,
            obstacle.y + 10,
            42,
            12
        );


        ctx.fillRect(
            obstacle.x + 12,
            obstacle.y,
            18,
            10
        );


        const wing =
            Math.floor(
                distance / 10
            ) % 2;


        if (wing === 0) {

            ctx.fillRect(
                obstacle.x + 5,
                obstacle.y - 5,
                14,
                6
            );

        } else {

            ctx.fillRect(
                obstacle.x + 5,
                obstacle.y + 22,
                14,
                6
            );

        }

    }

}


/* =====================================================
   SPAWN
===================================================== */

function spawnObstacle() {

    const bird =
        distance > 350 &&
        Math.random() < .3;


    if (bird) {

        obstacles.push({

            type: "bird",

            x: WORLD_WIDTH + 20,

            y:
                GROUND_Y -
                75 -
                Math.random() * 30,

            width: 42,

            height: 28

        });

    } else {

        const height =
            30 +
            Math.random() * 30;


        obstacles.push({

            type: "cactus",

            x: WORLD_WIDTH + 20,

            y:
                GROUND_Y -
                height,

            width:
                18 +
                Math.random() * 8,

            height

        });

    }

}


/* =====================================================
   COLLISION
===================================================== */

function isColliding(
    a,
    b
) {

    const padding = 6;


    return (

        a.x + padding <
        b.x + b.width - padding

        &&

        a.x +
        a.width -
        padding >
        b.x + padding

        &&

        a.y + padding <
        b.y + b.height - padding

        &&

        a.y +
        a.height -
        padding >
        b.y + padding

    );

}


/* =====================================================
   JUMP
===================================================== */

function jump() {

    if (
        !running ||
        paused ||
        gameOver
    ) {

        return;

    }


    if (
        !dino.jumping
    ) {

        dino.velocityY =
            JUMP_FORCE;

        dino.jumping =
            true;


        beep(
            520,
            .06
        );

    }

}


/* =====================================================
   UPDATE
===================================================== */

function update(
    delta
) {

    if (
        !running ||
        paused ||
        gameOver
    ) {

        return;

    }


    /*
     * Speed
     */

    speed =
        Math.min(
            MAX_SPEED,
            INITIAL_SPEED +
            distance * 0.8
        );


    /*
     * Distance
     */

    distance +=
        speed *
        delta /
        10;


    score +=
        speed *
        delta /
        10;


    /*
     * Dino physics
     */

    dino.velocityY +=
        GRAVITY *
        delta;


    dino.y +=
        dino.velocityY *
        delta;


    if (
        dino.y >=
        GROUND_Y -
        dino.height
    ) {

        dino.y =
            GROUND_Y -
            dino.height;

        dino.velocityY =
            0;

        dino.jumping =
            false;

    }


    /*
     * Spawn
     */

    obstacleTimer +=
        delta;


    if (
        obstacleTimer >=
        nextObstacle
    ) {

        spawnObstacle();


        obstacleTimer =
            0;


        const min =
            Math.max(
                .65,
                1.25 -
                distance / 3000
            );


        const max =
            Math.max(
                .9,
                1.8 -
                distance / 2500
            );


        nextObstacle =
            min +
            Math.random() *
            (
                max - min
            );

    }


    /*
     * Move obstacles
     */

    obstacles.forEach(
        obstacle => {

            obstacle.x -=
                speed *
                delta;

        }
    );


    obstacles =
        obstacles.filter(
            obstacle =>
                obstacle.x +
                obstacle.width >
                -50
        );


    /*
     * Move clouds
     */

    clouds.forEach(
        cloud => {

            cloud.x -=
                speed *
                delta *
                .08;


            if (
                cloud.x +
                cloud.width <
                -30
            ) {

                cloud.x =
                    WORLD_WIDTH +
                    Math.random() *
                    100;

                cloud.y =
                    40 +
                    Math.random() *
                    70;

            }

        }
    );


    /*
     * Collision
     */

    for (
        const obstacle
        of obstacles
    ) {

        if (
            isColliding(
                dino,
                obstacle
            )
        ) {

            endGame();

            break;

        }

    }


    updateUI();

}


/* =====================================================
   DRAW
===================================================== */

function draw() {

    ctx.clearRect(
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );


    drawBackground();


    obstacles.forEach(
        drawObstacle
    );


    drawDino();

}


/* =====================================================
   LOOP
===================================================== */

function gameLoop(
    timestamp
) {

    if (
        !lastTime
    ) {

        lastTime =
            timestamp;

    }


    const delta =
        Math.min(
            .033,
            (
                timestamp -
                lastTime
            ) / 1000
        );


    lastTime =
        timestamp;


    update(
        delta
    );


    draw();


    requestAnimationFrame(
        gameLoop
    );

}


/* =====================================================
   START
===================================================== */

function startGame() {

    running =
        true;

    paused =
        false;

    gameOver =
        false;


    score = 0;

    distance = 0;

    speed =
        INITIAL_SPEED;


    obstacleTimer = 0;

    nextObstacle = 1.2;


    obstacles = [];


    dino.y =
        GROUND_Y -
        dino.height;


    dino.velocityY =
        0;


    dino.jumping =
        false;


    lastTime = 0;


    hideOverlay();

    updateUI();


    beep(
        400,
        .05
    );

}


/* =====================================================
   END GAME
===================================================== */

function endGame() {

    running =
        false;

    gameOver =
        true;


    saveHighScore();


    beep(
        120,
        .25
    );


    showOverlay(

        "💥 Game Over",

        `Bạn đã chạy ${Math.floor(distance)}m`

    );


    document.getElementById(
        "overlayButton"
    ).textContent =
        "🔄 Chơi lại";


    updateUI();

}


/* =====================================================
   PAUSE
===================================================== */

function togglePause() {

    if (
        gameOver ||
        !running
    ) {

        return;

    }


    paused =
        !paused;


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


/* =====================================================
   UI
===================================================== */

function updateUI() {

    document.getElementById(
        "score"
    ).textContent =
        Math.floor(score)
            .toLocaleString();


    document.getElementById(
        "highScore"
    ).textContent =
        getHighScore()
            .toLocaleString();


    document.getElementById(
        "speed"
    ).textContent =
        (
            speed /
            INITIAL_SPEED
        ).toFixed(1) +
        "x";


    document.getElementById(
        "distance"
    ).textContent =
        Math.floor(
            distance
        ) +
        "m";

}


/* =====================================================
   OVERLAY
===================================================== */

function showOverlay(
    title,
    text
) {

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


/* =====================================================
   SOUND
===================================================== */

let audioContext = null;


function beep(
    frequency,
    duration
) {

    if (
        !soundEnabled
    ) {

        return;

    }


    try {

        if (
            !audioContext
        ) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }


        const oscillator =
            audioContext
                .createOscillator();


        const gain =
            audioContext
                .createGain();


        oscillator.type =
            "square";


        oscillator.frequency.value =
            frequency;


        gain.gain.setValueAtTime(
            .025,
            audioContext.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            .001,
            audioContext.currentTime +
            duration
        );


        oscillator.connect(
            gain
        );


        gain.connect(
            audioContext.destination
        );


        oscillator.start();


        oscillator.stop(
            audioContext.currentTime +
            duration
        );

    } catch {

        // Audio không khả dụng

    }

}


/* =====================================================
   INPUT
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.code ===
            "Space" ||
            event.code ===
            "ArrowUp"
        ) {

            event.preventDefault();


            if (
                !running ||
                gameOver
            ) {

                startGame();

            } else {

                jump();

            }

        }


        if (
            event.key.toLowerCase() ===
            "p"
        ) {

            togglePause();

        }

    }
);


canvas.addEventListener(
    "pointerdown",
    event => {

        event.preventDefault();


        if (
            !running ||
            gameOver
        ) {

            startGame();

        } else {

            jump();

        }

    }
);


document
    .getElementById(
        "startButton"
    )
    .addEventListener(
        "click",
        startGame
    );


document
    .getElementById(
        "pauseButton"
    )
    .addEventListener(
        "click",
        togglePause
    );


document
    .getElementById(
        "overlayButton"
    )
    .addEventListener(
        "click",
        () => {

            if (
                paused
            ) {

                togglePause();

            } else {

                startGame();

            }

        }
    );


document
    .getElementById(
        "soundButton"
    )
    .addEventListener(
        "click",
        () => {

            soundEnabled =
                !soundEnabled;


            document.getElementById(
                "soundButton"
            ).textContent =

                soundEnabled
                    ? "🔊 Âm thanh"
                    : "🔇 Tắt âm thanh";

        }
    );


/* =====================================================
   INITIALIZE
===================================================== */

updateUI();

draw();

requestAnimationFrame(
    gameLoop
);
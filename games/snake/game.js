const canvas =
    document.getElementById("game");

const ctx =
    canvas.getContext("2d");


/* =========================
   CONFIG
========================= */

const GRID = 20;

const CELL =
    canvas.width / GRID;


/* =========================
   STATE
========================= */

let snake;

let food;

let direction;

let nextDirection;

let score = 0;

let speed = 1;

let running = false;

let paused = false;

let timer = null;

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
            .getHighScore("snake");

    }

    return Number(
        localStorage.getItem(
            "gameHub_highScore_snake"
        ) || 0
    );

}


function saveHighScore() {

    if (
        typeof GameStorage !==
        "undefined"
    ) {

        GameStorage.setHighScore(
            "snake",
            score
        );

        return;

    }

}


/* =========================
   RANDOM FOOD
========================= */

function createFood() {

    let position;


    do {

        position = {

            x:
                Math.floor(
                    Math.random() *
                    GRID
                ),

            y:
                Math.floor(
                    Math.random() *
                    GRID
                )

        };

    } while (
        snake.some(
            part =>
                part.x === position.x &&
                part.y === position.y
        )
    );


    return position;

}


/* =========================
   START
========================= */

function startGame() {

    clearInterval(timer);


    snake = [

        {
            x: 10,
            y: 10
        },

        {
            x: 9,
            y: 10
        },

        {
            x: 8,
            y: 10
        }

    ];


    direction = {
        x: 1,
        y: 0
    };


    nextDirection = {
        x: 1,
        y: 0
    };


    score = 0;

    speed = 1;

    running = true;

    paused = false;


    food =
        createFood();


    updateStats();


    hideOverlay();


    startTimer();


    draw();

}


/* =========================
   TIMER
========================= */

function startTimer() {

    clearInterval(timer);


    timer =
        setInterval(
            tick,
            getInterval()
        );

}


function getInterval() {

    return Math.max(
        55,
        150 -
        (
            speed - 1
        ) * 8
    );

}


/* =========================
   TICK
========================= */

function tick() {

    if (
        !running ||
        paused
    ) return;


    direction =
        nextDirection;


    const head = {

        x:
            snake[0].x +
            direction.x,

        y:
            snake[0].y +
            direction.y

    };


    /* Wall */

    if (
        head.x < 0 ||
        head.x >= GRID ||
        head.y < 0 ||
        head.y >= GRID
    ) {

        gameOver();

        return;

    }


    /* Self collision */

    const hitSelf =
        snake.some(
            (part, index) => {

                /*
                 * Cho phép đầu đi vào
                 * vị trí đuôi nếu đuôi
                 * sẽ được loại bỏ ở tick này.
                 */

                const isTail =
                    index ===
                    snake.length - 1;

                if (
                    isTail &&
                    !(
                        head.x === food.x &&
                        head.y === food.y
                    )
                ) {

                    return false;

                }


                return (
                    part.x === head.x &&
                    part.y === head.y
                );

            }
        );


    if (hitSelf) {

        gameOver();

        return;

    }


    snake.unshift(
        head
    );


    /* Eat */

    if (
        head.x === food.x &&
        head.y === food.y
    ) {

        eatFood();

    } else {

        snake.pop();

    }


    draw();

}


/* =========================
   EAT FOOD
========================= */

function eatFood() {

    score += 10;


    speed =
        Math.floor(
            score / 50
        ) + 1;


    food =
        createFood();


    saveHighScore();


    updateStats();


    beep(
        600,
        .08
    );


    startTimer();

}


/* =========================
   DRAW
========================= */

function draw() {

    drawBackground();

    drawGrid();

    drawFood();

    drawSnake();

}


/* =========================
   BACKGROUND
========================= */

function drawBackground() {

    ctx.fillStyle =
        "#050914";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

}


/* =========================
   GRID
========================= */

function drawGrid() {

    ctx.strokeStyle =
        "rgba(255,255,255,.035)";


    ctx.lineWidth =
        1;


    for (
        let i = 0;
        i <= GRID;
        i++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i * CELL,
            0
        );

        ctx.lineTo(
            i * CELL,
            canvas.height
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.moveTo(
            0,
            i * CELL
        );

        ctx.lineTo(
            canvas.width,
            i * CELL
        );

        ctx.stroke();

    }

}


/* =========================
   FOOD
========================= */

function drawFood() {

    const centerX =
        food.x * CELL +
        CELL / 2;

    const centerY =
        food.y * CELL +
        CELL / 2;


    ctx.beginPath();


    ctx.arc(
        centerX,
        centerY,
        CELL * .34,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#f87171";


    ctx.fill();


    ctx.beginPath();


    ctx.arc(
        centerX - 3,
        centerY - 3,
        CELL * .11,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(255,255,255,.55)";


    ctx.fill();

}


/* =========================
   SNAKE
========================= */

function drawSnake() {

    snake.forEach(
        (part, index) => {

            const padding =
                index === 0
                    ? 2
                    : 3;


            const x =
                part.x * CELL +
                padding;


            const y =
                part.y * CELL +
                padding;


            const size =
                CELL -
                padding * 2;


            ctx.fillStyle =
                index === 0
                    ? "#86efac"
                    : "#4ade80";


            roundRect(
                ctx,
                x,
                y,
                size,
                size,
                5
            );


            ctx.fill();


            if (
                index === 0
            ) {

                drawSnakeEyes(
                    part
                );

            }

        }
    );

}


/* =========================
   SNAKE HEAD EYES
========================= */

function drawSnakeEyes(
    head
) {

    const x =
        head.x * CELL;

    const y =
        head.y * CELL;


    ctx.fillStyle =
        "#052e16";


    let eye1;
    let eye2;


    if (
        direction.x === 1
    ) {

        eye1 = {
            x: x + CELL * .70,
            y: y + CELL * .30
        };

        eye2 = {
            x: x + CELL * .70,
            y: y + CELL * .70
        };

    } else if (
        direction.x === -1
    ) {

        eye1 = {
            x: x + CELL * .30,
            y: y + CELL * .30
        };

        eye2 = {
            x: x + CELL * .30,
            y: y + CELL * .70
        };

    } else if (
        direction.y === -1
    ) {

        eye1 = {
            x: x + CELL * .30,
            y: y + CELL * .30
        };

        eye2 = {
            x: x + CELL * .70,
            y: y + CELL * .30
        };

    } else {

        eye1 = {
            x: x + CELL * .30,
            y: y + CELL * .70
        };

        eye2 = {
            x: x + CELL * .70,
            y: y + CELL * .70
        };

    }


    [eye1, eye2].forEach(
        eye => {

            ctx.beginPath();

            ctx.arc(
                eye.x,
                eye.y,
                2,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }
    );

}


/* =========================
   ROUNDED RECT
========================= */

function roundRect(
    context,
    x,
    y,
    width,
    height,
    radius
) {

    context.beginPath();

    context.roundRect(
        x,
        y,
        width,
        height,
        radius
    );

}


/* =========================
   DIRECTION
========================= */

function setDirection(
    x,
    y
) {

    if (
        !running ||
        paused
    ) return;


    /*
     * Không cho quay ngược
     * trực tiếp.
     */

    if (
        direction.x === -x &&
        direction.y === -y
    ) {

        return;

    }


    nextDirection = {
        x,
        y
    };

}


/* =========================
   PAUSE
========================= */

function togglePause() {

    if (!running)
        return;


    paused =
        !paused;


    if (paused) {

        showOverlay(
            "Tạm dừng",
            "Nhấn tiếp tục để chơi"
        );

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
   GAME OVER
========================= */

function gameOver() {

    running =
        false;


    clearInterval(
        timer
    );


    saveHighScore();


    updateStats();


    beep(
        120,
        .25
    );


    showOverlay(
        "Game Over",
        `Điểm: ${score} • Kỷ lục: ${getHighScore()}`
    );

}


/* =========================
   OVERLAY
========================= */

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
        "overlayButton"
    ).textContent =
        title === "Tạm dừng"
            ? "Tiếp tục"
            : "Chơi lại";


    document.getElementById(
        "overlay"
    ).style.display =
        "flex";

}


function hideOverlay() {

    document.getElementById(
        "overlay"
    ).style.display =
        "none";

}


/* =========================
   STATS
========================= */

function updateStats() {

    document.getElementById(
        "score"
    ).textContent =
        score;


    document.getElementById(
        "highScore"
    ).textContent =
        getHighScore();


    document.getElementById(
        "speed"
    ).textContent =
        speed;


    document.getElementById(
        "length"
    ).textContent =
        snake
            ? snake.length
            : 3;

}


/* =========================
   SOUND
========================= */

function beep(
    frequency,
    duration
) {

    if (
        !soundEnabled
    ) return;


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


/* =========================
   KEYBOARD
========================= */

document.addEventListener(
    "keydown",
    event => {

        switch (
            event.key
        ) {

            case "ArrowUp":

                event.preventDefault();

                setDirection(
                    0,
                    -1
                );

                break;


            case "ArrowDown":

                event.preventDefault();

                setDirection(
                    0,
                    1
                );

                break;


            case "ArrowLeft":

                event.preventDefault();

                setDirection(
                    -1,
                    0
                );

                break;


            case "ArrowRight":

                event.preventDefault();

                setDirection(
                    1,
                    0
                );

                break;


            case "p":

            case "P":

                togglePause();

                break;

        }

    }
);


/* =========================
   BUTTONS
========================= */

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


document
    .getElementById(
        "overlayButton"
    )
    .addEventListener(
        "click",
        () => {

            const title =
                document.getElementById(
                    "overlayTitle"
                ).textContent;


            if (
                title === "Tạm dừng"
            ) {

                togglePause();

            } else {

                startGame();

            }

        }
    );


/* =========================
   MOBILE BUTTONS
========================= */

document
    .querySelectorAll(
        "[data-action]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    switch (
                        button.dataset.action
                    ) {

                        case "up":

                            setDirection(
                                0,
                                -1
                            );

                            break;


                        case "down":

                            setDirection(
                                0,
                                1
                            );

                            break;


                        case "left":

                            setDirection(
                                -1,
                                0
                            );

                            break;


                        case "right":

                            setDirection(
                                1,
                                0
                            );

                            break;


                        case "pause":

                            togglePause();

                            break;

                    }

                }
            );

        }
    );


/* =========================
   INITIAL DRAW
========================= */

snake = [
    {
        x: 10,
        y: 10
    },

    {
        x: 9,
        y: 10
    },

    {
        x: 8,
        y: 10
    }
];


direction = {
    x: 1,
    y: 0
};


nextDirection = {
    x: 1,
    y: 0
};


food =
    createFood();


updateStats();


draw();
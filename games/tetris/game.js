const COLS = 10;
const ROWS = 20;
const CELL = 30;

const canvas =
    document.getElementById("game");

const ctx =
    canvas.getContext("2d");

const nextCanvas =
    document.getElementById("next");

const nextCtx =
    nextCanvas.getContext("2d");

const nextCanvas2 =
    document.getElementById("next2");

const nextCtx2 =
    nextCanvas2.getContext("2d");

const nextCanvas3 =
    document.getElementById("next3");

const nextCtx3 =
    nextCanvas3.getContext("2d");

const holdCanvas =
    document.getElementById("hold");

const holdCtx =
    holdCanvas.getContext("2d");


/* =========================
   CONFIG
========================= */


/* =========================
   SPEED TABLE

   Fixed drop interval (ms) per level instead of an uncapped
   exponential curve - values match the previous curve's output at
   each 10-line mark, but stop getting faster at LEVEL 10 instead of
   approaching the floor forever.
========================= */

const LEVEL_DROP_INTERVALS = [
    800, 656, 538, 441, 362, 297, 243, 200, 164, 134
];

const COLORS = {

    I: "#22d3ee",

    O: "#facc15",

    T: "#a78bfa",

    S: "#4ade80",

    Z: "#f87171",

    J: "#60a5fa",

    L: "#fb923c"

};


const SHAPES = {

    I: [
        [1, 1, 1, 1]
    ],

    O: [
        [1, 1],
        [1, 1]
    ],

    T: [
        [0, 1, 0],
        [1, 1, 1]
    ],

    S: [
        [0, 1, 1],
        [1, 1, 0]
    ],

    Z: [
        [1, 1, 0],
        [0, 1, 1]
    ],

    J: [
        [1, 0, 0],
        [1, 1, 1]
    ],

    L: [
        [0, 0, 1],
        [1, 1, 1]
    ]

};


const TYPES =
    Object.keys(SHAPES);


/* =========================
   STATE
========================= */

let board;

let currentPiece;

let nextPieces = [];

let holdPiece = null;

let canHold = true;

let score = 0;

let lines = 0;

let level = 1;

let running = false;

let paused = false;

let lastTime = 0;

let dropTimer = 0;

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
            .getHighScore("tetris");

    }

    return Number(
        localStorage.getItem(
            "gameHub_highScore_tetris"
        ) || 0
    );

}


function saveHighScore() {

    if (
        typeof GameStorage !==
        "undefined"
    ) {

        GameStorage.setHighScore(
            "tetris",
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
            "gameHub_highScore_tetris",
            score
        );

    }

}


/* =========================
   BOARD
========================= */

function createBoard() {

    return Array.from(
        {
            length: ROWS
        },
        () =>
            Array(COLS).fill(null)
    );

}


/* =========================
   BAG
========================= */

function createBag() {

    const bag =
        TYPES.slice();


    for (
        let i = bag.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            bag[i],
            bag[j]
        ] =
        [
            bag[j],
            bag[i]
        ];

    }


    return bag;

}


function fillQueue() {

    while (
        nextPieces.length < 5
    ) {

        nextPieces.push(
            ...createBag()
        );

    }

}


/* =========================
   PIECE
========================= */

function createPiece(type) {

    const matrix =
        SHAPES[type].map(
            row =>
                row.slice()
        );


    return {

        type,

        matrix,

        x:
            Math.floor(
                (
                    COLS -
                    matrix[0].length
                ) / 2
            ),

        y: 0

    };

}


/* =========================
   SPAWN
========================= */

function spawnPiece() {

    fillQueue();


    currentPiece =
        createPiece(
            nextPieces.shift()
        );


    fillQueue();


    canHold = true;


    drawPreviews();


    if (
        collision(
            currentPiece
        )
    ) {

        gameOver();

    }

}


/* =========================
   COLLISION
========================= */

function collision(
    piece,
    offsetX = 0,
    offsetY = 0,
    matrix = piece.matrix
) {

    for (
        let y = 0;
        y < matrix.length;
        y++
    ) {

        for (
            let x = 0;
            x < matrix[y].length;
            x++
        ) {

            if (
                !matrix[y][x]
            ) {

                continue;

            }


            const boardX =
                piece.x +
                x +
                offsetX;


            const boardY =
                piece.y +
                y +
                offsetY;


            if (
                boardX < 0 ||
                boardX >= COLS ||
                boardY >= ROWS
            ) {

                return true;

            }


            if (
                boardY >= 0 &&
                board[boardY][boardX]
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =========================
   MOVE
========================= */

function moveLeft() {

    if (
        !running ||
        paused
    ) return;


    if (
        !collision(
            currentPiece,
            -1,
            0
        )
    ) {

        currentPiece.x--;

    }

}


function moveRight() {

    if (
        !running ||
        paused
    ) return;


    if (
        !collision(
            currentPiece,
            1,
            0
        )
    ) {

        currentPiece.x++;

    }

}


/* =========================
   ROTATION
========================= */

function rotateMatrix(matrix) {

    return matrix[0].map(
        (_, index) =>
            matrix
                .map(
                    row =>
                        row[index]
                )
                .reverse()
    );

}


function rotatePiece() {

    if (
        !running ||
        paused
    ) return;


    const oldMatrix =
        currentPiece.matrix;


    const oldX =
        currentPiece.x;


    currentPiece.matrix =
        rotateMatrix(
            currentPiece.matrix
        );


    const kicks = [
        0,
        -1,
        1,
        -2,
        2
    ];


    for (
        const offset
        of kicks
    ) {

        currentPiece.x =
            oldX + offset;


        if (
            !collision(
                currentPiece
            )
        ) {

            beep(
                500,
                0.04
            );

            return;

        }

    }


    currentPiece.matrix =
        oldMatrix;

    currentPiece.x =
        oldX;

}


/* =========================
   SOFT DROP
========================= */

function softDrop() {

    if (
        !running ||
        paused
    ) return;


    if (
        !collision(
            currentPiece,
            0,
            1
        )
    ) {

        currentPiece.y++;

        score++;

        updateStats();

    } else {

        lockPiece();

    }

}


/* =========================
   HARD DROP
========================= */

function hardDrop() {

    if (
        !running ||
        paused
    ) return;


    let distance = 0;


    while (
        !collision(
            currentPiece,
            0,
            distance + 1
        )
    ) {

        distance++;

    }


    currentPiece.y +=
        distance;


    score +=
        distance * 2;


    updateStats();


    beep(
        700,
        0.06
    );


    lockPiece();

}


/* =========================
   HOLD
========================= */

function holdCurrentPiece() {

    if (
        !running ||
        paused ||
        !canHold
    ) return;


    const currentType =
        currentPiece.type;


    if (
        holdPiece === null
    ) {

        holdPiece =
            currentType;

        spawnPiece();

    } else {

        const swap =
            holdPiece;


        holdPiece =
            currentType;


        currentPiece =
            createPiece(
                swap
            );

    }


    canHold = false;


    drawPreviews();

}


/* =========================
   LOCK
========================= */

function lockPiece() {

    currentPiece.matrix.forEach(
        (row, y) => {

            row.forEach(
                (value, x) => {

                    if (
                        value &&
                        currentPiece.y + y >= 0
                    ) {

                        board[
                            currentPiece.y + y
                        ][
                            currentPiece.x + x
                        ] =
                            currentPiece.type;

                    }

                }
            );

        }
    );


    clearLines();


    beep(
        120,
        0.04
    );


    spawnPiece();


    dropTimer = 0;

}


/* =========================
   CLEAR LINES
========================= */

function clearLines() {

    let cleared = 0;


    for (
        let y = ROWS - 1;
        y >= 0;
        y--
    ) {

        if (
            board[y].every(
                cell =>
                    cell !== null
            )
        ) {

            board.splice(
                y,
                1
            );


            board.unshift(
                Array(COLS).fill(null)
            );


            cleared++;

            y++;

        }

    }


    if (
        !cleared
    ) return;


    const points = [
        0,
        100,
        300,
        500,
        800
    ];


    score +=
        points[cleared] *
        level;


    lines +=
        cleared;


    level =
        Math.min(
            LEVEL_DROP_INTERVALS.length,
            Math.floor(
                lines / 10
            ) + 1
        );


    saveHighScore();

    updateStats();


    beep(
        250 + cleared * 100,
        0.1
    );

}


/* =========================
   GHOST
========================= */

function getGhostY() {

    let distance = 0;


    while (
        !collision(
            currentPiece,
            0,
            distance + 1
        )
    ) {

        distance++;

    }


    return (
        currentPiece.y +
        distance
    );

}


/* =========================
   DRAW CELL
========================= */

function drawCell(
    context,
    x,
    y,
    type,
    alpha = 1,
    size = CELL
) {

    context.globalAlpha =
        alpha;


    context.fillStyle =
        COLORS[type];


    context.fillRect(
        x * size + 1,
        y * size + 1,
        size - 2,
        size - 2
    );


    context.fillStyle =
        "rgba(255,255,255,.22)";


    context.fillRect(
        x * size + 3,
        y * size + 3,
        size - 6,
        Math.max(
            3,
            size * .15
        )
    );


    context.strokeStyle =
        "rgba(255,255,255,.15)";


    context.strokeRect(
        x * size + 1,
        y * size + 1,
        size - 2,
        size - 2
    );


    context.globalAlpha = 1;

}


/* =========================
   DRAW BOARD
========================= */

function drawGame() {

    ctx.fillStyle =
        "#050914";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    ctx.strokeStyle =
        "rgba(255,255,255,.035)";


    for (
        let x = 0;
        x <= COLS;
        x++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x * CELL,
            0
        );

        ctx.lineTo(
            x * CELL,
            ROWS * CELL
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y <= ROWS;
        y++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y * CELL
        );

        ctx.lineTo(
            COLS * CELL,
            y * CELL
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y < ROWS;
        y++
    ) {

        for (
            let x = 0;
            x < COLS;
            x++
        ) {

            if (
                board[y][x]
            ) {

                drawCell(
                    ctx,
                    x,
                    y,
                    board[y][x]
                );

            }

        }

    }


    if (
        !currentPiece
    ) return;


    /* Ghost */

    const ghostY =
        getGhostY();


    currentPiece.matrix.forEach(
        (row, y) => {

            row.forEach(
                (value, x) => {

                    if (value) {

                        drawCell(
                            ctx,
                            currentPiece.x + x,
                            ghostY + y,
                            currentPiece.type,
                            .18
                        );

                    }

                }
            );

        }
    );


    /* Current */

    currentPiece.matrix.forEach(
        (row, y) => {

            row.forEach(
                (value, x) => {

                    if (value) {

                        drawCell(
                            ctx,
                            currentPiece.x + x,
                            currentPiece.y + y,
                            currentPiece.type
                        );

                    }

                }
            );

        }
    );

}


/* =========================
   PREVIEW
========================= */

function drawPreview(
    context,
    type,
    size = 20
) {

    const width =
        context.canvas.width;

    const height =
        context.canvas.height;


    context.clearRect(
        0,
        0,
        width,
        height
    );


    context.fillStyle =
        "#050914";


    context.fillRect(
        0,
        0,
        width,
        height
    );


    if (!type) return;


    const matrix =
        SHAPES[type];


    const offsetX =
        (
            width -
            matrix[0].length * size
        ) / 2 / size;


    const offsetY =
        (
            height -
            matrix.length * size
        ) / 2 / size;


    matrix.forEach(
        (row, y) => {

            row.forEach(
                (value, x) => {

                    if (value) {

                        drawCell(
                            context,
                            offsetX + x,
                            offsetY + y,
                            type,
                            1,
                            size
                        );

                    }

                }
            );

        }
    );

}


function drawPreviews() {

    drawPreview(
        nextCtx,
        nextPieces[0]
    );


    drawPreview(
        nextCtx2,
        nextPieces[1],
        12
    );


    drawPreview(
        nextCtx3,
        nextPieces[2],
        12
    );


    drawPreview(
        holdCtx,
        holdPiece
    );

}


/* =========================
   STATS
========================= */

function updateStats() {

    document.getElementById(
        "score"
    ).textContent =
        score.toLocaleString();


    document.getElementById(
        "highScore"
    ).textContent =
        getHighScore().toLocaleString();


    document.getElementById(
        "level"
    ).textContent =
        level;


    document.getElementById(
        "lines"
    ).textContent =
        lines;

}


/* =========================
   SPEED
========================= */

function getDropInterval() {

    const index =
        Math.min(
            level,
            LEVEL_DROP_INTERVALS.length
        ) - 1;

    return LEVEL_DROP_INTERVALS[index];

}


/* =========================
   GAME LOOP
========================= */

function gameLoop(
    time = 0
) {

    const delta =
        time - lastTime;


    lastTime =
        time;


    if (
        running &&
        !paused
    ) {

        dropTimer +=
            delta;


        if (
            dropTimer >
            getDropInterval()
        ) {

            if (
                !collision(
                    currentPiece,
                    0,
                    1
                )
            ) {

                currentPiece.y++;

            } else {

                lockPiece();

            }


            dropTimer = 0;

        }

    }


    drawGame();


    requestAnimationFrame(
        gameLoop
    );

}


/* =========================
   START
========================= */

function startGame() {

    board =
        createBoard();


    currentPiece =
        null;


    nextPieces =
        [];


    holdPiece =
        null;


    canHold =
        true;


    score =
        0;


    lines =
        0;


    level =
        1;


    running =
        true;


    paused =
        false;


    dropTimer =
        0;


    lastTime =
        performance.now();


    document.getElementById(
        "overlay"
    ).style.display =
        "none";


    document.getElementById(
        "pauseButton"
    ).textContent =
        "Ⅱ Tạm dừng";


    updateStats();


    spawnPiece();

}


/* =========================
   PAUSE
========================= */

function togglePause() {

    if (!running) return;


    paused =
        !paused;


    const button =
        document.getElementById(
            "pauseButton"
        );


    if (paused) {

        button.textContent =
            "▶ Tiếp tục";


        showOverlay(
            "Tạm dừng",
            "Nhấn tiếp tục để chơi"
        );

    } else {

        button.textContent =
            "Ⅱ Tạm dừng";


        document.getElementById(
            "overlay"
        ).style.display =
            "none";

    }

}


/* =========================
   GAME OVER
========================= */

function gameOver() {

    running =
        false;


    saveHighScore();


    updateStats();


    showOverlay(
        "Game Over",
        "Điểm của bạn: " +
        score.toLocaleString()
    );

}


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

        if (
            [
                "ArrowLeft",
                "ArrowRight",
                "ArrowDown",
                "ArrowUp",
                " "
            ].includes(event.key)
        ) {

            event.preventDefault();

        }


        switch (
            event.key
        ) {

            case "ArrowLeft":

                moveLeft();

                break;


            case "ArrowRight":

                moveRight();

                break;


            case "ArrowDown":

                softDrop();

                break;


            case "ArrowUp":

                rotatePiece();

                break;


            case " ":

                hardDrop();

                break;


            case "c":

            case "C":

                holdCurrentPiece();

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

            if (paused) {

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

                    const action =
                        button.dataset.action;


                    if (
                        action === "left"
                    )
                        moveLeft();


                    if (
                        action === "right"
                    )
                        moveRight();


                    if (
                        action === "rotate"
                    )
                        rotatePiece();


                    if (
                        action === "down"
                    )
                        softDrop();


                    if (
                        action === "drop"
                    )
                        hardDrop();


                    if (
                        action === "hold"
                    )
                        holdCurrentPiece();


                    if (
                        action === "pause"
                    )
                        togglePause();

                }
            );

        }
    );


/* =========================
   INIT
========================= */

board =
    createBoard();


nextPieces =
    [];


fillQueue();


updateStats();


drawPreviews();


requestAnimationFrame(
    gameLoop
);
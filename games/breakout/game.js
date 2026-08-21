/* =====================================================
   BREAKOUT - MULTI LEVEL
===================================================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


/* =====================================================
   WORLD
===================================================== */

const WORLD_WIDTH = 760;
const WORLD_HEIGHT = 600;

const PADDLE_WIDTH = 110;
const PADDLE_HEIGHT = 14;

const BALL_RADIUS = 8;

const BRICK_WIDTH = 62;
const BRICK_HEIGHT = 22;
const BRICK_GAP = 7;

const BRICK_LEFT = 28;
const BRICK_TOP = 65;

const INITIAL_LIVES = 3;


/* =====================================================
   GAME STATE
===================================================== */

let running = false;
let paused = false;
let gameOver = false;
let levelComplete = false;

let soundEnabled = true;

let currentLevel = 1;
let unlockedLevel = 1;

let score = 0;
let levelScore = 0;
let lives = INITIAL_LIVES;
let combo = 0;

let lastTime = 0;

let bricks = [];


/* =====================================================
   STORAGE
===================================================== */

const STORAGE_KEY =
    "gameHub_breakout_progress";


const HIGH_SCORE_KEY =
    "gameHub_breakout_highScore";


function loadProgress() {

    try {

        const data =
            JSON.parse(
                localStorage.getItem(
                    STORAGE_KEY
                )
            );


        if (data) {

            currentLevel =
                data.currentLevel || 1;

            unlockedLevel =
                data.unlockedLevel || 1;

        }

    } catch {

        currentLevel = 1;

        unlockedLevel = 1;

    }

}


function saveProgress() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify({

            currentLevel,

            unlockedLevel

        })

    );

}


function getHighScore() {

    return Number(
        localStorage.getItem(
            HIGH_SCORE_KEY
        ) || 0
    );

}


function saveHighScore() {

    if (
        score > getHighScore()
    ) {

        localStorage.setItem(
            HIGH_SCORE_KEY,
            Math.floor(score)
        );

    }

}


/* =====================================================
   LEVEL CONFIGURATION
===================================================== */

const LEVELS = [

    {
        id: 1,
        name: "Beginner",
        rows: 4,
        cols: 8,
        pattern: "full",
        hp: 1,
        ballSpeed: 320
    },

    {
        id: 2,
        name: "Stairs",
        rows: 5,
        cols: 9,
        pattern: "stairs",
        hp: 1,
        ballSpeed: 330
    },

    {
        id: 3,
        name: "Diamond",
        rows: 7,
        cols: 10,
        pattern: "diamond",
        hp: 1,
        ballSpeed: 340
    },

    {
        id: 4,
        name: "V Shape",
        rows: 7,
        cols: 10,
        pattern: "v",
        hp: 1,
        ballSpeed: 350
    },

    {
        id: 5,
        name: "Checker",
        rows: 7,
        cols: 10,
        pattern: "checker",
        hp: 1,
        ballSpeed: 360
    },

    {
        id: 6,
        name: "Wall",
        rows: 8,
        cols: 10,
        pattern: "full",
        hp: 1,
        ballSpeed: 370
    },

    {
        id: 7,
        name: "Tunnel",
        rows: 8,
        cols: 10,
        pattern: "tunnel",
        hp: 1,
        ballSpeed: 380
    },

    {
        id: 8,
        name: "Pyramid",
        rows: 8,
        cols: 10,
        pattern: "pyramid",
        hp: 1,
        ballSpeed: 390
    },

    {
        id: 9,
        name: "Cross",
        rows: 9,
        cols: 10,
        pattern: "cross",
        hp: 1,
        ballSpeed: 400
    },

    {
        id: 10,
        name: "Fortress",
        rows: 8,
        cols: 10,
        pattern: "fortress",
        hp: 2,
        ballSpeed: 410
    },

    {
        id: 11,
        name: "Hard Blocks",
        rows: 8,
        cols: 10,
        pattern: "full",
        hp: 2,
        ballSpeed: 420
    },

    {
        id: 12,
        name: "Maze",
        rows: 9,
        cols: 10,
        pattern: "maze",
        hp: 2,
        ballSpeed: 430
    },

    {
        id: 13,
        name: "Speed",
        rows: 7,
        cols: 10,
        pattern: "checker",
        hp: 2,
        ballSpeed: 450
    },

    {
        id: 14,
        name: "Double Wall",
        rows: 9,
        cols: 10,
        pattern: "full",
        hp: 2,
        ballSpeed: 460
    },

    {
        id: 15,
        name: "Labyrinth",
        rows: 9,
        cols: 10,
        pattern: "labyrinth",
        hp: 2,
        ballSpeed: 470
    },

    {
        id: 16,
        name: "Triple Blocks",
        rows: 8,
        cols: 10,
        pattern: "diamond",
        hp: 3,
        ballSpeed: 480
    },

    {
        id: 17,
        name: "Chaos",
        rows: 10,
        cols: 10,
        pattern: "chaos",
        hp: 2,
        ballSpeed: 500
    },

    {
        id: 18,
        name: "Extreme",
        rows: 9,
        cols: 10,
        pattern: "fortress",
        hp: 3,
        ballSpeed: 520
    },

    {
        id: 19,
        name: "Final Challenge",
        rows: 10,
        cols: 10,
        pattern: "maze",
        hp: 3,
        ballSpeed: 540
    },

    {
        id: 20,
        name: "Final Stage",
        rows: 10,
        cols: 10,
        pattern: "boss",
        hp: 3,
        ballSpeed: 560
    }

];


/* =====================================================
   PADDLE
===================================================== */

const paddle = {

    x:
        (
            WORLD_WIDTH -
            PADDLE_WIDTH
        ) / 2,

    y:
        WORLD_HEIGHT - 45,

    width:
        PADDLE_WIDTH,

    height:
        PADDLE_HEIGHT,

    speed:
        650

};


/* =====================================================
   BALL
===================================================== */

const ball = {

    x:
        WORLD_WIDTH / 2,

    y:
        WORLD_HEIGHT - 70,

    radius:
        BALL_RADIUS,

    velocityX:
        220,

    velocityY:
        -320

};


/* =====================================================
   INPUT
===================================================== */

const keys = {

    left: false,

    right: false

};


/* =====================================================
   CANVAS
===================================================== */

function resizeCanvas() {

    const dpr =
        window.devicePixelRatio || 1;

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
   LEVEL HELPERS
===================================================== */

function getLevel(levelId) {

    return LEVELS.find(
        level =>
            level.id === levelId
    );

}


function getMaxLevel() {

    return LEVELS.length;

}


/* =====================================================
   PATTERN GENERATION
===================================================== */

function shouldCreateBrick(
    pattern,
    row,
    col,
    rows,
    cols
) {

    const centerRow =
        Math.floor(
            rows / 2
        );

    const centerCol =
        Math.floor(
            cols / 2
        );


    switch (pattern) {

        case "full":

            return true;


        case "stairs":

            return (
                col >= row - 1 &&
                col <=
                    cols -
                    row
            );


        case "diamond": {

            const distance =
                Math.abs(
                    row -
                    centerRow
                ) +
                Math.abs(
                    col -
                    centerCol
                );

            return distance <= 4;

        }


        case "v":

            return (
                col === row ||
                col ===
                    cols -
                    1 -
                    row ||
                row >= 4
            );


        case "checker":

            return (
                (
                    row +
                    col
                ) % 2 === 0
            );


        case "tunnel":

            return (
                col === 0 ||
                col === cols - 1 ||
                row === 0 ||
                row === rows - 1 ||
                col === centerCol
            );


        case "pyramid":

            return (
                col >= row / 2 &&
                col <
                    cols -
                    row / 2
            );


        case "cross":

            return (
                col === centerCol ||
                row === centerRow ||
                Math.abs(
                    col -
                    centerCol
                ) ===
                    Math.abs(
                        row -
                        centerRow
                    )
            );


        case "fortress":

            return (
                row === 0 ||
                row === rows - 1 ||
                col === 0 ||
                col === cols - 1 ||
                (
                    row >= 2 &&
                    row <= rows - 3 &&
                    col >= 2 &&
                    col <= cols - 3
                )
            );


        case "maze":

            return (
                row % 2 === 0 ||
                col % 3 === 0
            );


        case "labyrinth":

            return (
                (
                    row +
                    col
                ) % 3 !== 1
            );


        case "chaos":

            return (
                (
                    row * 7 +
                    col * 3
                ) % 5 !== 0
            );


        case "boss":

            return (
                row <= 1 ||
                row >= rows - 2 ||
                col <= 1 ||
                col >= cols - 2 ||
                row === centerRow ||
                col === centerCol
            );


        default:

            return true;

    }

}


/* =====================================================
   CREATE LEVEL
===================================================== */

function createLevel(
    levelId
) {

    const level =
        getLevel(levelId);


    if (!level) {

        return;

    }


    bricks = [];


    for (
        let row = 0;
        row < level.rows;
        row++
    ) {

        for (
            let col = 0;
            col < level.cols;
            col++
        ) {

            if (
                !shouldCreateBrick(
                    level.pattern,
                    row,
                    col,
                    level.rows,
                    level.cols
                )
            ) {

                continue;

            }


            const hpVariation =
                level.hp >= 2 &&
                (
                    row +
                    col
                ) % 4 === 0
                    ? level.hp
                    : Math.max(
                        1,
                        level.hp -
                        1
                    );


            bricks.push({

                x:
                    BRICK_LEFT +
                    col *
                    (
                        BRICK_WIDTH +
                        BRICK_GAP
                    ),

                y:
                    BRICK_TOP +
                    row *
                    (
                        BRICK_HEIGHT +
                        BRICK_GAP
                    ),

                width:
                    BRICK_WIDTH,

                height:
                    BRICK_HEIGHT,

                hp:
                    hpVariation,

                maxHp:
                    hpVariation,

                row,

                col

            });

        }

    }

}


/* =====================================================
   RESET BALL
===================================================== */

function resetBall() {

    const level =
        getLevel(
            currentLevel
        );


    ball.x =
        WORLD_WIDTH / 2;


    ball.y =
        WORLD_HEIGHT - 70;


    const direction =
        Math.random() < .5
            ? -1
            : 1;


    const angle =
        (
            Math.random() *
            .7
        ) -
        .35;


    ball.velocityX =
        Math.sin(angle) *
        level.ballSpeed *
        direction;


    ball.velocityY =
        -Math.cos(angle) *
        level.ballSpeed;


    paddle.x =
        (
            WORLD_WIDTH -
            paddle.width
        ) / 2;

}


/* =====================================================
   START LEVEL
===================================================== */

function startLevel(
    levelId
) {

    if (
        levelId < 1 ||
        levelId >
        unlockedLevel
    ) {

        return;

    }


    currentLevel =
        levelId;


    saveProgress();


    running = true;

    paused = false;

    gameOver = false;

    levelComplete = false;

    levelScore = 0;

    combo = 0;

    lives =
        INITIAL_LIVES;


    lastTime = 0;


    createLevel(
        currentLevel
    );


    resetBall();


    hideOverlay();

    updateUI();

}


/* =====================================================
   START GAME
===================================================== */

function startGame() {

    startLevel(
        currentLevel
    );

}


/* =====================================================
   NEXT LEVEL
===================================================== */

function nextLevel() {

    if (
        currentLevel >=
        getMaxLevel()
    ) {

        showFinalVictory();

        return;

    }


    currentLevel++;


    if (
        currentLevel >
        unlockedLevel
    ) {

        unlockedLevel =
            currentLevel;

    }


    saveProgress();


    startLevel(
        currentLevel
    );

}


/* =====================================================
   WIN LEVEL
===================================================== */

function completeLevel() {

    running = false;

    levelComplete = true;


    /*
     * Level bonus
     */

    const bonus =
        lives * 500;


    score += bonus;

    levelScore += bonus;


    /*
     * Unlock next level
     */

    if (
        currentLevel <
        getMaxLevel()
    ) {

        unlockedLevel =
            Math.max(
                unlockedLevel,
                currentLevel + 1
            );

    }


    saveProgress();

    saveHighScore();


    if (
        currentLevel >=
        getMaxLevel()
    ) {

        showFinalVictory();

        return;

    }


    showOverlay(

        "🎉 Level Clear!",

        `Màn ${currentLevel} hoàn thành • +${bonus} điểm`

    );


    document.getElementById(
        "overlayButton"
    ).textContent =
        `▶ Màn ${currentLevel + 1}`;

    updateUI();

}


/* =====================================================
   FINAL VICTORY
===================================================== */

function showFinalVictory() {

    running = false;

    levelComplete = true;


    saveHighScore();


    showOverlay(

        "🏆 YOU WIN!",

        `Bạn đã hoàn thành cả ${getMaxLevel()} màn!`

    );


    document.getElementById(
        "overlayButton"
    ).textContent =
        "🔄 Chơi lại từ đầu";

}


/* =====================================================
   GAME OVER
===================================================== */

function endGame() {

    running = false;

    gameOver = true;


    saveHighScore();


    showOverlay(

        "💥 Game Over",

        `Màn ${currentLevel} • ${score.toLocaleString()} điểm`

    );


    document.getElementById(
        "overlayButton"
    ).textContent =
        "🔄 Chơi lại";


    updateUI();

}


/* =====================================================
   LOSE LIFE
===================================================== */

function loseLife() {

    lives--;

    combo = 0;


    beep(
        150,
        .15
    );


    if (
        lives <= 0
    ) {

        endGame();

        return;

    }


    resetBall();

    updateUI();

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
        gameOver ||
        levelComplete
    ) {

        return;

    }


    /*
     * Paddle
     */

    if (
        keys.left
    ) {

        paddle.x -=
            paddle.speed *
            delta;

    }


    if (
        keys.right
    ) {

        paddle.x +=
            paddle.speed *
            delta;

    }


    paddle.x =
        Math.max(
            0,
            Math.min(
                WORLD_WIDTH -
                paddle.width,
                paddle.x
            )
        );


    /*
     * Ball
     */

    ball.x +=
        ball.velocityX *
        delta;


    ball.y +=
        ball.velocityY *
        delta;


    /*
     * Left wall
     */

    if (
        ball.x -
        ball.radius <= 0
    ) {

        ball.x =
            ball.radius;

        ball.velocityX =
            Math.abs(
                ball.velocityX
            );

        beep(
            250,
            .025
        );

    }


    /*
     * Right wall
     */

    if (
        ball.x +
        ball.radius >=
        WORLD_WIDTH
    ) {

        ball.x =
            WORLD_WIDTH -
            ball.radius;

        ball.velocityX =
            -Math.abs(
                ball.velocityX
            );

        beep(
            250,
            .025
        );

    }


    /*
     * Top wall
     */

    if (
        ball.y -
        ball.radius <= 0
    ) {

        ball.y =
            ball.radius;

        ball.velocityY =
            Math.abs(
                ball.velocityY
            );

        beep(
            250,
            .025
        );

    }


    /*
     * Paddle
     */

    if (
        ball.velocityY > 0 &&

        ball.x >
            paddle.x &&

        ball.x <
            paddle.x +
            paddle.width &&

        ball.y +
            ball.radius >=
            paddle.y &&

        ball.y -
            ball.radius <=
            paddle.y +
            paddle.height
    ) {

        ball.y =
            paddle.y -
            ball.radius;


        const hit =
            (
                ball.x -
                (
                    paddle.x +
                    paddle.width / 2
                )
            )
            /
            (
                paddle.width / 2
            );


        const angle =
            hit *
            (
                Math.PI / 3
            );


        const currentSpeed =
            Math.sqrt(
                ball.velocityX ** 2 +
                ball.velocityY ** 2
            );


        ball.velocityX =
            Math.sin(angle) *
            currentSpeed;


        ball.velocityY =
            -Math.cos(angle) *
            currentSpeed;


        beep(
            400,
            .035
        );

    }


    /*
     * Brick collision
     */

    for (
        const brick
        of bricks
    ) {

        if (
            brick.hp <= 0
        ) {

            continue;

        }


        if (
            circleRectCollision(
                ball,
                brick
            )
        ) {

            handleBrickHit(
                brick
            );


            break;

        }

    }


    /*
     * Ball fell
     */

    if (
        ball.y -
        ball.radius >
        WORLD_HEIGHT
    ) {

        loseLife();

    }

}


/* =====================================================
   BRICK HIT
===================================================== */

function handleBrickHit(
    brick
) {

    brick.hp--;


    /*
     * Bounce
     */

    const centerX =
        brick.x +
        brick.width / 2;


    const centerY =
        brick.y +
        brick.height / 2;


    const dx =
        ball.x -
        centerX;


    const dy =
        ball.y -
        centerY;


    if (
        Math.abs(dx) >
        Math.abs(dy)
    ) {

        ball.velocityX *=
            -1;

    } else {

        ball.velocityY *=
            -1;

    }


    /*
     * Chưa phá hoàn toàn
     */

    if (
        brick.hp > 0
    ) {

        combo = 0;


        beep(
            350,
            .035
        );

        return;

    }


    /*
     * Phá gạch
     */

    combo++;


    const points =
        100 +
        combo * 15;


    score += points;

    levelScore += points;


    /*
     * Tăng tốc nhẹ
     */

    const currentSpeed =
        Math.sqrt(
            ball.velocityX ** 2 +
            ball.velocityY ** 2
        );


    const level =
        getLevel(
            currentLevel
        );


    const maxSpeed =
        level.ballSpeed +
        170;


    const newSpeed =
        Math.min(
            maxSpeed,
            currentSpeed + 2
        );


    const factor =
        newSpeed /
        currentSpeed;


    ball.velocityX *=
        factor;

    ball.velocityY *=
        factor;


    beep(
        500 +
        combo * 10,
        .045
    );


    /*
     * Check level clear
     */

    const remaining =
        bricks.filter(
            brick =>
                brick.hp > 0
        );


    if (
        remaining.length === 0
    ) {

        completeLevel();

    }


    updateUI();

}


/* =====================================================
   COLLISION
===================================================== */

function circleRectCollision(
    circle,
    rect
) {

    const closestX =
        Math.max(
            rect.x,
            Math.min(
                circle.x,
                rect.x +
                rect.width
            )
        );


    const closestY =
        Math.max(
            rect.y,
            Math.min(
                circle.y,
                rect.y +
                rect.height
            )
        );


    const dx =
        circle.x -
        closestX;


    const dy =
        circle.y -
        closestY;


    return (
        dx * dx +
        dy * dy
    ) <=
        circle.radius *
        circle.radius;

}


/* =====================================================
   DRAW BACKGROUND
===================================================== */

function drawBackground() {

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            WORLD_HEIGHT
        );


    gradient.addColorStop(
        0,
        "#101d38"
    );


    gradient.addColorStop(
        1,
        "#08111f"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );


    /*
     * Grid
     */

    ctx.strokeStyle =
        "rgba(255,255,255,.025)";


    for (
        let x = 0;
        x < WORLD_WIDTH;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            WORLD_HEIGHT
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y < WORLD_HEIGHT;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            WORLD_WIDTH,
            y
        );

        ctx.stroke();

    }


    /*
     * Level text
     */

    const level =
        getLevel(
            currentLevel
        );


    ctx.fillStyle =
        "rgba(255,255,255,.5)";


    ctx.font =
        "bold 13px Arial";


    ctx.fillText(
        `LEVEL ${currentLevel} — ${level.name}`,
        28,
        35
    );

}


/* =====================================================
   DRAW BRICKS
===================================================== */

function getBrickColor(
    brick
) {

    const colors = [

        "#4b78bd",

        "#527c9d",

        "#3d8a75",

        "#71834d",

        "#9a7846",

        "#8b5b6e",

        "#655f9a"

    ];


    /*
     * HP 3
     */

    if (
        brick.maxHp >= 3
    ) {

        if (
            brick.hp === 3
        ) {

            return "#7b5fb2";

        }


        if (
            brick.hp === 2
        ) {

            return "#92764e";

        }


        return "#527c9d";

    }


    /*
     * HP 2
     */

    if (
        brick.maxHp === 2
    ) {

        return brick.hp === 2
            ? "#a06c57"
            : "#527c9d";

    }


    return colors[
        brick.row %
        colors.length
    ];

}


function drawBricks() {

    bricks.forEach(
        brick => {

            if (
                brick.hp <= 0
            ) {

                return;

            }


            ctx.fillStyle =
                getBrickColor(
                    brick
                );


            ctx.beginPath();

            ctx.roundRect(
                brick.x,
                brick.y,
                brick.width,
                brick.height,
                5
            );

            ctx.fill();


            /*
             * Highlight
             */

            ctx.fillStyle =
                "rgba(255,255,255,.13)";


            ctx.fillRect(
                brick.x + 3,
                brick.y + 3,
                brick.width - 6,
                3
            );


            /*
             * HP indicator
             */

            if (
                brick.maxHp > 1
            ) {

                ctx.fillStyle =
                    "rgba(255,255,255,.7)";


                ctx.font =
                    "bold 10px Arial";


                ctx.textAlign =
                    "center";


                ctx.fillText(
                    brick.hp,
                    brick.x +
                    brick.width / 2,
                    brick.y + 16
                );


                ctx.textAlign =
                    "left";

            }

        }
    );

}


/* =====================================================
   DRAW PADDLE
===================================================== */

function drawPaddle() {

    const gradient =
        ctx.createLinearGradient(
            paddle.x,
            paddle.y,
            paddle.x,
            paddle.y +
            paddle.height
        );


    gradient.addColorStop(
        0,
        "#77a7df"
    );


    gradient.addColorStop(
        1,
        "#3568b8"
    );


    ctx.fillStyle =
        gradient;


    ctx.beginPath();

    ctx.roundRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height,
        7
    );

    ctx.fill();

}


/* =====================================================
   DRAW BALL
===================================================== */

function drawBall() {

    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        ball.radius,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#f8fafc";


    ctx.fill();


    ctx.closePath();

}


/* =====================================================
   DRAW
===================================================== */

function draw() {

    drawBackground();

    drawBricks();

    drawPaddle();

    drawBall();

}


/* =====================================================
   GAME LOOP
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
   PAUSE
===================================================== */

function togglePause() {

    if (
        !running ||
        gameOver ||
        levelComplete
    ) {

        return;

    }


    paused =
        !paused;


    if (paused) {

        showOverlay(

            "⏸️ Tạm dừng",

            `Level ${currentLevel}`

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
   UI
===================================================== */

function updateUI() {

    const level =
        getLevel(
            currentLevel
        );


    document.getElementById(
        "score"
    ).textContent =
        score.toLocaleString();


    document.getElementById(
        "highScore"
    ).textContent =
        getHighScore()
            .toLocaleString();


    const total =
        bricks.length;


    const destroyed =
        bricks.filter(
            brick =>
                brick.hp <= 0
        ).length;


    document.getElementById(
        "bricks"
    ).textContent =

        `${destroyed}/${total}`;


    document.getElementById(
        "lives"
    ).textContent =

        "❤️".repeat(lives) +
        "🖤".repeat(
            Math.max(
                0,
                3 - lives
            )
        );


    /*
     * Update game title
     * if elements exist.
     */

    const title =
        document.querySelector(
            ".game-title h1"
        );


    if (title) {

        title.textContent =
            `Breakout · ${currentLevel}`;

    }


    const description =
        document.querySelector(
            ".game-title p"
        );


    if (description) {

        description.textContent =
            `${level.name} · Màn ${currentLevel}/${getMaxLevel()}`;

    }

}


/* =====================================================
   KEYBOARD
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        const key =
            event.key.toLowerCase();


        if (
            event.key ===
            "ArrowLeft" ||
            key === "a"
        ) {

            keys.left =
                true;

            event.preventDefault();

        }


        if (
            event.key ===
            "ArrowRight" ||
            key === "d"
        ) {

            keys.right =
                true;

            event.preventDefault();

        }


        if (
            key === "p"
        ) {

            togglePause();

        }

    }
);


document.addEventListener(
    "keyup",
    event => {

        const key =
            event.key.toLowerCase();


        if (
            event.key ===
            "ArrowLeft" ||
            key === "a"
        ) {

            keys.left =
                false;

        }


        if (
            event.key ===
            "ArrowRight" ||
            key === "d"
        ) {

            keys.right =
                false;

        }

    }
);


/* =====================================================
   MOUSE / TOUCH
===================================================== */

function movePaddleToPointer(
    event
) {

    const rect =
        canvas.getBoundingClientRect();


    const scaleX =
        WORLD_WIDTH /
        rect.width;


    const x =
        (
            event.clientX -
            rect.left
        ) *
        scaleX;


    paddle.x =
        x -
        paddle.width / 2;


    paddle.x =
        Math.max(
            0,
            Math.min(
                WORLD_WIDTH -
                paddle.width,
                paddle.x
            )
        );

}


canvas.addEventListener(
    "pointermove",
    movePaddleToPointer
);


canvas.addEventListener(
    "pointerdown",
    movePaddleToPointer
);


/* =====================================================
   BUTTONS
===================================================== */

document
    .getElementById(
        "startButton"
    )
    .addEventListener(
        "click",
        () => {

            if (
                levelComplete &&
                currentLevel <
                getMaxLevel()
            ) {

                nextLevel();

            } else {

                startGame();

            }

        }
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

            /*
             * Pause
             */

            if (
                paused
            ) {

                togglePause();

                return;

            }


            /*
             * Level complete
             */

            if (
                levelComplete &&
                currentLevel <
                getMaxLevel()
            ) {

                nextLevel();

                return;

            }


            /*
             * Final victory
             */

            if (
                levelComplete &&
                currentLevel >=
                getMaxLevel()
            ) {

                currentLevel = 1;

                startLevel(1);

                return;

            }


            /*
             * Game over
             */

            startGame();

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
   SIMPLE LEVEL SELECT
===================================================== */

function createLevelSelector() {

    const existing =
        document.getElementById(
            "levelSelector"
        );


    if (
        existing
    ) {

        existing.remove();

    }


    const selector =
        document.createElement(
            "div"
        );


    selector.id =
        "levelSelector";


    selector.style.cssText = `

        margin-top: 14px;
        padding: 12px;
        background: #1e293b;
        border-radius: 10px;

    `;


    const title =
        document.createElement(
            "div"
        );


    title.textContent =
        "🗺️ Chọn màn";


    title.style.cssText = `

        margin-bottom: 10px;
        color: #94a3b8;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;

    `;


    selector.appendChild(
        title
    );


    const grid =
        document.createElement(
            "div"
        );


    grid.style.cssText = `

        display: grid;
        grid-template-columns:
            repeat(5, 1fr);
        gap: 5px;

    `;


    LEVELS.forEach(
        level => {

            const button =
                document.createElement(
                    "button"
                );


            const unlocked =
                level.id <=
                unlockedLevel;


            button.textContent =
                unlocked
                    ? level.id
                    : "🔒";


            button.disabled =
                !unlocked;


            button.style.cssText = `

                border: 1px solid #475569;
                border-radius: 6px;
                padding: 7px 2px;
                background:
                    ${unlocked
                        ? "#243554"
                        : "#151d2d"};
                color:
                    ${unlocked
                        ? "#fff"
                        : "#64748b"};
                cursor:
                    ${unlocked
                        ? "pointer"
                        : "not-allowed"};
                font-size: 11px;
                font-weight: bold;

            `;


            if (
                level.id ===
                currentLevel
            ) {

                button.style.outline =
                    "2px solid #6f9bd8";

            }


            button.addEventListener(
                "click",
                () => {

                    startLevel(
                        level.id
                    );

                    createLevelSelector();

                }
            );


            grid.appendChild(
                button
            );

        }
    );


    selector.appendChild(
        grid
    );


    document
        .querySelector(
            ".sidebar"
        )
        .appendChild(
            selector
        );

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
   INITIALIZE
===================================================== */

loadProgress();


if (
    currentLevel >
    unlockedLevel
) {

    currentLevel =
        unlockedLevel;

}


createLevel(
    currentLevel
);


updateUI();


createLevelSelector();


draw();


requestAnimationFrame(
    gameLoop
);
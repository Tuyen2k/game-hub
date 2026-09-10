const SIZE = 4;

const WIN_VALUE = 2048;

const SLIDE_MS = 120;

const HISTORY_LIMIT = 50;


const boardEl =
    document.getElementById("board");

const gridEl =
    document.getElementById("boardGrid");

const tilesEl =
    document.getElementById("tiles");


/* =========================
   CONFIG
========================= */

const TILE_COLORS = {

    2: ["#eee4da", "#776e65"],

    4: ["#ede0c8", "#776e65"],

    8: ["#f2b179", "#f9f6f2"],

    16: ["#f59563", "#f9f6f2"],

    32: ["#f67c5f", "#f9f6f2"],

    64: ["#f65e3b", "#f9f6f2"],

    128: ["#edcf72", "#f9f6f2"],

    256: ["#edcc61", "#f9f6f2"],

    512: ["#edc850", "#f9f6f2"],

    1024: ["#edc53f", "#f9f6f2"],

    2048: ["#edc22e", "#f9f6f2"]

};


const SUPER_COLOR =
    ["#3c3a32", "#edc22e"];


const VECTORS = {

    left: {
        x: -1,
        y: 0
    },

    right: {
        x: 1,
        y: 0
    },

    up: {
        x: 0,
        y: -1
    },

    down: {
        x: 0,
        y: 1
    }

};


/* =========================
   STATE
========================= */

let grid;

let score = 0;

let moves = 0;

let maxTile = 2;

let running = false;

let over = false;

let won = false;

let locked = false;

let nextTileId = 1;

let history = [];

let overlayMode = null;

let cellSize = 0;

let gapSize = 0;

let soundEnabled = true;

let audioContext = null;

let touchStart = null;


/* =========================
   STORAGE
========================= */

function getHighScore() {

    if (
        typeof GameStorage !==
        "undefined"
    ) {

        return GameStorage
            .getHighScore("2048");

    }

    return Number(
        localStorage.getItem(
            "gameHub_highScore_2048"
        ) || 0
    );

}


function saveHighScore() {

    if (
        typeof GameStorage !==
        "undefined"
    ) {

        GameStorage.setHighScore(
            "2048",
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
            "gameHub_highScore_2048",
            score
        );

    }

}


/* =========================
   BOARD
========================= */

function createGrid() {

    return Array.from(
        {
            length: SIZE
        },
        () =>
            Array(SIZE).fill(null)
    );

}


function buildBoardBackground() {

    gridEl.innerHTML =
        "";


    for (
        let i = 0;
        i < SIZE * SIZE;
        i++
    ) {

        const cell =
            document.createElement("div");

        cell.className =
            "cell";

        gridEl.appendChild(
            cell
        );

    }

}


function inBounds(
    row,
    col
) {

    return (
        row >= 0 &&
        row < SIZE &&
        col >= 0 &&
        col < SIZE
    );

}


/* =========================
   LAYOUT
========================= */

function tileXY(
    row,
    col
) {

    return {

        left:
            gapSize +
            col *
            (cellSize + gapSize),

        top:
            gapSize +
            row *
            (cellSize + gapSize)

    };

}


function applyBox(
    el,
    row,
    col
) {

    const pos =
        tileXY(
            row,
            col
        );

    el.style.left =
        pos.left + "px";

    el.style.top =
        pos.top + "px";

    el.style.width =
        cellSize + "px";

    el.style.height =
        cellSize + "px";

}


function tileFontSize(
    value
) {

    const digits =
        String(value).length;


    if (digits <= 2)
        return cellSize * .48;

    if (digits === 3)
        return cellSize * .4;

    if (digits === 4)
        return cellSize * .32;

    return cellSize * .26;

}


function styleTile(
    tile
) {

    const colors =
        TILE_COLORS[tile.value] ||
        SUPER_COLOR;

    const el =
        tile.el;

    el.textContent =
        tile.value;

    el.style.background =
        colors[0];

    el.style.color =
        colors[1];

    el.style.fontSize =
        tileFontSize(
            tile.value
        ) + "px";

}


function positionTile(
    tile
) {

    applyBox(
        tile.el,
        tile.row,
        tile.col
    );

}


function layout() {

    const width =
        boardEl.clientWidth;

    if (!width) return;


    gapSize =
        Math.round(
            width * .024
        );

    cellSize =
        (
            width -
            gapSize *
            (SIZE + 1)
        ) / SIZE;


    gridEl
        .querySelectorAll(".cell")
        .forEach(
            (el, index) =>
                applyBox(
                    el,
                    Math.floor(
                        index / SIZE
                    ),
                    index % SIZE
                )
        );


    if (!grid) return;


    grid.forEach(
        row =>
            row.forEach(
                tile => {

                    if (!tile) return;

                    styleTile(
                        tile
                    );

                    positionTile(
                        tile
                    );

                }
            )
    );

}


/* =========================
   TILE
========================= */

function createTile(
    row,
    col,
    value,
    animate
) {

    const el =
        document.createElement("div");

    el.className =
        "tile";

    const tile = {

        id:
            nextTileId++,

        value,

        row,

        col,

        el

    };


    styleTile(
        tile
    );


    positionTile(
        tile
    );


    if (animate) {

        el.classList.add(
            "new"
        );

    }


    tilesEl.appendChild(
        el
    );


    grid[row][col] =
        tile;


    return tile;

}


function spawnTile() {

    const empty =
        [];


    for (
        let row = 0;
        row < SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < SIZE;
            col++
        ) {

            if (
                !grid[row][col]
            ) {

                empty.push(
                    [row, col]
                );

            }

        }

    }


    if (
        !empty.length
    ) return;


    const [row, col] =
        empty[
            Math.floor(
                Math.random() *
                empty.length
            )
        ];


    createTile(
        row,
        col,
        Math.random() < .9
            ? 2
            : 4,
        true
    );

}


/* =========================
   MOVE
========================= */

function move(
    direction
) {

    if (
        !running ||
        over ||
        locked
    ) return;


    const vector =
        VECTORS[direction];


    const snapshot = {

        score,

        moves,

        values:
            grid.map(
                row =>
                    row.map(
                        tile =>
                            tile
                                ? tile.value
                                : null
                    )
            )

    };


    let moved =
        false;

    const mergedThisTurn =
        new Set();

    const merges =
        [];


    const rowOrder =
        vector.y === 1
            ? [0, 1, 2, 3]
            : [3, 2, 1, 0];

    const colOrder =
        vector.x === 1
            ? [3, 2, 1, 0]
            : [0, 1, 2, 3];


    for (
        const row
        of rowOrder
    ) {

        for (
            const col
            of colOrder
        ) {

            const tile =
                grid[row][col];

            if (!tile) continue;


            let prevRow =
                row;

            let prevCol =
                col;

            let nextRow =
                row + vector.y;

            let nextCol =
                col + vector.x;


            while (
                inBounds(
                    nextRow,
                    nextCol
                ) &&
                !grid[nextRow][nextCol]
            ) {

                prevRow =
                    nextRow;

                prevCol =
                    nextCol;

                nextRow +=
                    vector.y;

                nextCol +=
                    vector.x;

            }


            const next =
                inBounds(
                    nextRow,
                    nextCol
                )
                    ? grid[nextRow][nextCol]
                    : null;


            if (
                next &&
                next.value ===
                tile.value &&
                !mergedThisTurn.has(
                    next.id
                )
            ) {

                grid[row][col] =
                    null;

                tile.row =
                    nextRow;

                tile.col =
                    nextCol;

                grid[nextRow][nextCol] =
                    null;


                const el =
                    document.createElement(
                        "div"
                    );

                el.className =
                    "tile merged";

                const merged = {

                    id:
                        nextTileId++,

                    value:
                        tile.value *
                        2,

                    row:
                        nextRow,

                    col:
                        nextCol,

                    el

                };


                styleTile(
                    merged
                );


                positionTile(
                    merged
                );


                grid[nextRow][nextCol] =
                    merged;

                mergedThisTurn.add(
                    merged.id
                );

                merges.push(
                    {
                        merged,
                        from:
                            [tile, next]
                    }
                );


                score +=
                    merged.value;

                maxTile =
                    Math.max(
                        maxTile,
                        merged.value
                    );

                moved =
                    true;

            } else if (
                prevRow !==
                row ||
                prevCol !==
                col
            ) {

                grid[row][col] =
                    null;

                grid[prevRow][prevCol] =
                    tile;

                tile.row =
                    prevRow;

                tile.col =
                    prevCol;

                moved =
                    true;

            }

        }

    }


    if (!moved) return;


    grid.forEach(
        row =>
            row.forEach(
                tile => {

                    if (tile) {

                        positionTile(
                            tile
                        );

                    }

                }
            )
    );


    history.push(
        snapshot
    );


    if (
        history.length >
        HISTORY_LIMIT
    ) {

        history.shift();

    }


    moves++;

    updateUndoButton();


    if (merges.length) {

        locked =
            true;

        beep(
            600,
            .07
        );


        setTimeout(
            () => {

                merges.forEach(
                    item => {

                        item.from.forEach(
                            tile =>
                                tile.el.remove()
                        );


                        const stillThere =
                            grid[item.merged.row]
                                [
                                    item.merged.col
                                ] ===
                            item.merged;


                        if (stillThere) {

                            tilesEl.appendChild(
                                item.merged.el
                            );

                        }

                    }
                );


                locked =
                    false;

            },
            SLIDE_MS
        );


        bumpScore();

    } else {

        beep(
            300,
            .04
        );

    }


    spawnTile();

    saveHighScore();

    updateStats();


    if (
        !won &&
        maxTile >=
        WIN_VALUE
    ) {

        won =
            true;

        beepWin();


        showOverlay(
            "🎉 Bạn đã thắng!",
            "Bạn đã đạt được ô 2048",
            "win"
        );

        return;

    }


    if (
        !hasMoves()
    ) {

        gameOver();

    }

}


/* =========================
   HAS MOVES
========================= */

function hasMoves() {

    for (
        let row = 0;
        row < SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < SIZE;
            col++
        ) {

            const tile =
                grid[row][col];

            if (!tile)
                return true;


            if (
                col + 1 < SIZE &&
                grid[row][col + 1] &&
                grid[row][col + 1].value ===
                tile.value
            )
                return true;


            if (
                row + 1 < SIZE &&
                grid[row + 1][col] &&
                grid[row + 1][col].value ===
                tile.value
            )
                return true;

        }

    }


    return false;

}


/* =========================
   UNDO
========================= */

function undo() {

    if (
        locked ||
        !history.length
    ) return;


    const snapshot =
        history.pop();


    tilesEl.innerHTML =
        "";

    grid =
        createGrid();


    let restoredMax =
        2;


    snapshot.values.forEach(
        (row, r) =>
            row.forEach(
                (value, c) => {

                    if (!value)
                        return;


                    createTile(
                        r,
                        c,
                        value,
                        false
                    );


                    restoredMax =
                        Math.max(
                            restoredMax,
                            value
                        );

                }
            )
    );


    score =
        snapshot.score;

    moves =
        snapshot.moves;

    maxTile =
        restoredMax;

    over =
        false;

    running =
        true;


    hideOverlay();

    updateStats();

    updateUndoButton();


    beep(
        400,
        .05
    );

}


function updateUndoButton() {

    document
        .getElementById("undoButton")
        .disabled =
            history.length === 0;

}


/* =========================
   GAME OVER
========================= */

function gameOver() {

    over =
        true;

    running =
        false;


    saveHighScore();

    updateStats();


    beep(
        150,
        .2
    );


    showOverlay(
        "Game Over",
        "Điểm của bạn: " +
        score.toLocaleString(),
        "over"
    );

}


/* =========================
   OVERLAY
========================= */

function showOverlay(
    title,
    text,
    mode
) {

    overlayMode =
        mode;


    document
        .getElementById(
            "overlayTitle"
        )
        .textContent =
            title;


    document
        .getElementById(
            "overlayText"
        )
        .textContent =
            text;


    document
        .getElementById(
            "overlayButton"
        )
        .textContent =
            mode === "win"
                ? "Chơi tiếp"
                : "Chơi lại";


    document
        .getElementById(
            "overlay"
        )
        .style.display =
            "flex";

}


function hideOverlay() {

    overlayMode =
        null;


    document
        .getElementById(
            "overlay"
        )
        .style.display =
            "none";

}


/* =========================
   STATS
========================= */

function updateStats() {

    document
        .getElementById("score")
        .textContent =
            score.toLocaleString();


    document
        .getElementById(
            "highScore"
        )
        .textContent =
            getHighScore()
            .toLocaleString();


    document
        .getElementById(
            "moves"
        )
        .textContent =
            moves;


    document
        .getElementById(
            "maxTile"
        )
        .textContent =
            maxTile;

}


function bumpScore() {

    const el =
        document
            .getElementById(
                "score"
            );


    el.classList.remove(
        "bump"
    );


    void el.offsetWidth;


    el.classList.add(
        "bump"
    );

}


/* =========================
   START
========================= */

function startGame() {

    score =
        0;

    moves =
        0;

    maxTile =
        2;

    won =
        false;

    over =
        false;

    locked =
        false;

    running =
        true;

    history =
        [];


    tilesEl.innerHTML =
        "";


    grid =
        createGrid();


    spawnTile();

    spawnTile();


    hideOverlay();

    updateStats();

    updateUndoButton();


    beep(
        500,
        .06
    );

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


function beepWin() {

    [523, 659, 784, 1047].forEach(
        (frequency, index) =>
            setTimeout(
                () =>
                    beep(
                        frequency,
                        .15
                    ),
                index * 130
            )
    );

}


/* =========================
   KEYBOARD
========================= */

const KEY_DIRECTIONS = {

    ArrowLeft: "left",

    ArrowRight: "right",

    ArrowUp: "up",

    ArrowDown: "down",

    a: "left",

    d: "right",

    w: "up",

    s: "down",

    A: "left",

    D: "right",

    W: "up",

    S: "down"

};


document.addEventListener(
    "keydown",
    event => {

        if (
            [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown"
            ].includes(
                event.key
            )
        ) {

            event.preventDefault();

        }


        const direction =
            KEY_DIRECTIONS[
                event.key
            ];


        if (direction) {

            move(
                direction
            );

            return;

        }


        if (
            event.key ===
            "z" ||
            event.key ===
            "Z"
        ) {

            undo();

        }

    }
);


/* =========================
   TOUCH
========================= */

boardEl.addEventListener(
    "touchstart",
    event => {

        if (
            event.touches.length ===
            1
        ) {

            touchStart = {

                x:
                    event.touches[0]
                        .clientX,

                y:
                    event.touches[0]
                        .clientY

            };

        }

    },
    {
        passive: true
    }
);


boardEl.addEventListener(
    "touchmove",
    event =>
        event.preventDefault(),
    {
        passive: false
    }
);


boardEl.addEventListener(
    "touchend",
    event => {

        if (!touchStart)
            return;


        const touch =
            event.changedTouches[0];

        const dx =
            touch.clientX -
            touchStart.x;

        const dy =
            touch.clientY -
            touchStart.y;

        touchStart =
            null;


        if (
            Math.max(
                Math.abs(dx),
                Math.abs(dy)
            ) < 30
        )
            return;


        if (
            Math.abs(dx) >
            Math.abs(dy)
        ) {

            move(
                dx > 0
                    ? "right"
                    : "left"
            );

        } else {

            move(
                dy > 0
                    ? "down"
                    : "up"
            );

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
        "undoButton"
    )
    .addEventListener(
        "click",
        undo
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


            document
                .getElementById(
                    "soundButton"
                )
                .textContent =
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

            if (
                overlayMode ===
                "win"
            ) {

                hideOverlay();

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
                        action ===
                        "undo"
                    )
                        undo();


                    if (
                        action in
                        VECTORS
                    )
                        move(
                            action
                        );

                }
            );

        }
    );


/* =========================
   INIT
========================= */

buildBoardBackground();


grid =
    createGrid();


layout();


updateStats();


updateUndoButton();


window.addEventListener(
    "resize",
    layout
);

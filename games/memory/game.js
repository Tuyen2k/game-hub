/* =====================================================
   MEMORY CARDS
   Multi Level Version
===================================================== */


/* =====================================================
   LEVEL CONFIG
===================================================== */

const LEVELS = [

    {
        level: 1,
        rows: 4,
        cols: 4,
        pairs: 8,
        time: 0,
        description:
            "Làm quen với trò chơi"
    },

    {
        level: 2,
        rows: 4,
        cols: 5,
        pairs: 10,
        time: 0,
        description:
            "Nhiều thẻ hơn"
    },

    {
        level: 3,
        rows: 4,
        cols: 6,
        pairs: 12,
        time: 120,
        description:
            "Hoàn thành trong 2 phút"
    },

    {
        level: 4,
        rows: 6,
        cols: 6,
        pairs: 18,
        time: 120,
        description:
            "Combo để tăng điểm"
    },

    {
        level: 5,
        rows: 6,
        cols: 8,
        pairs: 24,
        time: 150,
        description:
            "Thời gian bị giới hạn"
    },

    {
        level: 6,
        rows: 8,
        cols: 8,
        pairs: 32,
        time: 180,
        description:
            "Hardcore"
    }

];


const SYMBOLS = [

    "🍎", "🍌", "🍇", "🍉",
    "🍓", "🍒", "🥝", "🍍",
    "🥭", "🍑", "🍋", "🥥",
    "🍊", "🍐", "🫐", "🍈",
    "🥕", "🌽", "🍅", "🥑",
    "🍪", "🍩", "🍰", "🍔",
    "🍕", "🌮", "🍣", "🍙",
    "🍜", "🍦", "🍫", "🧁"

];


/* =====================================================
   STATE
===================================================== */

let currentLevel = 1;

let cards = [];

let flippedCards = [];

let matchedPairs = 0;

let moves = 0;

let score = 0;

let totalScore = 0;

let combo = 0;

let seconds = 0;

let timeLimit = 0;

let running = false;

let paused = false;

let lockBoard = false;

let timer = null;

let soundEnabled = true;


/* =====================================================
   AUDIO
===================================================== */

let audioContext = null;


/* =====================================================
   ELEMENTS
===================================================== */

const gameBoard =
    document.getElementById(
        "gameBoard"
    );


/* =====================================================
   STORAGE
===================================================== */

const STORAGE_KEY =
    "gameHub_memory_progress";


function loadProgress() {

    try {

        const data =
            JSON.parse(
                localStorage.getItem(
                    STORAGE_KEY
                )
            );


        if (!data) {

            return {

                unlockedLevel: 1,

                totalScore: 0

            };

        }


        return {

            unlockedLevel:
                Math.max(
                    1,
                    Math.min(
                        LEVELS.length,
                        data.unlockedLevel || 1
                    )
                ),

            totalScore:
                data.totalScore || 0

        };

    } catch {

        return {

            unlockedLevel: 1,

            totalScore: 0

        };

    }

}


function saveProgress() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify({

            unlockedLevel:
                getProgress()
                    .unlockedLevel,

            totalScore

        })

    );

}


function getProgress() {

    return loadProgress();

}


/* =====================================================
   LEVEL
===================================================== */

function getCurrentConfig() {

    return LEVELS[
        currentLevel - 1
    ];

}


function updateLevelInfo() {

    const config =
        getCurrentConfig();


    document.getElementById(
        "level"
    ).textContent =
        currentLevel;


    document.getElementById(
        "levelDescription"
    ).textContent =
        config.description;


    document.getElementById(
        "overlayLevel"
    ).textContent =
        `LEVEL ${currentLevel}`;

}


/* =====================================================
   LEVEL BUTTONS
===================================================== */

function renderLevelList() {

    const container =
        document.getElementById(
            "levelList"
        );


    container.innerHTML = "";


    const progress =
        getProgress();


    for (
        let i = 1;
        i <= LEVELS.length;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "level-button";


        if (
            i === currentLevel
        ) {

            button.classList.add(
                "active"
            );

        }


        if (
            i > progress.unlockedLevel
        ) {

            button.classList.add(
                "locked"
            );

            button.textContent =
                `🔒 ${i}`;

            button.disabled =
                true;

        } else {

            button.textContent =
                `Level ${i}`;

            button.addEventListener(
                "click",
                () => {

                    currentLevel =
                        i;

                    startGame();

                }
            );

        }


        container.appendChild(
            button
        );

    }

}


/* =====================================================
   SHUFFLE
===================================================== */

function shuffle(array) {

    const result =
        [...array];


    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }


    return result;

}


/* =====================================================
   CREATE CARDS
===================================================== */

function createCards() {

    const config =
        getCurrentConfig();


    const symbols =
        SYMBOLS.slice(
            0,
            config.pairs
        );


    const deck =
        shuffle([
            ...symbols,
            ...symbols
        ]);


    cards =
        deck.map(
            (symbol, index) => ({

                id:
                    index,

                symbol,

                flipped:
                    false,

                matched:
                    false

            })
        );

}


/* =====================================================
   BOARD SIZE
===================================================== */

function updateBoardSize() {

    const config =
        getCurrentConfig();


    const board =
        document.getElementById(
            "gameBoard"
        );


    board.style.gridTemplateColumns =
        `repeat(${config.cols}, 1fr)`;


    board.style.gridTemplateRows =
        `repeat(${config.rows}, 1fr)`;


    const maxSize =
        window.innerWidth <= 700
            ? 380
            : 560;


    const gap =
        config.cols >= 8
            ? 5
            : 8;


    const cardSize =
        Math.floor(
            (
                maxSize -
                (
                    gap *
                    (config.cols - 1)
                )
            ) /
            config.cols
        );


    board.style.width =
        `${cardSize * config.cols + gap * (config.cols - 1)}px`;


    board.style.maxWidth =
        "100%";


    board.style.gap =
        `${gap}px`;


    document
        .querySelectorAll(
            ".memory-card"
        )
        .forEach(
            card => {

                card.style.width =
                    `${cardSize}px`;

                card.style.height =
                    `${cardSize}px`;

            }
        );

}


/* =====================================================
   RENDER
===================================================== */

function renderCards() {

    gameBoard.innerHTML = "";


    cards.forEach(
        card => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "memory-card";


            if (
                card.flipped
            ) {

                element.classList.add(
                    "flipped"
                );

            }


            if (
                card.matched
            ) {

                element.classList.add(
                    "matched"
                );

            }


            element.innerHTML = `

                <div class="card-inner">

                    <div class="card-front"></div>

                    <div class="card-back">
                        ${card.symbol}
                    </div>

                </div>

            `;


            element.addEventListener(
                "click",
                () =>
                    flipCard(card.id)
            );


            gameBoard.appendChild(
                element
            );

        }
    );


    updateBoardSize();

}


/* =====================================================
   START GAME
===================================================== */

function startGame() {

    stopTimer();


    const config =
        getCurrentConfig();


    cards = [];

    flippedCards = [];

    matchedPairs = 0;

    moves = 0;

    score = 0;

    combo = 0;

    seconds = 0;

    timeLimit =
        config.time;


    running = true;

    paused = false;

    lockBoard = false;


    createCards();


    updateLevelInfo();

    updateStats();

    renderCards();

    hideOverlay();

    startTimer();

    renderLevelList();


    document.getElementById(
        "pauseButton"
    ).textContent =
        "Ⅱ Tạm dừng";

}


/* =====================================================
   TIMER
===================================================== */

function startTimer() {

    stopTimer();


    timer =
        setInterval(
            () => {

                if (
                    !running ||
                    paused
                ) {

                    return;

                }


                seconds++;


                updateTimer();


                if (
                    timeLimit > 0 &&
                    seconds >= timeLimit
                ) {

                    timeUp();

                }

            },
            1000
        );

}


function stopTimer() {

    if (timer) {

        clearInterval(
            timer
        );

        timer = null;

    }

}


/* =====================================================
   TIMER DISPLAY
===================================================== */

function updateTimer() {

    const element =
        document.getElementById(
            "timer"
        );


    if (
        timeLimit === 0
    ) {

        element.textContent =
            formatTime(
                seconds
            );

        return;

    }


    const remaining =
        Math.max(
            0,
            timeLimit - seconds
        );


    element.textContent =
        formatTime(
            remaining
        );


    if (
        remaining <= 15
    ) {

        element.style.color =
            "#f87171";

    } else {

        element.style.color =
            "";

    }

}


/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(
    value
) {

    const minutes =
        Math.floor(
            value / 60
        );


    const seconds =
        value % 60;


    return (

        String(minutes)
            .padStart(2, "0")

        + ":" +

        String(seconds)
            .padStart(2, "0")

    );

}


/* =====================================================
   FLIP
===================================================== */

function flipCard(id) {

    if (
        !running ||
        paused ||
        lockBoard
    ) {

        return;

    }


    const card =
        cards.find(
            item =>
                item.id === id
        );


    if (
        !card ||
        card.flipped ||
        card.matched
    ) {

        return;

    }


    if (
        flippedCards.length >= 2
    ) {

        return;

    }


    card.flipped =
        true;


    flippedCards.push(
        card
    );


    beep(
        450,
        .04
    );


    renderCards();


    if (
        flippedCards.length === 2
    ) {

        moves++;

        checkMatch();

    }

}


/* =====================================================
   CHECK MATCH
===================================================== */

function checkMatch() {

    lockBoard =
        true;


    const [first, second] =
        flippedCards;


    if (
        first.symbol ===
        second.symbol
    ) {

        setTimeout(
            () => {

                first.matched =
                    true;

                second.matched =
                    true;


                matchedPairs++;


                combo++;


                score +=
                    calculateScore();


                totalScore +=
                    calculateScore();


                saveProgress();


                beep(
                    700 +
                    combo * 50,
                    .1
                );


                flippedCards = [];

                lockBoard =
                    false;


                renderCards();

                updateStats();


                if (
                    matchedPairs ===
                    getCurrentConfig().pairs
                ) {

                    levelComplete();

                }

            },
            300
        );

    } else {

        combo = 0;


        setTimeout(
            () => {

                first.flipped =
                    false;

                second.flipped =
                    false;


                flippedCards = [];

                lockBoard =
                    false;


                beep(
                    180,
                    .08
                );


                renderCards();

                updateStats();

            },
            getCardRevealTime()
        );

    }

}


/* =====================================================
   CARD REVEAL TIME
===================================================== */

function getCardRevealTime() {

    if (
        currentLevel >= 5
    ) {

        return 500;

    }


    if (
        currentLevel >= 3
    ) {

        return 650;

    }


    return 750;

}


/* =====================================================
   SCORE
===================================================== */

function calculateScore() {

    let points =
        100;


    /*
     * Combo
     */

    if (
        combo > 1
    ) {

        points +=
            combo * 25;

    }


    /*
     * Speed bonus
     */

    if (
        timeLimit > 0
    ) {

        const remaining =
            Math.max(
                0,
                timeLimit - seconds
            );


        points +=
            Math.floor(
                remaining / 2
            );

    }


    /*
     * Move penalty
     */

    points =
        Math.max(
            25,
            points -
            Math.floor(
                moves / 5
            ) * 5
        );


    return points;

}


/* =====================================================
   LEVEL COMPLETE
===================================================== */

function levelComplete() {

    running =
        false;


    stopTimer();


    const progress =
        getProgress();


    let unlockedLevel =
        progress.unlockedLevel;


    if (
        currentLevel <
        LEVELS.length
    ) {

        unlockedLevel =
            Math.max(
                unlockedLevel,
                currentLevel + 1
            );

    }


    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify({

            unlockedLevel,

            totalScore

        })

    );


    saveHighScore();


    updateStats();


    renderLevelList();


    beep(
        900,
        .15
    );


    const isFinal =
        currentLevel ===
        LEVELS.length;


    showOverlay(

        isFinal
            ? "Bạn đã phá đảo! 🏆"
            : "Level hoàn thành! 🎉",

        isFinal
            ? "Bạn đã hoàn thành toàn bộ Memory."
            : `Bạn đã vượt qua Level ${currentLevel}.`

    );


    document.getElementById(
        "overlayButton"
    ).textContent =
        "Chơi lại";


    document.getElementById(
        "nextLevelButton"
    ).style.display =
        isFinal
            ? "none"
            : "block";


}


/* =====================================================
   TIME UP
===================================================== */

function timeUp() {

    running =
        false;


    stopTimer();


    beep(
        120,
        .3
    );


    showOverlay(

        "Hết giờ! ⏱",

        `Bạn đã ghép ${matchedPairs}/${getCurrentConfig().pairs} cặp.`

    );


    document.getElementById(
        "overlayButton"
    ).textContent =
        "Chơi lại";


    document.getElementById(
        "nextLevelButton"
    ).style.display =
        "none";

}


/* =====================================================
   PAUSE
===================================================== */

function togglePause() {

    if (
        !running
    ) {

        return;

    }


    paused =
        !paused;


    if (paused) {

        showOverlay(
            "Tạm dừng",
            "Nhấn tiếp tục để chơi"
        );


        document.getElementById(
            "overlayButton"
        ).textContent =
            "▶ Tiếp tục";


        document.getElementById(
            "nextLevelButton"
        ).style.display =
            "none";


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
   STATS
===================================================== */

function updateStats() {

    document.getElementById(
        "score"
    ).textContent =
        score.toLocaleString();


    document.getElementById(
        "totalScore"
    ).textContent =
        totalScore.toLocaleString();


    document.getElementById(
        "moves"
    ).textContent =
        moves;


    document.getElementById(
        "combo"
    ).textContent =
        `x${combo}`;


    document.getElementById(
        "pairs"
    ).textContent =

        `${matchedPairs}/${getCurrentConfig().pairs}`;


    const percentage =
        (
            matchedPairs /
            getCurrentConfig().pairs
        ) * 100;


    document.getElementById(
        "progress"
    ).style.width =
        `${percentage}%`;


    updateTimer();

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
        "overlayLevel"
    ).textContent =
        `LEVEL ${currentLevel}`;


    document.getElementById(
        "resultStats"
    ).innerHTML = `

        <div class="result-stat">

            <span>Điểm</span>

            <strong>
                ${score}
            </strong>

        </div>

        <div class="result-stat">

            <span>Lượt</span>

            <strong>
                ${moves}
            </strong>

        </div>

        <div class="result-stat">

            <span>Thời gian</span>

            <strong>
                ${formatTime(seconds)}
            </strong>

        </div>

    `;


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


/* =====================================================
   SOUND
===================================================== */

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
            "sine";


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
   BUTTONS
===================================================== */

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


document
    .getElementById(
        "nextLevelButton"
    )
    .addEventListener(
        "click",
        () => {

            if (
                currentLevel <
                LEVELS.length
            ) {

                currentLevel++;

                startGame();

            }

        }
    );


/* =====================================================
   RESIZE
===================================================== */

window.addEventListener(
    "resize",
    updateBoardSize
);


/* =====================================================
   INITIALIZE
===================================================== */

const progress =
    getProgress();


totalScore =
    progress.totalScore;


updateLevelInfo();

renderLevelList();

updateStats();

const games = [

    {
        id: "tetris",

        name: "Block Rush",

        description:
            "Xếp các khối và hoàn thành càng nhiều dòng càng tốt.",

        icon: "🟦",

        category: "classic",

        difficulty: 2,

        status: "available",

        url: "./games/tetris/index.html"

    },


    {
        id: "snake",

        name: "Snake",

        description:
            "Điều khiển chú rắn ăn thức ăn và đạt điểm cao.",

        icon: "🐍",

        category: "arcade",

        difficulty: 1,

        status: "available",

        url: "./games/snake/index.html"
    },


    {
        id: "2048",

        name: "2048",

        description:
            "Ghép các ô số để tạo ra ô 2048.",

        icon: "🧩",

        category: "puzzle",

        difficulty: 1,

        status: "coming-soon",

        url: "./games/2048/index.html"

    },


    {
        id: "memory",

        name: "Memory Cards",

        description:
            "Lật các thẻ và tìm những cặp giống nhau.",

        icon: "🧠",

        category: "puzzle",

        difficulty: 2,

        status: "available",

        url: "./games/memory/index.html"
    },


    {
        id: "breakout",

        name: "Breakout",

        description:
            "Điều khiển thanh đỡ và phá toàn bộ gạch.",

        icon: "🧱",

        category: "arcade",

        difficulty: 2,

        status: "available",

        url: "./games/breakout/index.html"
    },


    {
        id: "pikachu",

        name: "Pikachu Connect",

        description:
            "Tìm và nối các cặp giống nhau.",

        icon: "⚡",

        category: "puzzle",

        difficulty: 3,

        status: "available",

        url: "./games/pikachu/index.html"
    },


    {
        id: "dino",

        name: "Dino Run",

        description:
            "Chạy, nhảy và né chướng ngại vật.",

        icon: "🦖",

        category: "arcade",

        difficulty: 2,

        status: "available",

        url: "./games/dino/index.html"
    }

];


let currentCategory = "all";

let searchText = "";


/* =========================
   RENDER GAMES
========================= */

function renderGames() {

    const grid =
        document.getElementById(
            "gameGrid"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );


    const filteredGames =
        games.filter(game => {

            const categoryMatch =
                currentCategory === "all" ||
                game.category === currentCategory;


            const searchMatch =
                game.name
                    .toLowerCase()
                    .includes(
                        searchText
                    ) ||

                game.description
                    .toLowerCase()
                    .includes(
                        searchText
                    );


            return (
                categoryMatch &&
                searchMatch
            );

        });


    grid.innerHTML = "";


    if (
        filteredGames.length === 0
    ) {

        emptyState.classList.remove(
            "hidden"
        );

        updateGameCount(0);

        return;

    }


    emptyState.classList.add(
        "hidden"
    );


    filteredGames.forEach(
        game => {

            grid.appendChild(
                createGameCard(game)
            );

        }
    );


    updateGameCount(
        filteredGames.length
    );

}


/* =========================
   CREATE GAME CARD
========================= */

function createGameCard(game) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "game-card";


    const score =
        GameStorage.getHighScore(
            game.id
        );


    const difficulty =
        "★".repeat(
            game.difficulty
        ) +
        "☆".repeat(
            5 - game.difficulty
        );


    const isAvailable =
        game.status === "available";


    card.innerHTML = `

        <div class="game-cover">

            <div class="game-icon">
                ${game.icon}
            </div>

            ${isAvailable
            ? `
                        <div class="available-badge">
                            ● PLAY
                        </div>
                    `
            : `
                        <div class="soon-badge">
                            SOON
                        </div>
                    `
        }

        </div>


        <div class="game-info">

            <div class="game-category">
                ${getCategoryName(game.category)}
            </div>

            <h3>
                ${game.name}
            </h3>

            <p>
                ${game.description}
            </p>


            <div class="game-meta">

                <span class="difficulty">
                    ${difficulty}
                </span>

                <span>
                    🏆 ${score.toLocaleString()}
                </span>

            </div>


            <button
                class="
                    play-button
                    ${isAvailable ? "" : "disabled"}
                "
                ${isAvailable ? "" : "disabled"}
                data-game="${game.id}">

                ${isAvailable
            ? "▶ Chơi ngay"
            : "🔒 Sắp ra mắt"
        }

            </button>

        </div>

    `;


    if (isAvailable) {

        card
            .querySelector(
                ".play-button"
            )
            .addEventListener(
                "click",
                () => {

                    window.location.href =
                        game.url;

                }
            );

    }


    return card;

}


/* =========================
   CATEGORY
========================= */

function getCategoryName(
    category
) {

    const names = {

        arcade: "ARCADE",

        puzzle: "PUZZLE",

        classic: "CLASSIC"

    };


    return (
        names[category] ||
        category
    );

}


/* =========================
   COUNT
========================= */

function updateGameCount(
    count
) {

    document.getElementById(
        "gameCount"
    ).textContent =
        `${count} games`;

}


/* =========================
   SEARCH
========================= */

document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        event => {

            searchText =
                event.target.value
                    .trim()
                    .toLowerCase();

            renderGames();

        }
    );


/* =========================
   CATEGORY BUTTON
========================= */

document
    .querySelectorAll(
        ".category"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".category"
                        )
                        .forEach(
                            b =>
                                b.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    currentCategory =
                        button.dataset.category;

                    renderGames();

                }
            );

        }
    );


/* =========================
   THEME
========================= */

document
    .getElementById(
        "themeButton"
    )
    .addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "light-theme"
            );


            const isLight =
                document.body.classList.contains(
                    "light-theme"
                );


            localStorage.setItem(
                "gameHubTheme",
                isLight
                    ? "light"
                    : "dark"
            );

        }
    );


/* =========================
   INIT
========================= */

function init() {

    const savedTheme =
        localStorage.getItem(
            "gameHubTheme"
        );


    if (
        savedTheme === "light"
    ) {

        document.body.classList.add(
            "light-theme"
        );

    }


    document.getElementById(
        "totalGames"
    ).textContent =
        games.length;


    renderGames();

}


init();
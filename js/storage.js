const GameStorage = {

    PREFIX: "gameHub_",

    getHighScore(gameId) {

        const key =
            this.PREFIX +
            "highScore_" +
            gameId;

        return Number(
            localStorage.getItem(key) || 0
        );

    },


    setHighScore(gameId, score) {

        const current =
            this.getHighScore(gameId);

        if (score > current) {

            const key =
                this.PREFIX +
                "highScore_" +
                gameId;

            localStorage.setItem(
                key,
                score
            );

            return true;

        }

        return false;

    },


    getTotalScore(games) {

        return games.reduce(
            (total, game) => {

                return total +
                    this.getHighScore(
                        game.id
                    );

            },
            0
        );

    },


    clear() {

        Object.keys(
            localStorage
        )
        .filter(
            key =>
                key.startsWith(
                    this.PREFIX
                )
        )
        .forEach(
            key =>
                localStorage.removeItem(
                    key
                )
        );

    }

};
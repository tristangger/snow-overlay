var game = () => {

        const canvas = document.getElementById("app");
        const ctx = canvas.getContext("2d");

        let reqAniId;
        let canvasWith = window.innerWidth;
        let canvasHeight = document.querySelector("body").clientHeight;
        canvas.setAttribute("height", canvasHeight);
        canvas.setAttribute("width", canvasWith);


        let lastTime = Date.now() - 1,
            currentTime = 0,
            delta = 0;


        const game = (flakes) => {
            reqAniId = requestAnimationFrame(game.bind(this, flakes));
            currentTime = Date.now();
            delta = (currentTime - lastTime);
            const interval = 1000 / 60;

            if (delta > interval) {
                update(delta, flakes);
                draw(ctx, flakes);
                lastTime = currentTime - (delta % interval);
            }
        };


        const generateFlakes = (num) => {
            const collection = [];
            for (let j = 0; j < num; j++) {
                const randomNumber = Math.random();
                const obj = {
                    drawX: Math.random() * canvasWith,
                    drawY: Math.random() * canvasHeight,
                    initX: Math.random() * canvasWith,
                    initY: Math.random() * canvasHeight,
                    radius: randomNumber * 3 + 2,
                    speed: randomNumber * 8 + 0.5,
                    iterator: Math.random() * 8 + 2,
                }
                collection.push(obj);

            }

            return collection;
        };


        const init = () => {
            const flakes = generateFlakes(250);
            game(flakes);
        };

        const update = (delta, flakes) => {
            const PI2 = Math.PI / 128;

            for (const flake of flakes) {
                flake.drawX = (Math.cos(flake.iterator) * 32 + flake.initX);
                flake.iterator += PI2;

                flake.drawY = calcPositionY(flake, delta);
            }
        };

        const calcPositionY = (flake, delta) => {
            if ((flake.drawY + flake.radius) > canvasHeight) {
                return -10;
            }
            const baseSpeed = flake.speed / delta;
            return flake.drawY + baseSpeed * (canvasHeight / 100)

        };

        const draw = (ctx, flakes) => {
            const PI2 = Math.PI * 2;
            ctx.clearRect(0, 0, canvasWith, canvasHeight);
            ctx.fillStyle = "white";
            ctx.beginPath();

            for (const flake of flakes) {
                // ctx.filter = `blur(${2 / flake.radius}px)`;
                ctx.moveTo(flake.drawX, flake.drawY);
                ctx.arc(flake.drawX, flake.drawY, flake.radius, 0, PI2, true);
            }
            ctx.closePath();
            ctx.fill();


        };

        init();

        const reset = () => {
            cancelAnimationFrame(reqAniId);
            ctx.clearRect(0, 0, canvasWith, canvasHeight);

        };
        return {reset}


    }
;

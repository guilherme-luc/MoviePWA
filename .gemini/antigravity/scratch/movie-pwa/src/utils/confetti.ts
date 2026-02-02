import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
};

export const triggerSmallConfetti = (originX = 0.5, originY = 0.5) => {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: originX, y: originY },
        zIndex: 9999,
        colors: ['#6366f1', '#a855f7', '#ec4899', '#ffffff'] // Indigo, Purple, Pink, White
    });
};

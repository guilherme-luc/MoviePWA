import confetti from 'canvas-confetti';

// Get current theme colors from CSS variables
const getThemeColors = (): string[] => {
    if (typeof document === 'undefined') return ['#6366f1', '#a855f7', '#ec4899', '#ffffff'];

    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary-500').trim();
    const primaryLight = getComputedStyle(root).getPropertyValue('--color-primary-400').trim();

    // Convert CSS variable format (e.g., "99 102 241") to hex
    const rgbToHex = (rgb: string): string => {
        if (!rgb) return '#6366f1';
        const values = rgb.split(' ').map(v => parseInt(v.trim()));
        if (values.length !== 3) return '#6366f1';
        return '#' + values.map(v => v.toString(16).padStart(2, '0')).join('');
    };

    const primary = rgbToHex(primaryColor);
    const primaryLt = rgbToHex(primaryLight);

    return [primary, primaryLt, '#ffffff'];
};

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
        colors: getThemeColors()
    });
};

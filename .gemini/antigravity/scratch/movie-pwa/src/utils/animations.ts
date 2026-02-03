/**
 * Trigger a pulse animation on an element
 * Useful for subtle feedback when adding to watchlist
 */
export const triggerPulse = (element: HTMLElement) => {
    element.classList.add('animate-pulse');
    setTimeout(() => {
        element.classList.remove('animate-pulse');
    }, 1000);
};

/**
 * Trigger a shake animation for validation errors
 */
export const triggerShake = (element: HTMLElement) => {
    element.style.animation = 'shake 0.5s';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
};

// Add shake keyframes to global styles if not already present
if (typeof document !== 'undefined') {
    const styleSheet = document.styleSheets[0];
    const shakeKeyframes = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;

    try {
        styleSheet.insertRule(shakeKeyframes, styleSheet.cssRules.length);
    } catch (e) {
        // Keyframes might already exist
    }
}

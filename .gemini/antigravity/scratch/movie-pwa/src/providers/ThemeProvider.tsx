import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeColor = 'netflix' | 'prime' | 'hulu' | 'disney' | 'hbo' | 'crunchyroll' | 'apple';

interface ThemeContextType {
    theme: ThemeColor;
    setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<ThemeColor, Record<string, string>> = {
    netflix: { // Red #E50914
        '50': '255 240 240',
        '100': '255 226 226',
        '200': '255 200 200',
        '300': '255 150 150',
        '400': '255 80 80',
        '500': '229 9 20', // Brand match
        '600': '185 9 11',
        '700': '140 0 0',
        '800': '100 0 0',
        '900': '80 0 0',
        '950': '45 0 0',
    },
    prime: { // Blue #00A8E1
        '50': '235 250 255',
        '100': '205 245 255',
        '200': '165 235 255',
        '300': '110 215 255',
        '400': '60 190 255',
        '500': '0 168 225', // Brand match
        '600': '0 135 190',
        '700': '0 100 150',
        '800': '0 80 120',
        '900': '10 60 90',
        '950': '5 35 55',
    },
    hulu: { // Green #1CE783
        '50': '235 255 245',
        '100': '205 255 225',
        '200': '165 255 200',
        '300': '110 255 160',
        '400': '28 231 131', // Brand match
        '500': '0 210 100',
        '600': '0 170 80',
        '700': '0 130 60',
        '800': '0 100 45',
        '900': '0 80 35',
        '950': '0 45 20',
    },
    disney: { // Navy Blue #113CCF
        '50': '240 245 255',
        '100': '225 235 255',
        '200': '200 220 255',
        '300': '160 190 255',
        '400': '100 150 255',
        '500': '60 110 250',
        '600': '17 60 207', // Brand match
        '700': '15 45 160',
        '800': '15 35 130',
        '900': '10 30 100',
        '950': '5 15 60',
    },
    hbo: { // Purple/Violet #9900FF (Max Gradient legacy)
        '50': '250 240 255',
        '100': '240 220 255',
        '200': '225 190 255',
        '300': '200 150 255',
        '400': '170 100 255',
        '500': '153 0 255', // Brand match
        '600': '120 0 200',
        '700': '95 0 160',
        '800': '80 0 130',
        '900': '65 0 100',
        '950': '40 0 60',
    },
    crunchyroll: { // Orange #F47521
        '50': '255 245 235',
        '100': '255 235 210',
        '200': '255 215 170',
        '300': '255 180 120',
        '400': '255 140 70',
        '500': '244 117 33', // Brand match
        '600': '200 90 20',
        '700': '160 65 15',
        '800': '130 50 12',
        '900': '105 40 10',
        '950': '60 20 5',
    },
    apple: { // Monochrome / Silver
        '50': '248 250 252',
        '100': '241 245 249',
        '200': '226 232 240',
        '300': '203 213 225',
        '400': '148 163 184',
        '500': '100 116 139',
        '600': '71 85 105',
        '700': '51 65 85',
        '800': '30 41 59',
        '900': '15 23 42',
        '950': '2 6 23',
    }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeColor>(() => {
        return (localStorage.getItem('theme') as ThemeColor) || 'netflix';
    });

    useEffect(() => {
        const root = document.documentElement;
        const colors = themes[theme];

        Object.entries(colors).forEach(([shade, value]) => {
            root.style.setProperty(`--color-primary-${shade}`, value);
        });

        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeColor = 'indigo' | 'red' | 'blue' | 'green' | 'amber' | 'rose' | 'cyan';

interface ThemeContextType {
    theme: ThemeColor;
    setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<ThemeColor, Record<string, string>> = {
    indigo: {
        '50': '238 242 255',
        '100': '224 231 255',
        '200': '199 210 254',
        '300': '165 180 252',
        '400': '129 140 248',
        '500': '99 102 241',
        '600': '79 70 229',
        '700': '67 56 202',
        '800': '55 48 163',
        '900': '49 46 129',
        '950': '30 27 75',
    },
    red: { // Netflix-like
        '50': '254 242 242',
        '100': '254 226 226',
        '200': '254 202 202',
        '300': '252 165 165',
        '400': '248 113 113',
        '500': '239 68 68',
        '600': '220 38 38',
        '700': '185 28 28',
        '800': '153 27 27',
        '900': '127 29 29',
        '950': '69 10 10',
    },
    blue: { // Prime-like
        '50': '239 246 255',
        '100': '219 234 254',
        '200': '191 219 254',
        '300': '147 197 253',
        '400': '96 165 250',
        '500': '59 130 246',
        '600': '37 99 235',
        '700': '29 78 216',
        '800': '30 64 175',
        '900': '30 58 138',
        '950': '23 37 84',
    },
    green: { // Hulu-like
        '50': '240 253 244',
        '100': '220 252 231',
        '200': '187 247 208',
        '300': '134 239 172',
        '400': '74 222 128',
        '500': '34 197 94',
        '600': '22 163 74',
        '700': '21 128 61',
        '800': '22 101 52',
        '900': '20 83 45',
        '950': '5 46 22',
    },
    amber: { // IMDb-like
        '50': '255 251 235',
        '100': '254 243 199',
        '200': '253 230 138',
        '300': '252 211 77',
        '400': '251 191 36',
        '500': '245 158 11',
        '600': '217 119 6',
        '700': '180 83 9',
        '800': '146 64 14',
        '900': '120 53 15',
        '950': '69 26 3',
    },
    rose: {
        '50': '255 241 242',
        '100': '255 228 230',
        '200': '254 205 211',
        '300': '253 164 175',
        '400': '251 113 133',
        '500': '244 63 94',
        '600': '225 29 72',
        '700': '190 18 60',
        '800': '159 18 57',
        '900': '136 19 55',
        '950': '76 5 25',
    },
    cyan: {
        '50': '236 254 255',
        '100': '207 250 254',
        '200': '165 243 252',
        '300': '103 232 249',
        '400': '34 211 238',
        '500': '6 182 212',
        '600': '8 145 178',
        '700': '14 116 144',
        '800': '21 94 117',
        '900': '22 78 99',
        '950': '8 51 68',
    },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeColor>(() => {
        return (localStorage.getItem('theme') as ThemeColor) || 'indigo';
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

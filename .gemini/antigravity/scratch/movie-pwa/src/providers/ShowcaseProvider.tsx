import React, { createContext, useContext, useState, useEffect } from 'react';

interface ShowcaseContextType {
    isShowcaseMode: boolean;
    toggleShowcaseMode: () => void;
}

const ShowcaseContext = createContext<ShowcaseContextType | undefined>(undefined);

export function ShowcaseProvider({ children }: { children: React.ReactNode }) {
    const [isShowcaseMode, setIsShowcaseMode] = useState<boolean>(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('guest') === 'true') return true;
        return localStorage.getItem('showcase_mode') === 'true';
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // Only persist settings if we are NOT in a forced URL guest session
        // This prevents "infecting" the user's permanent state just because they tested a link
        if (!params.has('guest')) {
            localStorage.setItem('showcase_mode', String(isShowcaseMode));
        }
    }, [isShowcaseMode]);

    const toggleShowcaseMode = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('guest') === 'true') {
            alert("Modo Visitante: Edição desabilitada permanentemente.");
            return;
        }
        setIsShowcaseMode(prev => !prev);
    };

    return (
        <ShowcaseContext.Provider value={{ isShowcaseMode, toggleShowcaseMode }}>
            {children}
        </ShowcaseContext.Provider>
    );
}

export function useShowcase() {
    const context = useContext(ShowcaseContext);
    if (!context) {
        throw new Error('useShowcase must be used within a ShowcaseProvider');
    }
    return context;
}

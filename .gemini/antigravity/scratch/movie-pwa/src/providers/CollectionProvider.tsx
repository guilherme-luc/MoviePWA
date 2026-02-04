import React, { createContext, useContext, useState, useEffect } from 'react';

type CollectionFormat = 'DVD' | 'VHS' | null;

interface CollectionContextType {
    format: CollectionFormat;
    setFormat: (format: CollectionFormat) => void;
    isVHS: boolean;
    isDVD: boolean;
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

export const CollectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Try to restore from session storage first
    const [format, setFormatState] = useState<CollectionFormat>(() => {
        const stored = sessionStorage.getItem('collection_format');
        return (stored === 'DVD' || stored === 'VHS') ? stored : null;
    });

    const setFormat = (newFormat: CollectionFormat) => {
        setFormatState(newFormat);
        if (newFormat) {
            sessionStorage.setItem('collection_format', newFormat);
        } else {
            sessionStorage.removeItem('collection_format');
        }
    };

    const isVHS = format === 'VHS';
    const isDVD = format === 'DVD';

    return (
        <CollectionContext.Provider value={{ format, setFormat, isVHS, isDVD }}>
            {children}
        </CollectionContext.Provider>
    );
};

export const useCollection = () => {
    const context = useContext(CollectionContext);
    if (context === undefined) {
        throw new Error('useCollection must be used within a CollectionProvider');
    }
    return context;
};

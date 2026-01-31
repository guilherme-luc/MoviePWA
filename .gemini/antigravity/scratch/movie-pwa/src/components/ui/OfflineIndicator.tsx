import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { clsx } from 'clsx';

export const OfflineIndicator: React.FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className={clsx(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-amber-600 text-white text-sm font-medium",
            "py-1 px-4 text-center shadow-lg",
            "animate-in slide-in-from-bottom duration-300"
        )}>
            <div className="flex items-center justify-center gap-2">
                <WifiOff size={16} />
                <span>Offline Mode - Read Only</span>
            </div>
        </div>
    );
};

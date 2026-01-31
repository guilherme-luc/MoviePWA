import React from 'react';
import { OfflineIndicator } from '../ui/OfflineIndicator';

interface AppShellProps {
    children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-sans">
            <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-neutral-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        My Movies
                    </h1>
                    {/* Add standard nav actions here later */}
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 safe-area-inset-bottom">
                {children}
            </main>

            <OfflineIndicator />
        </div>
    );
};

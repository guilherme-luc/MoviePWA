import React, { useState } from 'react';
import { useAutoEnrichment } from '../../hooks/useAutoEnrichment';
import { RefreshCw, Settings } from 'lucide-react';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { SettingsModal } from '../modals/SettingsModal';

interface AppShellProps {
    children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
    const { isSyncing, processedCount, totalToProcess } = useAutoEnrichment();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-sans">
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-neutral-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        My Movies
                    </h1>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Sync Indicator */}
                        {isSyncing && (
                            <div className="flex items-center gap-2 text-xs text-neutral-400 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                                <RefreshCw size={12} className="animate-spin text-primary-400" />
                                <span className="hidden sm:inline">
                                    {processedCount}/{totalToProcess}
                                </span>
                            </div>
                        )}

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2.5 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0 border border-white/5"
                            aria-label="Configurações"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 safe-area-inset-bottom">
                {children}
            </main>

            <OfflineIndicator />
        </div>
    );
};

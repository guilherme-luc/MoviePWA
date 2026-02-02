import React from 'react';
import { Home, Search, Dice5, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BottomNavProps {
    onOpenSettings: () => void;
    onOpenRandom: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenSettings, onOpenRandom }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-lg border-t border-white/10 z-50 pb-safe">
            <div className="flex items-center justify-around h-16">
                <button
                    onClick={() => navigate('/')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive('/') ? 'text-primary-400' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                >
                    <Home size={22} className={isActive('/') ? 'fill-current' : ''} />
                    <span className="text-[10px] font-medium">Início</span>
                </button>

                <button
                    onClick={() => {
                        // Focus search input if on home, or navigate home then focus
                        navigate('/');
                        setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder="Pesquisar filme..."]')?.focus(), 100);
                    }}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    <Search size={22} />
                    <span className="text-[10px] font-medium">Buscar</span>
                </button>

                <button
                    onClick={onOpenRandom}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    <Dice5 size={22} />
                    <span className="text-[10px] font-medium">Sugerir</span>
                </button>

                <button
                    onClick={onOpenSettings}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    <Settings size={22} />
                    <span className="text-[10px] font-medium">Ajustes</span>
                </button>
            </div>
        </div>
    );
};

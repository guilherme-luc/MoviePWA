import React, { useState, useEffect } from 'react';
import { X, Save, Key, Paintbrush } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { theme, setTheme } = useTheme();
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem('tmdb_api_key');
            if (stored) setApiKey(stored);
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('tmdb_api_key', apiKey.trim());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Key className="text-primary-400" size={24} />
                        Configurações
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Theme Picker */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                            <Paintbrush size={16} />
                            Tema do Aplicativo
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { id: 'indigo', color: 'bg-[#6366f1]' },
                                { id: 'red', color: 'bg-[#ef4444]' }, // Netflix
                                { id: 'blue', color: 'bg-[#3b82f6]' }, // Prime
                                { id: 'green', color: 'bg-[#22c55e]' }, // Hulu
                                { id: 'amber', color: 'bg-[#f59e0b]' }, // IMDb
                                { id: 'rose', color: 'bg-[#f43f5e]' },
                                { id: 'cyan', color: 'bg-[#06b6d4]' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={`
                                        w-10 h-10 rounded-full ${t.color} flex items-center justify-center transition-all hover:scale-110 active:scale-95
                                        ${theme === t.id ? 'ring-4 ring-white/20 scale-110' : 'opacity-70 hover:opacity-100'}
                                    `}
                                    title={t.id.charAt(0).toUpperCase() + t.id.slice(1)}
                                >
                                    {theme === t.id && <div className="w-3 h-3 bg-white rounded-full shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">
                            TMDB API Key
                        </label>
                        <p className="text-xs text-neutral-500 mb-2">
                            Necessária para buscar capas de filmes automaticamente.
                            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-primary-400 hover:underline ml-1">
                                Obter chave grátis
                            </a>
                        </p>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Cole sua chave aqui..."
                            className="w-full bg-neutral-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-primary-500/50 transition-all font-mono text-sm"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        Salvar
                    </button>
                </div>

            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { X, Save, Key, Paintbrush, Share2 } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { useShowcase } from '../../providers/ShowcaseProvider';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { theme, setTheme } = useTheme();
    const { isShowcaseMode } = useShowcase();
    // Sync preview with actual theme when opening
    useEffect(() => {
        if (isOpen) {
            setPreviewTheme(theme);
        }
    }, [isOpen, theme]);

    const handleSave = () => {
        setTheme(previewTheme); // Commit changes
        onClose();
    };

    const handleClose = () => {
        // Reset preview to current applied theme (just in case)
        setPreviewTheme(theme);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Key className="text-primary-400" size={24} />
                        Configurações
                    </h2>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">

                    {/* Guest Mode Link Generator */}
                    {!isShowcaseMode && (
                        <div className="bg-primary-500/10 p-4 rounded-xl border border-primary-500/20 mb-6">
                            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                                <Share2 size={16} className="text-primary-400" />
                                Compartilhar Coleção (Link Público)
                            </h3>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/?guest=true`;
                                    navigator.clipboard.writeText(link);
                                    alert("🔗 Link copiado!\n\nEnvie para seus amigos. Eles entrarão em modo somente leitura.");
                                }}
                                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                            >
                                Copiar Link de Visitante
                            </button>
                        </div>
                    )}

                    {!isShowcaseMode && (
                        <>
                            {/* Theme Picker */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                                    <Paintbrush size={16} />
                                    Tema do Aplicativo
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'netflix', name: 'N-Flix', color: 'bg-[#E50914]' },
                                        { id: 'prime', name: 'Prime', color: 'bg-[#00A8E1]' },
                                        { id: 'hulu', name: 'Hulu', color: 'bg-[#1CE783]', text: 'text-black' },
                                        { id: 'disney', name: 'Disney', color: 'bg-[#113CCF]' },
                                        { id: 'hbo', name: 'HBO', color: 'bg-[#9900FF]' },
                                        { id: 'crunchyroll', name: 'Crunchy', color: 'bg-[#F47521]' },
                                        { id: 'apple', name: 'Apple', color: 'bg-[#64748b]' },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setPreviewTheme(t.id as any)}
                                            className={`
                                        flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95
                                        ${previewTheme === t.id
                                                    ? 'bg-neutral-800 border-white/40 ring-1 ring-white/20'
                                                    : 'bg-neutral-800/50 border-white/5 hover:border-white/20 hover:bg-neutral-800'}
                                    `}
                                        >
                                            <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center shrink-0 shadow-lg`}>
                                                {previewTheme === t.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="text-sm font-bold text-neutral-200">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                </div>

                {!isShowcaseMode && (
                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            onClick={handleClose}
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
                )}
            </div>
        </div>
    );
};

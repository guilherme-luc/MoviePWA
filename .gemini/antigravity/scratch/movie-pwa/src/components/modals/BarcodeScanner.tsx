import React, { useState } from 'react';
import { X, ScanLine, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onDetected: (code: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onDetected }) => {
    const [manualCode, setManualCode] = useState('');
    const [useCamera, setUseCamera] = useState(false);

    if (!isOpen) return null;

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode) {
            onDetected(manualCode);
            setManualCode('');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ScanLine size={20} className="text-indigo-400" />
                        Escanear Código
                    </h3>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Camera Placeholder */}
                    <div className="aspect-video bg-black rounded-lg border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center text-neutral-500 gap-3 relative overflow-hidden group">

                        {useCamera ? (
                            <div className="text-center p-4">
                                <p className="text-red-400 mb-2 font-medium">Câmera indisponível</p>
                                <p className="text-xs">A biblioteca de scanner não está instalada neste ambiente.</p>
                            </div>
                        ) : (
                            <>
                                <ScanLine size={48} className="opacity-20" />
                                <span className="text-sm">Câmera desligada</span>
                            </>
                        )}

                        {!useCamera && (
                            <button
                                onClick={() => setUseCamera(true)}
                                className="absolute inset-0 flex items-center justify-center bg-transparent"
                            >
                                <span className="sr-only">Ativar Câmera</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs text-neutral-500 font-medium uppercase">Ou digite</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="w-full bg-neutral-800 border-none rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                                placeholder="Código de Barras..."
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!manualCode}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            Usar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

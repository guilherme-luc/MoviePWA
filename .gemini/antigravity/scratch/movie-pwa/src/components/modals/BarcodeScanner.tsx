import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Image as ImageIcon } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string>('');
    const [initializing, setInitializing] = useState(true);

    const startScanner = async () => {
        if (!containerRef.current) return;
        setInitializing(true);
        setError('');

        // Cleanup
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) { /* ignore */ }
        }

        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        try {
            // Relaxed config: No specific aspect ratio or box, let the library handle it
            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    // qrbox is optional, removing it can help with some devices
                },
                (decodedText) => {
                    onScan(decodedText);
                    try { scanner.stop(); } catch (e) { }
                },
                () => { }
            );
            setInitializing(false);
        } catch (err: any) {
            console.error("Scanner error:", err);
            setError("Não foi possível iniciar a câmera automaticamente.");
            setInitializing(false);
        }
    };

    useEffect(() => {
        // Auto-start with a small delay
        const timer = setTimeout(startScanner, 500);
        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                // Simplified stop/clear sequence
                scannerRef.current.stop().catch(() => { }).finally(() => {
                    scannerRef.current?.clear();
                });
            }
        };
    }, []);

    const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !scannerRef.current) return;

        setInitializing(true);
        scannerRef.current.scanFile(file, true)
            .then(decodedText => {
                onScan(decodedText);
            })
            .catch(() => {
                setError("Não foi possível ler o código da imagem. Tente novamente ou digite.");
                setInitializing(false);
            });
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={onClose}
                    className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20"
                >
                    <X size={24} />
                </button>
            </div>

            <h3 className="text-white font-medium mb-4">Escanear Código de Barras</h3>

            <div className="relative w-full max-w-sm aspect-square bg-neutral-900 rounded-2xl border-2 border-white/10 overflow-hidden flex flex-col items-center justify-center">
                <div id="reader" className="w-full h-full absolute inset-0"></div>

                {initializing && !error && (
                    <div className="z-10 text-white text-sm animate-pulse flex flex-col items-center gap-2">
                        <Camera className="animate-bounce" />
                        <span>Iniciando câmera...</span>
                    </div>
                )}

                {error && (
                    <div className="z-10 px-6 text-center">
                        <p className="text-red-400 text-sm mb-4">{error}</p>
                        <button
                            onClick={startScanner}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
                <div className="text-neutral-500 text-xs uppercase tracking-wider font-medium">Ou</div>

                <label className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-colors border border-white/5">
                    <ImageIcon size={20} className="text-indigo-400" />
                    <span>Enviar Foto do Código</span>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileScan}
                    />
                </label>
            </div>

            <p className="text-neutral-500 mt-6 text-xs text-center max-w-xs">
                Dica: Mantenha o código bem iluminado e estável.
            </p>
        </div>
    );
};

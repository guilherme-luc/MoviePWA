import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string>('');
    const [initializing, setInitializing] = useState(true);
    const foundCodeRef = useRef<string | null>(null);

    useEffect(() => {
        if (!scannerRef.current) return;

        const initQuagga = async () => {
            try {
                await Quagga.init({
                    inputStream: {
                        type: "LiveStream",
                        target: scannerRef.current!,
                        constraints: {
                            facingMode: "environment",
                            width: { min: 1280 }, // HD Resolution
                            height: { min: 720 },
                            aspectRatio: { min: 1, max: 2 },
                            advanced: [{ focusMode: "continuous" } as any] // Try to force focus
                        },
                    },
                    locator: {
                        patchSize: "medium",
                        halfSample: false, // CRITICAL: Process full resolution for accuracy
                    },
                    numOfWorkers: navigator.hardwareConcurrency || 2,
                    frequency: 10,
                    decoder: {
                        readers: [
                            "ean_reader",
                            "ean_8_reader",
                            "code_128_reader",
                            "upc_reader",
                            "upc_e_reader"
                        ],
                    },
                    locate: true,
                }, (err) => {
                    if (err) {
                        console.error("Quagga init failed:", err);
                        setError("Erro ao iniciar câmera. " + err.message);
                        setInitializing(false);
                        return;
                    }

                    Quagga.start();
                    setInitializing(false);
                });

                Quagga.onDetected((data) => {
                    const code = data.codeResult.code;
                    // Strict validation: Check for mostly numbers and reasonable length
                    if (code && code.length >= 8 && code !== foundCodeRef.current) {
                        // Debounce slightly
                        const confidence = (data.codeResult as any).confidence;
                        if (confidence && confidence < 0.7) return;

                        foundCodeRef.current = code;
                        Quagga.stop();
                        onScan(code);
                    }
                });

            } catch (e: any) {
                console.error("Setup error:", e);
                setError(e.message || "Erro desconhecido");
                setInitializing(false);
            }
        };

        const timer = setTimeout(initQuagga, 200);

        return () => {
            clearTimeout(timer);
            try {
                Quagga.stop();
                Quagga.offDetected();
            } catch (e) {
                console.warn("Stop error", e);
            }
        };
    }, []);

    const handleRetry = () => {
        window.location.reload();
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

            <h3 className="text-white font-medium mb-4 z-10">Escanear Código</h3>

            <div className="relative w-full max-w-md h-[60vh] bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center border border-white/10">

                {/* Visual Guide - Responsive Line */}
                <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                    <div className="w-[85%] h-32 border-2 border-red-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <p className="absolute -top-8 w-full text-center text-white/80 text-xs font-medium">
                            Alinhe o código aqui
                        </p>
                    </div>
                </div>

                {/* Camera Container - Object Contain to ensure WYSIWYG */}
                <div ref={scannerRef} className="w-full h-full bg-black flex items-center justify-center [&>video]:max-w-full [&>video]:max-h-full [&>video]:object-contain [&>canvas]:hidden"></div>

                {initializing && !error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white text-sm">Ajustando câmera...</span>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-red-400 text-sm mb-4 font-medium">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="bg-white text-black px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>

            <p className="text-neutral-500 mt-6 text-xs text-center max-w-xs">
                Aproxime ou afaste a câmera até focar.
            </p>
        </div>
    );
};

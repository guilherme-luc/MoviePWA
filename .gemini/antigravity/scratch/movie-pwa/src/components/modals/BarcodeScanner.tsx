import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, Camera, RefreshCw } from 'lucide-react';

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
                        name: "Live",
                        type: "LiveStream",
                        target: scannerRef.current!, // Pass the element directly
                        constraints: {
                            facingMode: "environment",
                            width: { min: 640 },
                            height: { min: 480 },
                            aspectRatio: { min: 1, max: 2 }
                        },
                    },
                    locator: {
                        patchSize: "medium",
                        halfSample: true,
                    },
                    numOfWorkers: 2, // Use web workers
                    frequency: 10,
                    decoder: {
                        readers: [
                            "ean_reader", // Standard for Retail/Movies
                            "ean_8_reader",
                            "upc_reader",
                            "upc_e_reader",
                            "code_128_reader" // Common shipping/tracking
                        ],
                        debug: {
                            drawBoundingBox: false,
                            showFrequency: false,
                            drawScanline: false,
                            showPattern: false
                        },
                    },
                    locate: true, // Important for finding barcodes in the frame
                }, (err) => {
                    if (err) {
                        console.error("Quagga init failed:", err);
                        setError("Erro ao iniciar câmera. Verifique permissões/HTTPS.");
                        setInitializing(false);
                        return;
                    }

                    Quagga.start();
                    setInitializing(false);
                });

                Quagga.onDetected((data) => {
                    const code = data.codeResult.code;
                    if (code && code !== foundCodeRef.current) {
                        // Basic validation: often barcodes are > 3 chars
                        if (code.length > 3) {
                            foundCodeRef.current = code;
                            // Visual feedback could go here
                            Quagga.stop();
                            onScan(code);
                        }
                    }
                });

            } catch (e: any) {
                console.error("Setup error:", e);
                setError(e.message || "Erro desconhecido");
                setInitializing(false);
            }
        };

        // Small delay to ensure DOM mount
        const timer = setTimeout(initQuagga, 100);

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

            <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-2xl border-2 border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-2xl">

                {/* Visual Guide Overlay */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-32 border-2 border-red-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-1/2 w-full h-0.5 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    </div>
                </div>

                {/* Camera Container */}
                <div ref={scannerRef} className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>canvas]:hidden"></div>

                {initializing && !error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
                        <Camera className="animate-bounce text-indigo-400" size={32} />
                        <span className="text-white text-sm">Iniciando câmera...</span>
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

            <p className="text-neutral-400 mt-8 text-xs text-center max-w-xs z-10 bg-black/50 px-4 py-2 rounded-full">
                Posicione o código de barras na linha vermelha
            </p>
        </div>
    );
};

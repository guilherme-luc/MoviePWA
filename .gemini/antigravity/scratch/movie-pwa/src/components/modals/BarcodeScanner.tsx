import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string>('');
    const [initializing, setInitializing] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        let mounted = true;

        const manualStart = async () => {
            try {
                // 1. Explicitly ask for permission first using native API
                // This wakes up the permissions prompt more reliably than the library
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });

                // Stop the stream immediately, strict initialization for library comes next
                stream.getTracks().forEach(track => track.stop());

                if (!mounted) return;
                setHasPermission(true);

                // 2. Initialize Library
                const scanner = new Html5Qrcode("reader");
                scannerRef.current = scanner;

                // 3. Start Scanning with minimal config
                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (mounted) onScan(decodedText);
                    },
                    () => { } // Ignore frame errors
                );

                if (mounted) setInitializing(false);

            } catch (err: any) {
                if (mounted) {
                    console.error("Camera Init Error:", err);
                    setInitializing(false);
                    // Differentiate common errors
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setError("Permissão da câmera negada. Por favor, permita o acesso nas configurações do site.");
                    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        setError("Nenhuma câmera encontrada no dispositivo.");
                    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                        setError("A câmera está em uso por outro aplicativo ou bloqueada.");
                    } else {
                        setError("Erro ao iniciar a câmera: " + (err.message || "Desconhecido"));
                    }
                }
            }
        };

        // Small delay to ensure DOM is active
        const timer = setTimeout(manualStart, 200);

        return () => {
            mounted = false;
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(err => console.warn("Stop failed", err));
            }
        };
    }, []);

    const handleRetry = () => {
        setError('');
        setInitializing(true);
        window.location.reload(); // Hard refresh to clear camera locks if needed
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

            <h3 className="text-white font-medium mb-6">Escanear Código</h3>

            <div className="relative w-full max-w-sm aspect-square bg-neutral-900 rounded-2xl border-2 border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-2xl">
                <div id="reader" className="w-full h-full absolute inset-0 bg-black"></div>

                {initializing && !error && (
                    <div className="z-10 text-white text-sm animate-pulse flex flex-col items-center gap-3">
                        <Camera className="animate-bounce text-indigo-400" size={32} />
                        <span>{hasPermission ? "Abrindo câmera..." : "Solicitando permissão..."}</span>
                    </div>
                )}

                {error && (
                    <div className="z-10 px-6 text-center max-w-xs animate-in fade-in zoom-in">
                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-4">
                            <p className="text-red-400 text-sm font-medium leading-relaxed">{error}</p>
                        </div>
                        <button
                            onClick={handleRetry}
                            className="bg-white text-black px-6 py-2 rounded-lg text-sm font-semibold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 w-full"
                        >
                            <RefreshCw size={16} />
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>

            {!error && !initializing && (
                <p className="text-neutral-400 mt-8 text-sm animate-in fade-in slide-in-from-bottom-4 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                    Centralize o código de barras
                </p>
            )}
        </div>
    );
};

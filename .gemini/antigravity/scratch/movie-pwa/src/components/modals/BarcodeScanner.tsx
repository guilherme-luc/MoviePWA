import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string>('');
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        let mounted = true;

        const startScanner = async () => {
            if (!containerRef.current) return;

            await new Promise(r => setTimeout(r, 100)); // Ensure render

            // Cleanup any existing instance
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch (e) { /* ignore */ }
            }

            // Create new instance
            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;

            try {
                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                    },
                    (decodedText) => {
                        if (mounted) onScan(decodedText);
                    },
                    () => { }
                )
                if (mounted) setInitializing(false);
            } catch (err: any) {
                if (mounted) {
                    console.error("Scanner error:", err);
                    setError(err?.message || "Erro ao acessar câmera.");
                    setInitializing(false);
                }
            }
        };

        startScanner();

        return () => {
            mounted = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.clear();
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={onClose}
                    className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20"
                >
                    <X size={24} />
                </button>
            </div>

            <div id="reader" className="w-full max-w-sm h-80 bg-black overflow-hidden relative rounded-xl border border-white/10 flex items-center justify-center">
                {initializing && !error && (
                    <div className="text-white text-sm animate-pulse">Iniciando câmera...</div>
                )}
            </div>

            {error ? (
                <div className="mt-4 px-4 text-center max-w-xs">
                    <p className="text-red-400 mb-2 font-medium">Erro na Câmera</p>
                    <p className="text-neutral-500 text-xs">
                        {error.includes("permission")
                            ? "Permissão negada. Ative a câmera nas configurações do navegador."
                            : "Verifique se está usando HTTPS ou Localhost."}
                    </p>
                    <button onClick={() => window.location.reload()} className="mt-4 text-xs bg-white/10 px-3 py-2 rounded text-white">
                        Tentar Recarregar
                    </button>
                </div>
            ) : (
                <p className="text-neutral-400 mt-6 text-sm animate-in fade-in slide-in-from-bottom-4">
                    Aponte para o código de barras
                </p>
            )}
        </div>
    );
};

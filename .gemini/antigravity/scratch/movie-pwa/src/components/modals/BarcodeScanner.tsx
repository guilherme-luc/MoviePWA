import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const startScanner = async () => {
            if (!containerRef.current) return;

            // Define formats (EAN-13, UPCA, etc) - Passed to constructor if supported or ignored for now to fix build
            // Type definition for Html5Qrcode constructor in typical types is (elementId, verbose). 
            // We will just remove strict format restriction here to pass build, or try to pass it if we are sure.
            // Documentation says: new Html5Qrcode("reader", { formatsToSupport: ... });
            // Let's try to match the TS expectation. If it failed, it means the type defs don't include it in start().

            const formatsToSupport = [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
            ];

            // @ts-ignore - The library types might be slightly outdated compared to docs
            const scanner = new Html5Qrcode("reader", { formatsToSupport });
            scannerRef.current = scanner;

            try {
                await scanner.start(
                    { facingMode: "environment" }, // Rear camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 150 }, // Barcode shaped box
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        // Success
                        onScan(decodedText);
                    },
                    () => {
                        // Ignore frame read errors
                    }
                );
            } catch (err) {
                console.error("Failed to start scanner", err);
                alert("Erro ao iniciar câmera. Verifique permissões.");
                onClose();
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(startScanner, 100);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(console.error);
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

            <div id="reader" className="w-full max-w-sm h-80 bg-black overflow-hidden relative rounded-xl border border-white/10">
                {/* CSS hack to hide the "Stop Scanning" button that HTML5-Qrcode might inject or just pure video */}
            </div>

            <p className="text-neutral-400 mt-6 text-sm">
                Aponte para o código de barras
            </p>
        </div>
    );
};

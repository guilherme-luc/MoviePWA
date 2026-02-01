import React from 'react';
import { X } from 'lucide-react';

interface TrailerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string | null;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ isOpen, onClose, videoId }) => {
    if (!isOpen || !videoId) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all"
                >
                    <X size={24} />
                </button>
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

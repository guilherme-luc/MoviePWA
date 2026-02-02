import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const [startPoint, setStartPoint] = useState<number>(0);
    const [pullChange, setPullChange] = useState<number>(0);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const initTouch = (e: React.TouchEvent) => {
        setStartPoint(e.touches[0].clientY);
    };

    const touchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const currentPull = touch.clientY - startPoint;

        if (window.scrollY === 0 && currentPull > 0) {
            setPullChange(currentPull);
        }
    };

    const endTouch = async () => {
        if (pullChange > 80) { // Threshold to trigger refresh
            setRefreshing(true);
            setPullChange(80); // Snap to threshold
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
                setPullChange(0);
            }
        } else {
            setPullChange(0);
        }
    };

    return (
        <div
            ref={contentRef}
            onTouchStart={initTouch}
            onTouchMove={touchMove}
            onTouchEnd={endTouch}
            className="relative"
        >
            {/* Refresh Indicator */}
            <div
                className="fixed left-0 right-0 flex justify-center pointer-events-none transition-all duration-200 ease-out z-50"
                style={{
                    top: refreshing ? '80px' : (pullChange > 0 ? `${pullChange * 0.5}px` : '-50px'),
                    opacity: pullChange > 0 || refreshing ? 1 : 0
                }}
            >
                <div className="bg-neutral-800 rounded-full p-2 shadow-xl border border-white/10 flex items-center gap-2 px-4">
                    <Loader2 className={`text-primary-400 ${refreshing || pullChange > 80 ? 'animate-spin' : ''}`} size={20} />
                    {refreshing && <span className="text-xs font-bold text-neutral-300">Atualizando...</span>}
                </div>
            </div>

            {children}
        </div>
    );
};

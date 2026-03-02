import React, { useEffect, useState, useRef } from 'react';

interface ZoomIndicatorProps {
    zoom: number;
}

export function ZoomIndicator({ zoom }: ZoomIndicatorProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setIsVisible(true);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 1500);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [zoom]);

    const zoomPercentage = Math.round(zoom * 100);

    return (
        <div
            className={`pointer-events-none fixed bottom-[10px] right-[10px] z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
        >

            <div className="bg-bg-surface border border-border-base rounded-full px-2 py-0.5 text-[10px] font-mono text-text-dim shadow-sm">
                {zoomPercentage}%
            </div>
        </div>
    );
}
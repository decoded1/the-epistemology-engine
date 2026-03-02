import React from 'react';

interface ConvictionMeterProps {
    conviction: number;
    onChange: (newConviction: number) => void;
}

export function ConvictionMeter({ conviction, onChange }: ConvictionMeterProps) {

    const handlePointerInteraction = (e: React.PointerEvent) => {
        e.stopPropagation();
        if (e.buttons !== 1 && e.type !== 'pointerdown') return;

        if (e.type === 'pointerdown') {
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.min(Math.max(0, Math.round((x / rect.width) * 100)), 100);
        onChange(percentage);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div>
            <div className="text-[9px] font-semibold font-mono tracking-[0.12em] uppercase text-text-dim mb-[6px]">
                Conviction
            </div>
            <div
                className="flex items-center gap-[8px] mt-[2px] cursor-col-resize group nodrag"
                onPointerDown={handlePointerInteraction}
                onPointerMove={handlePointerInteraction}
                onPointerUp={handlePointerUp}
            >
                <div className="flex-1 h-[3px] bg-border-base rounded-[2px] relative overflow-hidden transition-all group-hover:h-[8px]">
                    <div
                        className="absolute h-full rounded-[2px] bg-accent-amber opacity-80 transition-all duration-75"
                        style={{ width: `${conviction}%` }}
                    />
                </div>
                <span className="text-[10px] font-mono font-medium text-accent-amber shrink-0 select-none text-right">
                    {conviction}%
                </span>
            </div>
        </div>
    );
}
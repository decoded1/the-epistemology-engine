import React from 'react';

interface EmptyStateProps {
    isVisible: boolean;
}

export function EmptyState({ isVisible }: EmptyStateProps) {
    return (
        <div
            className={`pointer-events-none fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-500 z-0 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
        >
            <h1 className="text-[24px] font-semibold text-text-primary mb-2 tracking-tight">
                The Epistemology Engine
            </h1>
            <p className="text-[13px] text-text-muted mb-8 max-w-[400px] text-center leading-relaxed">
                A spatial knowledge environment for documenting what you know and why you believe it.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-[340px]">
                <div className="flex items-center gap-4 px-4 py-3 bg-bg-surface/40 border border-border-subtle rounded-xl backdrop-blur-sm">
                    <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-bg-elevated border border-border-base rounded text-[11px] font-mono text-accent-blue font-bold">›</div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-text-primary">create concept: [name]</span>
                        </div>
                        <span className="text-[10px] text-text-dim">Start building your graph</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 bg-bg-surface/40 border border-border-subtle rounded-xl backdrop-blur-sm">
                    <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-bg-elevated border border-border-base rounded text-[11px] font-mono text-accent-emerald font-bold">@</div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-mono text-text-primary">query source</span>
                        <span className="text-[10px] text-text-dim">Query your library by source</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 bg-bg-surface/40 border border-border-subtle rounded-xl backdrop-blur-sm">
                    <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-bg-elevated border border-border-base rounded text-[11px] font-mono text-accent-red font-bold">D</div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-mono text-text-primary">Open the Dock</span>
                        <span className="text-[10px] text-text-dim">Open the Dock to triage excerpts</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
import React, { useState } from 'react';
import { LayoutGrid, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { LayoutOptions } from '../../lib/layout';

interface LayoutPanelProps {
    onApply: (opts?: LayoutOptions) => void;
    snapToGrid: boolean;
    onSnapToGridChange: (v: boolean) => void;
    snapGrid: [number, number];
    onSnapGridChange: (v: [number, number]) => void;
}

type Direction = NonNullable<LayoutOptions['direction']>;

const DIRECTION_LABELS: Record<Direction, string> = {
    LR: 'Left → Right',
    RL: 'Right → Left',
    TB: 'Top → Bottom',
    BT: 'Bottom → Top',
};

const SNAP_SIZES = [10, 20, 40, 60] as const;

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ id, active, onClick }: { id: string; active: boolean; onClick: () => void }) {
    return (
        <button
            id={id}
            onClick={onClick}
            className={`relative w-9 h-5 rounded-full border transition-all cursor-pointer ${active
                    ? 'bg-accent-amber-muted border-accent-amber-border'
                    : 'bg-bg-elevated border-border-base'
                }`}
        >
            <div className={`absolute top-[3px] w-[13px] h-[13px] rounded-full transition-all ${active ? 'left-[18px] bg-accent-amber' : 'left-[3px] bg-text-dim'
                }`} />
        </button>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LayoutPanel({
    onApply,
    snapToGrid, onSnapToGridChange,
    snapGrid, onSnapGridChange,
}: LayoutPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [direction, setDirection] = useState<Direction>('TB');
    const [nodesep, setNodesep] = useState(80);
    const [ranksep, setRanksep] = useState(160);

    const handleApply = () => onApply({ direction, nodesep, ranksep });

    return (
        <div className="fixed z-50 animate-fade-in-up select-none" style={{ bottom: '24px', right: '24px' }}>

            {/* ── Collapsed pill ─────────────────────────────────────────────── */}
            {!isExpanded ? (
                <button
                    id="layout-panel-toggle"
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-subtle rounded-full cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.15)] hover:bg-bg-elevated hover:border-border-focus hover:-translate-y-[1px] transition-all group"
                >
                    <LayoutGrid size={13} className="text-text-dim group-hover:text-accent-blue transition-colors" />
                    <span className="text-[11px] font-medium text-text-muted group-hover:text-text-secondary transition-colors">
                        layout settings
                    </span>
                    <ChevronUp size={11} className="text-text-dim group-hover:text-text-muted transition-colors" />
                </button>
            ) : (

                /* ── Expanded panel ──────────────────────────────────────────── */
                <div className="w-[264px] bg-bg-surface border border-border-subtle rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.2)] overflow-hidden">

                    {/* Header */}
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-border-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={13} className="text-accent-blue" />
                            <span className="text-[12px] font-semibold text-text-primary">Layout</span>
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-text-dim hover:text-text-muted transition-colors cursor-pointer"
                        >
                            <ChevronDown size={12} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-5">

                        {/* Direction */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-dim">
                                Direction
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                                {(Object.keys(DIRECTION_LABELS) as Direction[]).map(d => (
                                    <button
                                        key={d}
                                        id={`layout-dir-${d}`}
                                        onClick={() => setDirection(d)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-medium border transition-all cursor-pointer ${direction === d
                                                ? 'bg-accent-blue-muted border-accent-blue-border text-accent-blue'
                                                : 'bg-bg-elevated border-border-base text-text-dim hover:text-text-secondary hover:border-border-focus'
                                            }`}
                                    >
                                        {DIRECTION_LABELS[d]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Spacing */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-dim">
                                Spacing
                            </label>

                            {/* nodesep */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-mono text-text-muted">node gap</span>
                                    <span className="text-[10px] font-mono font-semibold text-text-secondary tabular-nums">{nodesep}px</span>
                                </div>
                                <input
                                    id="layout-nodesep"
                                    type="range" min={20} max={200} step={10}
                                    value={nodesep}
                                    onChange={e => setNodesep(+e.target.value)}
                                    className="w-full h-[3px] rounded-full cursor-pointer"
                                    style={{ background: `linear-gradient(to right, hsl(217,91%,60%) ${((nodesep - 20) / 180) * 100}%, hsl(0,0%,18%) ${((nodesep - 20) / 180) * 100}%)` }}
                                />
                            </div>

                            {/* ranksep */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-mono text-text-muted">rank gap</span>
                                    <span className="text-[10px] font-mono font-semibold text-text-secondary tabular-nums">{ranksep}px</span>
                                </div>
                                <input
                                    id="layout-ranksep"
                                    type="range" min={40} max={320} step={10}
                                    value={ranksep}
                                    onChange={e => setRanksep(+e.target.value)}
                                    className="w-full h-[3px] rounded-full cursor-pointer"
                                    style={{ background: `linear-gradient(to right, hsl(271,91%,65%) ${((ranksep - 40) / 280) * 100}%, hsl(0,0%,18%) ${((ranksep - 40) / 280) * 100}%)` }}
                                />
                            </div>
                        </div>

                        {/* Snap to Grid */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-dim">
                                Snap to Grid
                            </label>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-mono font-semibold text-text-muted">Enable snapping</div>
                                    <div className="text-[9px] text-text-dim mt-0.5">Nodes lock to grid on drag</div>
                                </div>
                                <Toggle
                                    id="layout-snap-toggle"
                                    active={snapToGrid}
                                    onClick={() => onSnapToGridChange(!snapToGrid)}
                                />
                            </div>

                            {snapToGrid && (
                                <div className="flex gap-1 mt-1">
                                    {SNAP_SIZES.map(size => (
                                        <button
                                            key={size}
                                            id={`layout-snap-${size}`}
                                            onClick={() => onSnapGridChange([size, size])}
                                            className={`flex-1 py-1 text-[9px] font-mono font-semibold rounded-md border transition-all cursor-pointer ${snapGrid[0] === size
                                                    ? 'bg-accent-amber-muted border-accent-amber-border text-accent-amber'
                                                    : 'bg-bg-elevated border-border-base text-text-dim hover:text-text-secondary hover:border-border-focus'
                                                }`}
                                        >
                                            {size}px
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Apply button */}
                    <div className="px-4 pb-4">
                        <button
                            id="layout-apply-btn"
                            onClick={handleApply}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-accent-blue-muted border border-accent-blue-border text-accent-blue text-[11px] font-semibold font-mono hover:bg-accent-blue hover:text-white transition-all cursor-pointer group"
                        >
                            <Play size={11} className="group-hover:scale-110 transition-transform" />
                            Apply Layout
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}

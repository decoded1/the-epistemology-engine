import React, { useState } from 'react';
import { LayoutGrid, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { LayoutOptions } from '../../lib/layout';

interface LayoutPanelProps {
    onApply: (opts: LayoutOptions) => void;
}

type Ranker = NonNullable<LayoutOptions['ranker']>;
type Direction = NonNullable<LayoutOptions['direction']>;

const RANKER_INFO: Record<Ranker, string> = {
    'network-simplex': 'Minimises edge lengths. Tight, logical flow.',
    'tight-tree': 'Spreads siblings wider. More organic feel.',
    'longest-path': 'Simple top-down ranking. Fast, but rough.',
};

const DIRECTION_LABELS: Record<Direction, string> = {
    LR: 'Left → Right',
    RL: 'Right → Left',
    TB: 'Top → Bottom',
    BT: 'Bottom → Top',
};

export function LayoutPanel({ onApply }: LayoutPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Settings state
    const [direction, setDirection] = useState<Direction>('LR');
    const [ranker, setRanker] = useState<Ranker>('network-simplex');
    const [nodesep, setNodesep] = useState(60);
    const [ranksep, setRanksep] = useState(100);
    const [greedy, setGreedy] = useState(true);  // greedy acyclicer

    const handleApply = () => {
        onApply({
            direction,
            ranker,
            nodesep,
            ranksep,
            acyclicer: greedy ? 'greedy' : undefined,
        });
    };

    return (
        <div
            className="fixed z-50 animate-fade-in-up select-none"
            style={{ bottom: '24px', right: '24px' }}
        >
            {/* Collapsed pill */}
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
                /* Expanded panel */
                <div className="w-[280px] bg-bg-surface border border-border-subtle rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.2)] overflow-hidden">

                    {/* Header */}
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-border-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={13} className="text-accent-blue" />
                            <span className="text-[12px] font-semibold text-text-primary">Layout</span>
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="flex items-center gap-1 text-[10px] font-mono text-text-dim hover:text-text-muted transition-colors cursor-pointer"
                        >
                            <ChevronDown size={12} />
                        </button>
                    </div>

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

                        {/* Ranker */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-dim">
                                Ranker Algorithm
                            </label>
                            <div className="space-y-1">
                                {(Object.keys(RANKER_INFO) as Ranker[]).map(r => (
                                    <button
                                        key={r}
                                        id={`layout-ranker-${r}`}
                                        onClick={() => setRanker(r)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer group ${ranker === r
                                                ? 'bg-accent-violet-muted border-accent-violet-border'
                                                : 'bg-bg-elevated border-border-base hover:border-border-focus'
                                            }`}
                                    >
                                        <div className={`text-[10px] font-mono font-semibold ${ranker === r ? 'text-accent-violet' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                            {r}
                                        </div>
                                        <div className="text-[9px] mt-0.5 text-text-dim">
                                            {RANKER_INFO[r]}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Spacing sliders */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-dim">
                                Spacing
                            </label>

                            {/* Node sep */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-mono text-text-muted">nodesep</span>
                                    <span className="text-[10px] font-mono font-semibold text-text-secondary tabular-nums">{nodesep}px</span>
                                </div>
                                <input
                                    id="layout-nodesep"
                                    type="range" min={20} max={200} step={10}
                                    value={nodesep}
                                    onChange={e => setNodesep(+e.target.value)}
                                    className="w-full h-[3px] rounded-full accent-accent-blue bg-bg-elevated cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, hsl(217, 91%, 60%) ${((nodesep - 20) / 180) * 100}%, hsl(0,0%,18%) ${((nodesep - 20) / 180) * 100}%)`
                                    }}
                                />
                            </div>

                            {/* Rank sep */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-mono text-text-muted">ranksep</span>
                                    <span className="text-[10px] font-mono font-semibold text-text-secondary tabular-nums">{ranksep}px</span>
                                </div>
                                <input
                                    id="layout-ranksep"
                                    type="range" min={40} max={300} step={10}
                                    value={ranksep}
                                    onChange={e => setRanksep(+e.target.value)}
                                    className="w-full h-[3px] rounded-full cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, hsl(271, 91%, 65%) ${((ranksep - 40) / 260) * 100}%, hsl(0,0%,18%) ${((ranksep - 40) / 260) * 100}%)`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Acyclicer toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-mono font-semibold text-text-muted">Greedy Acyclicer</div>
                                <div className="text-[9px] text-text-dim mt-0.5">Handles cycles more elegantly</div>
                            </div>
                            <button
                                id="layout-greedy-toggle"
                                onClick={() => setGreedy(g => !g)}
                                className={`relative w-9 h-5 rounded-full border transition-all cursor-pointer ${greedy
                                        ? 'bg-accent-emerald-muted border-accent-emerald-border'
                                        : 'bg-bg-elevated border-border-base'
                                    }`}
                            >
                                <div className={`absolute top-[3px] w-[13px] h-[13px] rounded-full transition-all ${greedy ? 'left-[18px] bg-accent-emerald' : 'left-[3px] bg-text-dim'
                                    }`} />
                            </button>
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

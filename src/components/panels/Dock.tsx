import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';
import { AppNode, Excerpt } from '../../types';

interface DockProps {
    selectedNodes: AppNode[];
    onDraggingChange?: (isDragging: boolean) => void;
}

export function Dock({ selectedNodes, onDraggingChange }: DockProps) {
    const excerpts = useGraphStore(state => state.excerpts);
    const isOpen = useGraphStore(state => state.isDockOpen);
    const setIsOpen = useGraphStore(state => state.setDockOpen);
    const assignExcerpt = useGraphStore(state => state.assignExcerpt);
    const dismissExcerpt = useGraphStore(state => state.dismissExcerpt);

    const [filter, setFilter] = useState<'all' | 'literature' | 'media'>('all');
    const [dismissingId, setDismissingId] = useState<string | null>(null);
    const [flashWarningId, setFlashWarningId] = useState<string | null>(null);
    const [draggingExcerpt, setDraggingExcerpt] = useState<{ id: string; x: number; y: number; text: string } | null>(null);

    const filtered = excerpts.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'literature') return e.sourceType === 'epub' || e.sourceType === 'jsonl';
        if (filter === 'media') return e.sourceType === 'yt';
        return true;
    });

    const handleAssign = (excerptId: string) => {
        if (selectedNodes.length === 0) {
            setFlashWarningId(excerptId);
            setTimeout(() => setFlashWarningId(null), 1500);
            return;
        }
        assignExcerpt(excerptId, selectedNodes[0].id);
    };

    const handleDismiss = (excerptId: string) => {
        setDismissingId(excerptId);
        setTimeout(() => {
            dismissExcerpt(excerptId);
        }, 200);
    };

    const handleDragStart = (e: React.PointerEvent, excerpt: Excerpt) => {
        if ((e.target as HTMLElement).closest('button')) return;

        e.preventDefault();
        setDraggingExcerpt({
            id: excerpt.id,
            x: e.clientX,
            y: e.clientY,
            text: excerpt.text
        });
        onDraggingChange?.(true);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            setDraggingExcerpt(prev => prev ? { ...prev, x: moveEvent.clientX, y: moveEvent.clientY } : null);
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            const elements = document.elementsFromPoint(upEvent.clientX, upEvent.clientY);
            const nodeEl = elements.find(el => el.hasAttribute('data-id')); // XYFlow attaches data-id

            if (nodeEl) {
                const nodeId = nodeEl.getAttribute('data-id')!;
                assignExcerpt(excerpt.id, nodeId);
            }

            setDraggingExcerpt(null);
            onDraggingChange?.(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    if (!isOpen) {
        return (
            <div
                className="fixed z-50 flex items-center gap-2 px-3 h-[32px] bg-bg-surface border border-border-subtle rounded-full cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.15)] hover:bg-bg-elevated hover:border-border-focus hover:-translate-y-[1px] transition-all group animate-fade-in-up"
                style={{ bottom: '10px', left: '10px' }}
                onClick={() => setIsOpen(true)}
            >
                <div className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold font-mono border ${excerpts.length > 0 ? 'bg-accent-amber-muted border-accent-amber-border text-accent-amber animate-pulse-ring' : 'bg-bg-elevated border-border-base text-text-dim'}`}>

                    {excerpts.length}
                </div>
                <span className="text-[11px] font-medium text-text-muted group-hover:text-text-secondary transition-colors">unsorted</span>
                <span className="text-[9px] font-mono px-1.5 py-px bg-bg-elevated border border-border-base rounded-[3px] text-text-dim ml-0.5">D</span>
            </div>
        );
    }

    return (
        <div
            className="fixed z-50 w-[360px] max-h-[calc(100vh-100px)] bg-bg-surface border border-border-subtle rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden outline-none animate-fade-in-up"
            style={{ bottom: '10px', left: '10px' }}

        >
            <div className="px-4 pt-3.5 pb-2.5 border-b border-border-base flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-text-primary">Dock</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-px rounded-full bg-accent-amber-muted border border-accent-amber-border text-accent-amber">
                        {excerpts.length} unsorted
                    </span>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-text-dim hover:text-text-muted transition-colors cursor-pointer">
                    <X size={16} />
                </button>
            </div>

            <div className="flex gap-0.5 px-4 py-2 border-b border-border-base">
                {['all', 'literature', 'media'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`text-[10px] font-medium font-mono tracking-[0.04em] px-2.5 py-1 rounded-full capitalize transition-colors cursor-pointer ${filter === f ? 'bg-bg-elevated border border-border-base text-text-secondary' : 'text-text-dim hover:text-text-muted border border-transparent'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-12 px-4 gap-1 animate-in fade-in duration-500">
                        <div className="text-text-dim text-xs font-mono italic">No {filter === 'all' ? 'unsorted' : filter} excerpts</div>
                        <div className="text-text-dim text-[10px] font-mono mt-1 text-center max-w-[200px]">Use the Console to extract from your library with @.</div>
                    </div>
                ) : (
                    filtered.map((excerpt) => (
                        <div
                            key={excerpt.id}
                            onPointerDown={(e) => handleDragStart(e, excerpt)}
                            className={`p-2.5 rounded-lg border hover:bg-bg-hover transition-all group relative cursor-grab active:cursor-grabbing ${dismissingId === excerpt.id ? 'opacity-0 scale-95 duration-200' : 'opacity-100 scale-100 duration-200'
                                } border-transparent ${draggingExcerpt?.id === excerpt.id ? 'opacity-40 grayscale-[0.5]' : ''}`}
                        >
                            {flashWarningId === excerpt.id && (
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-accent-red text-white text-[10px] font-medium rounded shadow-lg animate-fade-in-up whitespace-nowrap z-[70]">
                                    Select a node first
                                </div>
                            )}

                            <div className="absolute top-2.5 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => handleAssign(excerpt.id)}
                                    className={`w-5 h-5 flex items-center justify-center bg-bg-surface border rounded-[4px] transition-colors cursor-pointer ${flashWarningId === excerpt.id ? 'border-accent-red text-accent-red' : 'border-border-base text-text-dim hover:bg-accent-blue-muted hover:border-accent-blue-border hover:text-accent-blue'}`}
                                    title="Assign to selected node"
                                >
                                    <Plus size={12} />
                                </button>
                                <button
                                    onClick={() => handleDismiss(excerpt.id)}
                                    className="w-5 h-5 flex items-center justify-center bg-bg-surface border border-border-base rounded-[4px] text-text-dim hover:bg-accent-red-muted hover:border-accent-red-muted hover:text-accent-red transition-colors cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 flex items-center justify-center rounded-[3px] text-[8px] font-bold shrink-0 ${excerpt.sourceType === 'epub' ? 'bg-accent-blue-muted text-accent-blue' : excerpt.sourceType === 'jsonl' ? 'bg-accent-emerald-muted text-accent-emerald' : 'bg-accent-red-muted text-accent-red'}`}>
                                        {excerpt.sourceType === 'epub' ? 'B' : excerpt.sourceType === 'jsonl' ? '{ }' : '▶'}
                                    </div>
                                    <span className="text-[10px] font-mono text-text-dim tracking-[0.02em] truncate max-w-[180px]">
                                        {excerpt.sourceName}
                                    </span>
                                </div>
                                <span className={`text-[8px] font-bold font-mono tracking-[0.08em] uppercase px-1.5 py-px rounded-[3px] ${excerpt.status === 'new' ? 'bg-accent-amber-muted border border-accent-amber-border text-accent-amber' : 'bg-bg-elevated border border-border-base text-text-dim'}`}>
                                    {excerpt.status}
                                </span>
                            </div>

                            <div className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                                "{excerpt.text}"
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                                <div className="flex gap-1">
                                    {excerpt.tags.map(tag => (
                                        <span key={tag} className="text-[9px] font-mono px-1.5 rounded-full bg-bg-elevated border border-border-base text-text-dim">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <span className="text-[10px] font-mono text-text-dim">{excerpt.location}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="px-4 py-2 border-t border-border-base flex justify-between items-center">
                <span className="text-[10px] font-mono text-text-dim">Drag to node or click <Plus size={10} className="inline mb-0.5" /> to assign</span>
                <button
                    onClick={() => filtered.forEach(e => dismissExcerpt(e.id))}
                    className="text-[10px] font-mono font-medium text-text-dim hover:text-accent-red hover:bg-accent-red-muted px-2 py-0.5 rounded-[4px] transition-colors cursor-pointer"
                >
                    Clear all
                </button>
            </div>

            {draggingExcerpt && (
                <div
                    className="fixed z-[100] pointer-events-none p-3 bg-bg-surface border border-accent-blue rounded-xl shadow-2xl w-[240px] animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        left: draggingExcerpt.x,
                        top: draggingExcerpt.y,
                        transform: 'translate(-50%, -50%) rotate(2deg)'
                    }}
                >
                    <div className="text-[10px] text-text-secondary leading-relaxed line-clamp-3">
                        "{draggingExcerpt.text}"
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 grayscale">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                        <span className="text-[8px] font-mono text-text-dim uppercase tracking-wider">Assigning...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
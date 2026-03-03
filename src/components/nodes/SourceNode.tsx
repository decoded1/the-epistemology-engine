import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { SourceNodeData, SourceNode as SourceNodeType } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeHeader } from './parts/NodeHeader';
import { NodeFooter } from './parts/NodeFooter';

export function SourceNode({ id, data, selected, dragging }: NodeProps<SourceNodeType>) {
    const updateNodeData = useGraphStore(state => state.updateNodeData);

    const handleClass = `!w-[8px] !h-[8px] !bg-bg-elevated !border-[1.5px] rounded-full transition-all z-10 hover:!scale-[1.4] hover:!bg-accent-emerald hover:!border-accent-emerald hover:!shadow-[0_0_8px_rgba(52,211,153,0.5)] cursor-crosshair ${selected ? '!border-accent-emerald' : '!border-text-dim'}`;

    return (
        <div className={`w-[300px] bg-bg-surface border rounded-xl transition-all duration-180 relative group/node select-none
            ${selected
                ? 'border-accent-emerald-border shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(52,211,153,0.15),0_0_24px_-8px_rgba(52,211,153,0.15)] z-10'
                : 'border-border-subtle hover:border-border-focus hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.15)] hover:-translate-y-[1px] z-0'}
            ${dragging ? 'shadow-2xl scale-[1.02] cursor-grabbing' : ''}`}
        >
            <Handle type="source" position={Position.Top} id="top" className={handleClass} />
            <Handle type="source" position={Position.Right} id="right" className={handleClass} />
            <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
            <Handle type="source" position={Position.Left} id="left" className={handleClass} />

            <NodeHeader id={id} type="source" title={data.title} description={data.description} onUpdate={(updates) => updateNodeData(id, updates)} />

            <div className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${data.expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="px-[12px] pt-[10px] pb-[12px] flex flex-col gap-[14px] border-t border-border-base drawer-content">

                        {data.sourceMeta ? (
                            <>
                                <div className="grid grid-cols-2 gap-[6px]">
                                    <div className="flex flex-col gap-[1px] p-[6px_8px] bg-bg-elevated rounded-sm border border-border-base">
                                        <span className="text-[8px] font-semibold font-mono tracking-[0.1em] uppercase text-text-dim">Format</span>
                                        <span className="text-[12px] font-medium text-text-secondary">{data.sourceMeta.format}</span>
                                    </div>
                                    <div className="flex flex-col gap-[1px] p-[6px_8px] bg-bg-elevated rounded-sm border border-border-base">
                                        <span className="text-[8px] font-semibold font-mono tracking-[0.1em] uppercase text-text-dim">Chapters</span>
                                        <span className="text-[12px] font-medium text-text-secondary">{data.sourceMeta.chapters}</span>
                                    </div>
                                    <div className="flex flex-col gap-[1px] p-[6px_8px] bg-bg-elevated rounded-sm border border-border-base">
                                        <span className="text-[8px] font-semibold font-mono tracking-[0.1em] uppercase text-text-dim">Excerpts</span>
                                        <span className="text-[12px] font-medium text-text-secondary">{data.sourceMeta.excerpts}</span>
                                    </div>
                                    <div className="flex flex-col gap-[1px] p-[6px_8px] bg-bg-elevated rounded-sm border border-border-base">
                                        <span className="text-[8px] font-semibold font-mono tracking-[0.1em] uppercase text-text-dim">Linked</span>
                                        <span className="text-[12px] font-medium text-text-secondary">{data.sourceMeta.linked} nodes</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[9px] font-semibold font-mono tracking-[0.12em] uppercase text-text-dim mb-[6px]">Ingestion</div>
                                    <div className="h-[3px] bg-border-base rounded-[2px] overflow-hidden mt-[4px]">
                                        <div
                                            className="h-full rounded-[2px] bg-gradient-to-r from-accent-emerald to-accent-blue transition-all duration-500"
                                            style={{ width: `${data.sourceMeta.indexed}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] font-mono text-text-dim mt-[4px]">
                                        {data.sourceMeta.indexed === 100 ? 'Fully indexed' : 'Indexing...'} · {data.sourceMeta.size}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-text-muted italic opacity-60">
                                No source metadata available.
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <NodeFooter expanded={!!data.expanded} onToggle={() => updateNodeData(id, { expanded: !data.expanded })} />
        </div>
    );
}
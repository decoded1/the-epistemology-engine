import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BranchNodeData, BranchNode as BranchNodeType } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeHeader } from './parts/NodeHeader';
import { NodeFooter } from './parts/NodeFooter';
import { ReferenceList } from './parts/ReferenceList';

export function BranchNode({ id, data, selected, dragging }: NodeProps<BranchNodeType>) {
    const updateNodeData = useGraphStore(state => state.updateNodeData);

    const handleClass = `!w-[8px] !h-[8px] !bg-bg-elevated !border-[1.5px] rounded-full transition-all z-10 hover:!scale-[1.4] hover:!bg-accent-violet hover:!border-accent-violet hover:!shadow-[0_0_8px_rgba(167,139,250,0.5)] cursor-crosshair ${selected ? '!border-accent-violet' : '!border-text-dim'}`;

    const totalReferences = (data.references?.literature?.length || 0) + (data.references?.media?.length || 0);

    const handleRemoveReference = (refId: string, refType: 'literature' | 'media') => {
        if (!data.references) return;
        updateNodeData(id, {
            references: { ...data.references, [refType]: data.references[refType].filter(r => r.id !== refId) }
        });
    };

    return (
        <div className={`w-[300px] bg-bg-surface border rounded-xl transition-all duration-180 relative group/node select-none
            ${selected
                ? 'border-accent-violet-border shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(167,139,250,0.15),0_0_24px_-8px_rgba(167,139,250,0.15)] z-10'
                : 'border-border-subtle hover:border-border-focus hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.15)] hover:-translate-y-[1px] z-0'}
            ${dragging ? 'shadow-2xl scale-[1.02] cursor-grabbing' : ''}`}
        >
            <Handle type="source" position={Position.Top} id="top" className={handleClass} />
            <Handle type="source" position={Position.Right} id="right" className={handleClass} />
            <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
            <Handle type="source" position={Position.Left} id="left" className={handleClass} />

            <NodeHeader id={id} type="branch" title={data.title} description={data.description} docCount={data.references?.literature?.length || 0} mediaCount={data.references?.media?.length || 0} onUpdate={(updates) => updateNodeData(id, updates)} />

            <div className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${data.expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="px-[12px] pt-[10px] pb-[12px] flex flex-col gap-[14px] border-t border-border-base drawer-content">

                        {data.synthesis && (
                            <div className="p-[10px] bg-accent-violet-muted border border-accent-violet-border rounded-lg mb-[2px]">
                                <div className="text-[9px] font-semibold font-mono tracking-[0.1em] uppercase text-accent-violet mb-[6px] opacity-80">
                                    ✦ Synthesis
                                </div>
                                <p className="text-[11px] leading-relaxed text-text-secondary italic">
                                    {data.synthesis}
                                </p>
                            </div>
                        )}

                        {!totalReferences && (
                            <div className="text-xs text-text-muted italic opacity-60">
                                No references yet. Drag excerpts here from the Dock.
                            </div>
                        )}

                        <ReferenceList title="Literature" type="literature" references={data.references?.literature || []} onRemove={(refId) => handleRemoveReference(refId, 'literature')} />
                        <ReferenceList title="Media" type="media" references={data.references?.media || []} onRemove={(refId) => handleRemoveReference(refId, 'media')} />

                        {data.tags && data.tags.length > 0 && (
                            <div>
                                <div className="text-[10px] font-semibold font-mono tracking-[0.12em] uppercase text-text-dim mb-[8px]">Tags</div>
                                <div className="flex flex-wrap gap-[4px]">
                                    {data.tags.map(tag => (
                                        <span key={tag} className="text-[10px] font-mono font-medium px-[7px] py-[2px] rounded-full bg-bg-elevated border border-border-base text-text-muted transition-colors hover:border-border-focus hover:text-text-secondary cursor-default">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <NodeFooter expanded={!!data.expanded} onToggle={() => updateNodeData(id, { expanded: !data.expanded })} />
        </div>
    );
}
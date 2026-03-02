import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ClaimNodeData, ClaimNode as ClaimNodeType } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeHeader } from './parts/NodeHeader';
import { NodeFooter } from './parts/NodeFooter';
import { ReferenceList } from './parts/ReferenceList';
import { ConvictionMeter } from './parts/ConvictionMeter';

export function ClaimNode({ id, data, selected, dragging }: NodeProps<ClaimNodeType>) {
    const updateNodeData = useGraphStore(state => state.updateNodeData);

    const handleClass = `!w-[8px] !h-[8px] !bg-bg-elevated !border-[1.5px] rounded-full transition-all z-10 hover:!scale-[1.4] hover:!bg-accent-amber hover:!border-accent-amber hover:!shadow-[0_0_8px_rgba(251,191,36,0.5)] cursor-crosshair ${selected ? '!border-accent-amber' : '!border-text-dim'}`;

    const totalReferences = (data.supportingEvidence?.length || 0) + (data.counterEvidence?.length || 0);

    const handleRemoveReference = (refId: string, refType: 'supportingEvidence' | 'counterEvidence') => {
        updateNodeData(id, {
            [refType]: (data[refType] || []).filter(r => r.id !== refId)
        });
    };

    return (
        <div className={`w-[300px] bg-bg-surface border rounded-xl transition-all duration-180 relative group/node select-none
            ${selected
                ? 'border-accent-amber-border shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(251,191,36,0.15),0_0_24px_-8px_rgba(251,191,36,0.15)] z-10'
                : 'border-border-subtle hover:border-border-focus hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.15)] hover:-translate-y-[1px] z-0'}
            ${dragging ? 'shadow-2xl scale-[1.02] cursor-grabbing' : ''}`}
        >
            <Handle type="source" position={Position.Top} id="top" className={handleClass} />
            <Handle type="source" position={Position.Right} id="right" className={handleClass} />
            <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
            <Handle type="source" position={Position.Left} id="left" className={handleClass} />

            <NodeHeader id={id} type="claim" title={data.title} description={data.description} onUpdate={(updates) => updateNodeData(id, updates)} />

            <div className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${data.expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="px-[14px] pb-[12px] flex flex-col gap-[14px] border-t border-border-base pt-[12px] drawer-content">

                        <ConvictionMeter conviction={data.conviction ?? 50} onChange={(val) => updateNodeData(id, { conviction: val })} />

                        <ReferenceList title="Supporting Evidence" type="supportingEvidence" references={data.supportingEvidence || []} onRemove={(refId) => handleRemoveReference(refId, 'supportingEvidence')} />
                        <ReferenceList title="Counterevidence" type="counterEvidence" references={data.counterEvidence || []} onRemove={(refId) => handleRemoveReference(refId, 'counterEvidence')} />

                        {data.tags && data.tags.length > 0 && (
                            <div>
                                <div className="text-[9px] font-semibold font-mono tracking-[0.12em] uppercase text-text-dim mb-[6px]">Tags</div>
                                <div className="flex flex-wrap gap-[4px]">
                                    {data.tags.map(tag => (
                                        <span key={tag} className="text-[10px] font-mono font-medium px-[7px] py-[1px] rounded-full bg-bg-elevated border border-border-base text-text-muted transition-colors hover:border-border-focus hover:text-text-secondary cursor-default">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <NodeFooter expanded={!!data.expanded} onToggle={() => updateNodeData(id, { expanded: !data.expanded })} type="claim" referenceCount={totalReferences} />
        </div>
    );
}
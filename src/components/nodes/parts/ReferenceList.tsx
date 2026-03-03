import React from 'react';
import { Reference } from '../../../types';

interface ReferenceListProps {
    title: string;
    references: Reference[];
    type: 'literature' | 'media' | 'supportingEvidence' | 'counterEvidence';
    onRemove: (refId: string) => void;
}

export function ReferenceList({ title, references, type, onRemove }: ReferenceListProps) {
    if (!references || references.length === 0) return null;

    return (
        <div>
            <div className="text-[10px] font-semibold font-mono tracking-[0.12em] uppercase text-text-dim mb-[8px]">
                {title}
            </div>
            <div className="flex flex-col gap-[10px]">
                {references.map((ref) => (
                    <div key={ref.id} className="flex flex-col gap-[4px] group">
                        <div className="flex justify-between items-center">
                            <span className="text-[12px] font-medium text-text-secondary">{ref.sourceName}</span>
                            <div className="flex items-center gap-[6px]">
                                <span className="text-[10px] font-mono text-text-secondary">
                                    {type === 'media' ? ref.timestamp : ref.location}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(ref.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-accent-red transition-all cursor-pointer nodrag leading-none p-0.5 -mr-1"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {type === 'media' ? (
                            <div className="h-[3px] bg-border-base rounded-[2px] relative overflow-hidden mt-[2px]">
                                <div
                                    className="absolute h-full rounded-[2px] bg-accent-blue opacity-70"
                                    style={{ left: `${ref.timelineProgress || 0}%`, width: '12%' }}
                                />
                            </div>
                        ) : (
                            <div className="text-[11px] text-text-muted italic leading-[1.5] pl-[9px] border-l-2 border-border-subtle mt-[2px]">
                                "{ref.text}"
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
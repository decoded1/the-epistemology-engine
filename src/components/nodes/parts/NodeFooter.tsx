import React from 'react';
import { FileText, Sparkles, CheckSquare } from 'lucide-react';
import { AppNodeType } from '../../../types';

interface NodeFooterProps {
    expanded: boolean;
    onToggle: () => void;
    type: AppNodeType;
    referenceCount?: number;
    hasSynthesis?: boolean;
    isIndexed?: boolean;
}

export function NodeFooter({ expanded, onToggle, type, referenceCount = 0, hasSynthesis = false, isIndexed = false }: NodeFooterProps) {
    return (
        <div
            className={`px-[14px] py-[8px] border-t border-border-base flex items-center cursor-pointer hover:bg-bg-hover transition-colors rounded-b-xl group nodrag ${expanded ? 'justify-center' : 'justify-between'}`}
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
        >
            {!expanded && (
                <div className="flex gap-[10px] items-center">
                    {type === 'source' && isIndexed ? (
                        <div className="flex items-center gap-[4px] text-[11px] font-mono text-text-dim">
                            <CheckSquare size={12} className="opacity-60" />
                            indexed
                        </div>
                    ) : referenceCount > 0 ? (
                        <div className="flex items-center gap-[4px] text-[11px] font-mono text-text-dim">
                            <FileText size={12} className="opacity-60" />
                            {referenceCount}
                        </div>
                    ) : null}

                    {hasSynthesis && (
                        <div className="flex items-center gap-[4px] text-[11px] font-mono text-text-dim">
                            <Sparkles size={12} className="opacity-60" />
                            AI
                        </div>
                    )}
                </div>
            )}

            <div className="text-[9px] font-mono font-medium tracking-[0.06em] uppercase text-text-dim group-hover:text-text-muted transition-colors">
                {expanded ? 'collapse' : 'expand'}
            </div>
        </div>
    );
}
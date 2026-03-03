import React from 'react';
import { ChevronDown } from 'lucide-react';

interface NodeFooterProps {
    expanded: boolean;
    onToggle: () => void;
}

export function NodeFooter({ expanded, onToggle }: NodeFooterProps) {
    return (
        <div
            className="border-t border-border-base flex items-center justify-center py-[4px] cursor-pointer hover:bg-bg-hover transition-colors rounded-b-xl nodrag"
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
        >
            <ChevronDown
                size={12}
                className={`text-text-dim transition-[color,transform] duration-[220ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:text-text-muted ${expanded ? 'rotate-180' : ''}`}
            />
        </div>
    );
}

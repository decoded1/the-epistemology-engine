import React, { useState, useEffect } from 'react';
import { AppNodeType } from '../../../types';

interface NodeHeaderProps {
    id: string;
    type: AppNodeType;
    title: string;
    description: string;
    onUpdate: (data: { title?: string; description?: string }) => void;
}

const TYPE_CONFIG = {
    concept: { label: 'Concept', badgeBg: 'bg-accent-blue-muted', badgeText: 'text-accent-blue', badgeBorder: 'border-accent-blue-border' },
    branch: { label: 'Branch', badgeBg: 'bg-accent-violet-muted', badgeText: 'text-accent-violet', badgeBorder: 'border-accent-violet-border' },
    source: { label: 'Source', badgeBg: 'bg-accent-emerald-muted', badgeText: 'text-accent-emerald', badgeBorder: 'border-accent-emerald-border' },
    claim: { label: 'Claim', badgeBg: 'bg-accent-amber-muted', badgeText: 'text-accent-amber', badgeBorder: 'border-accent-amber-border' },
};

export function NodeHeader({ type, title, description, onUpdate }: NodeHeaderProps) {
    const config = TYPE_CONFIG[type];

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempTitle, setTempTitle] = useState(title);
    const [tempDesc, setTempDesc] = useState(description);

    useEffect(() => setTempTitle(title), [title]);
    useEffect(() => setTempDesc(description), [description]);

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if (tempTitle.trim() && tempTitle !== title) onUpdate({ title: tempTitle.trim() });
        else setTempTitle(title);
    };

    const handleDescBlur = () => {
        setIsEditingDesc(false);
        if (tempDesc.trim() && tempDesc !== description) onUpdate({ description: tempDesc.trim() });
        else setTempDesc(description);
    };

    return (
        <div className="px-[14px] pt-[12px] pb-[10px]">
            <div className={`inline-flex items-center gap-[4px] text-[9px] font-semibold font-mono tracking-[0.1em] uppercase px-[7px] py-[2px] rounded border mb-[8px] ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
                {config.label}
            </div>

            {isEditingTitle ? (
                <input
                    autoFocus
                    className="w-full bg-bg-input border border-border-focus rounded px-1.5 py-0.5 text-[14px] font-semibold text-text-primary outline-none mb-[4px] nodrag"
                    value={tempTitle}
                    onChange={e => setTempTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleTitleBlur();
                        if (e.key === 'Escape') { setIsEditingTitle(false); setTempTitle(title); }
                    }}
                />
            ) : (
                <div
                    onDoubleClick={() => setIsEditingTitle(true)}
                    className="text-[14px] font-semibold text-text-primary leading-[1.3] mb-[4px] hover:underline underline-offset-2 decoration-border-focus decoration-dashed cursor-text"
                >
                    {title}
                </div>
            )}

            {isEditingDesc ? (
                <textarea
                    autoFocus
                    className="w-full bg-bg-input border border-border-focus rounded px-1.5 py-1 text-[12px] text-text-muted outline-none leading-[1.5] resize-none min-h-[48px] nodrag"
                    value={tempDesc}
                    onChange={e => setTempDesc(e.target.value)}
                    onBlur={handleDescBlur}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDescBlur(); }
                        if (e.key === 'Escape') { setIsEditingDesc(false); setTempDesc(description); }
                    }}
                />
            ) : (
                <div
                    onDoubleClick={() => setIsEditingDesc(true)}
                    className="text-[12px] text-text-muted leading-[1.5] line-clamp-2 hover:text-text-secondary transition-colors cursor-text hover:underline underline-offset-2 decoration-border-focus decoration-dashed"
                >
                    {description || "Double-click to add description..."}
                </div>
            )}
        </div>
    );
}
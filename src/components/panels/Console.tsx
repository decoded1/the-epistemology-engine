import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, X, ArrowRight, BookOpen, Database, PlaySquare, Sparkles } from 'lucide-react';
import { AppNode, AppNodeType, SemanticRelationType, Source } from '../../types';
import { Toast, ToastProps } from '../ui/Toast';
import type { Suggestion } from '../../App';

// ── Relation type badge colours ───────────────────────────────────────────────
const REL_COLORS: Record<string, string> = {
    supports: 'bg-accent-emerald-muted border-accent-emerald-border text-accent-emerald',
    contradicts: 'bg-accent-red-muted    border-accent-red-border    text-accent-red',
    refines: 'bg-accent-amber-muted  border-accent-amber-border  text-accent-amber',
    prerequisite: 'bg-accent-violet-muted border-accent-violet-border text-accent-violet',
    extends: 'bg-accent-blue-muted   border-accent-blue-border   text-accent-blue',
};

interface ConsoleProps {
    selectedNodes: AppNode[];
    onCommand: (cmd: string, edgeType?: SemanticRelationType, scope?: Source | null) => void;
    onNodeCreate: (type: AppNodeType, title: string) => void;
    onSuggest: (query: string) => Promise<void>;
    suggestions: Suggestion[];
    onAcceptSuggestion: (s: Suggestion) => void;
    onDismissSuggestions: () => void;
    onDeselect: (id: string) => void;
    onClearSelection: () => void;
    isLoading: boolean;
    toast: ToastProps | null;
    onDismissToast: () => void;
    sources?: Source[];
}

export function Console({
    selectedNodes,
    onCommand,
    onNodeCreate,
    onSuggest,
    suggestions,
    onAcceptSuggestion,
    onDismissSuggestions,
    onDeselect,
    onClearSelection,
    isLoading,
    toast,
    onDismissToast,
    sources = []
}: ConsoleProps) {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [edgeType, setEdgeType] = useState<SemanticRelationType>('supports');
    const [activeScope, setActiveScope] = useState<Source | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [filteredSources, setFilteredSources] = useState<Source[]>(sources);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const SUGGEST_PATTERN = /\b(suggest|expand|what|add|more|other|idea|propose|give me|find)\b/i;
    const isSuggestIntent = selectedNodes.length === 1 && SUGGEST_PATTERN.test(input);

    const handleCommandOrCreation = (trimmedInput: string) => {
        if (!trimmedInput && !activeScope) return;

        if (isSuggestIntent && trimmedInput) {
            onSuggest(trimmedInput);
            setInput('');
            return;
        }

        const nodeTypes = ['concept', 'branch', 'source', 'claim'];
        const createRegex = new RegExp(`^create (${nodeTypes.join('|')}):\\s*(.+)$`, 'i');
        const match = trimmedInput.match(createRegex);

        if (match) {
            onNodeCreate(match[1].toLowerCase() as AppNodeType, match[2].trim());
        } else {
            onCommand(trimmedInput, selectedNodes.length === 2 ? edgeType : undefined, activeScope);
        }

        setInput('');
        setActiveScope(null);
        onDismissToast();
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isDropdownOpen) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, filteredSources.length - 1)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); return; }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredSources[selectedIndex]) { setActiveScope(filteredSources[selectedIndex]); setIsDropdownOpen(false); setInput(''); }
                return;
            }
            if (e.key === 'Escape') { e.preventDefault(); setIsDropdownOpen(false); return; }
        }

        if (e.key === 'Enter') {
            handleCommandOrCreation(input.trim());
        } else if (e.key === 'Escape') {
            if (suggestions.length > 0) { onDismissSuggestions(); return; }
            setInput('');
            setActiveScope(null);
            setIsDropdownOpen(false);
            onClearSelection();
            onDismissToast();
            e.currentTarget.blur();
        } else if (e.key === 'Backspace' && input === '' && activeScope) {
            setActiveScope(null);
        }
    };

    useEffect(() => {
        if (input.includes('@')) {
            const match = input.match(/@([\w\s]*)$/);
            if (match) {
                const query = match[1].toLowerCase();
                setFilteredSources(sources.filter(s => s.name.toLowerCase().includes(query)));
                setSelectedIndex(0);
                setIsDropdownOpen(true);
            } else {
                setIsDropdownOpen(false);
            }
        } else {
            setIsDropdownOpen(false);
        }
    }, [input, sources]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && document.activeElement !== inputRef.current) onClearSelection();
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [onClearSelection]);

    const placeholder = useMemo(() => {
        if (activeScope) return 'Query to extract from this source...';
        if (selectedNodes.length === 1) return 'Ask about this node, or "suggest contradictions / expansions..."';
        if (selectedNodes.length === 2) return 'Describe the relationship, or let the engine propose one...';
        return 'scaffold: [topic]  ·  @source [query]  ·  or ask anything...';
    }, [activeScope, selectedNodes.length]);

    const hasChips = selectedNodes.length > 0 || !!activeScope;
    const showHints = isFocused || selectedNodes.length > 0;

    return (
        <div
            ref={containerRef}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-[900px] px-5 flex flex-col gap-[6px]"
            style={{ bottom: '10px' }}
        >
            {/* ── Source scope dropdown ──────────────────────────────────── */}
            {isDropdownOpen && filteredSources.length > 0 && (
                <div className="absolute bottom-[calc(100%+8px)] left-5 right-5 bg-bg-surface border border-border-subtle rounded-xl shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden max-h-[300px] z-[60]">
                    <div className="px-3 py-2 border-b border-border-subtle bg-bg-elevated/50 text-[10px] uppercase font-mono tracking-wider text-text-dim font-semibold">
                        Select Scope
                    </div>
                    <div className="overflow-y-auto w-full py-1">
                        {filteredSources.map((source, idx) => (
                            <div
                                key={source.id}
                                className={`w-full px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
                                onClick={() => { setActiveScope(source); setIsDropdownOpen(false); setInput(''); inputRef.current?.focus(); }}
                            >
                                <div className="flex items-center gap-2.5">
                                    {source.type === 'epub' && <BookOpen size={14} className="text-accent-blue" />}
                                    {source.type === 'jsonl' && <Database size={14} className="text-accent-emerald" />}
                                    {source.type === 'yt' && <PlaySquare size={14} className="text-accent-red" />}
                                    <span className={`text-xs font-semibold ${idx === selectedIndex ? 'text-text-primary' : 'text-text-secondary'}`}>
                                        {source.name}
                                    </span>
                                </div>
                                <div className="text-[10px] font-mono text-text-muted">{source.meta}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Engine response card ───────────────────────────────────── */}
            {toast && <Toast {...toast} />}

            {/* ── AI Suggestion Tray ─────────────────────────────────────── */}
            {suggestions.length > 0 && (
                <div className="flex flex-col gap-[5px]">
                    <div className="flex items-center justify-between px-[2px] pb-[2px]">
                        <div className="flex items-center gap-[5px] font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-text-dim">
                            <Sparkles size={10} className="text-accent-amber" />
                            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} — click to add
                        </div>
                        <button onClick={onDismissSuggestions} className="text-text-dim hover:text-text-muted transition-colors cursor-pointer">
                            <X size={12} />
                        </button>
                    </div>
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => onAcceptSuggestion(s)}
                            className="w-full text-left px-4 py-3 bg-bg-surface border border-border-subtle rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-border-focus hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all cursor-pointer group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold text-text-primary group-hover:text-white transition-colors leading-tight">{s.title}</div>
                                    <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed line-clamp-2">{s.description}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full border ${REL_COLORS[s.relationType] ?? ''}`}>
                                        {s.relationType}
                                    </span>
                                    <span className="px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-full border bg-bg-elevated border-border-base text-text-dim">
                                        {s.nodeType}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Main bar ──────────────────────────────────────────────── */}
            <div className="flex items-center h-[44px] bg-bg-surface border border-border-subtle rounded-[14px] overflow-hidden shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.025),0_12px_40px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.2)]">

                {/* Chips zone */}
                {hasChips && (
                    <>
                        <div className="flex items-center gap-[5px] px-[10px] flex-shrink-0">
                            {selectedNodes.map((node, idx) => {
                                const isSecond = idx === 1;
                                return (
                                    <React.Fragment key={node.id}>
                                        {isSecond && (
                                            <ArrowRight size={11} className="text-text-dim flex-shrink-0" />
                                        )}
                                        <div className={`flex items-center gap-[4px] px-[7px] py-[3px] rounded-[7px] border text-[11px] font-medium flex-shrink-0 ${isSecond ? 'bg-accent-violet-muted border-accent-violet-border text-accent-violet' : 'bg-accent-blue-muted border-accent-blue-border text-accent-blue'}`}>
                                            <span className="truncate max-w-[130px]">{node.data.title}</span>
                                            <button
                                                onClick={() => onDeselect(node.id)}
                                                className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    </React.Fragment>
                                );
                            })}

                            {activeScope && (
                                <div className="flex items-center gap-[4px] px-[7px] py-[3px] rounded-[7px] border text-[11px] font-medium bg-accent-emerald-muted border-accent-emerald-border text-accent-emerald flex-shrink-0">
                                    <BookOpen size={10} className="flex-shrink-0" />
                                    <span className="truncate max-w-[120px]">{activeScope.name}</span>
                                    <button
                                        onClick={() => setActiveScope(null)}
                                        className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2-node rel selector */}
                        {selectedNodes.length === 2 && (
                            <>
                                <div className="w-px h-[22px] bg-border-base flex-shrink-0" />
                                <div className="flex items-center gap-[6px] px-[10px] flex-shrink-0">
                                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-text-dim">via</span>
                                    <select
                                        autoFocus
                                        value={edgeType}
                                        onChange={e => setEdgeType(e.target.value as SemanticRelationType)}
                                        className="bg-transparent border-none font-mono text-[11px] font-semibold text-accent-blue outline-none cursor-pointer"
                                    >
                                        <option value="supports" className="bg-bg-surface">supports</option>
                                        <option value="contradicts" className="bg-bg-surface">contradicts</option>
                                        <option value="refines" className="bg-bg-surface">refines</option>
                                        <option value="prerequisite" className="bg-bg-surface">prerequisite</option>
                                        <option value="extends" className="bg-bg-surface">extends</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="w-px h-[22px] bg-border-base flex-shrink-0" />
                    </>
                )}

                {/* Input zone */}
                <div className="flex-1 flex items-center gap-[8px] px-[10px] min-w-0">
                    {isLoading ? (
                        <Loader2 size={14} className="text-accent-blue animate-spin flex-shrink-0" />
                    ) : (
                        <span className={`font-mono text-[13px] font-semibold flex-shrink-0 transition-colors ${isFocused ? 'text-accent-blue' : 'text-text-dim'}`}>›</span>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] text-text-primary placeholder:text-text-dim"
                        disabled={isLoading}
                    />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-[4px] pr-[8px] flex-shrink-0">
                    {isSuggestIntent && !isLoading && (
                        <button
                            onClick={() => { onSuggest(input.trim()); setInput(''); }}
                            className="flex items-center gap-[5px] px-[10px] h-[28px] rounded-[7px] bg-accent-amber-muted border border-accent-amber-border text-accent-amber font-mono text-[10px] font-semibold cursor-pointer transition-all hover:bg-accent-amber hover:text-black"
                        >
                            <Sparkles size={10} />
                            Suggest
                        </button>
                    )}
                    <button
                        onClick={() => handleCommandOrCreation(input.trim())}
                        disabled={isLoading}
                        className="flex items-center justify-center w-[28px] h-[28px] rounded-[8px] border border-border-base text-text-dim hover:border-accent-blue-border hover:text-accent-blue hover:bg-accent-blue-muted transition-all cursor-pointer disabled:opacity-40"
                    >
                        <ArrowRight size={12} />
                    </button>
                </div>
            </div>

            {/* ── Hints ─────────────────────────────────────────────────── */}
            {showHints && (
                <div className="flex items-center gap-[10px] px-[4px] font-mono text-[9px] text-text-dim">
                    {!activeScope && selectedNodes.length === 0 && (
                        <span className="flex items-center gap-[4px]">
                            <kbd className="px-[4px] py-[1px] bg-bg-elevated border border-border-base rounded-[3px] text-text-muted">@</kbd>
                            scope source
                        </span>
                    )}
                    <span className="flex items-center gap-[4px]">
                        <kbd className="px-[4px] py-[1px] bg-bg-elevated border border-border-base rounded-[3px] text-text-muted">↵</kbd>
                        run
                    </span>
                    <span className="flex items-center gap-[4px]">
                        <kbd className="px-[4px] py-[1px] bg-bg-elevated border border-border-base rounded-[3px] text-text-muted">esc</kbd>
                        clear
                    </span>
                    {selectedNodes.length === 1 && !isSuggestIntent && (
                        <span className="text-accent-blue/70 font-medium flex items-center gap-[4px]">
                            · hold <kbd className="px-[4px] py-[1px] bg-bg-elevated border border-border-base rounded-[3px]">Shift</kbd> + click to link
                        </span>
                    )}
                    {selectedNodes.length === 1 && isSuggestIntent && (
                        <span className="text-accent-amber/70 font-medium flex items-center gap-[4px]">
                            · <Sparkles size={9} /> AI will suggest nodes
                        </span>
                    )}
                    {selectedNodes.length === 2 && (
                        <span className="text-accent-blue/70 font-medium">· Ready to link</span>
                    )}
                </div>
            )}
        </div>
    );
}

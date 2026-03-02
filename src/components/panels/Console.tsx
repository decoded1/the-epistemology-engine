import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, X, ArrowRight, BookOpen, Database, PlaySquare } from 'lucide-react';
import { AppNode, AppNodeType, SemanticRelationType, Source } from '../../types';
import { Toast, ToastProps } from '../ui/Toast';

interface ConsoleProps {
    selectedNodes: AppNode[];
    onCommand: (cmd: string, edgeType?: SemanticRelationType, scope?: Source | null) => void;
    onNodeCreate: (type: AppNodeType, title: string) => void;
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

    const handleCommandOrCreation = (trimmedInput: string) => {
        if (!trimmedInput && !activeScope) return;

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
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredSources.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredSources[selectedIndex]) {
                    setActiveScope(filteredSources[selectedIndex]);
                    setIsDropdownOpen(false);
                    setInput('');
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsDropdownOpen(false);
                return;
            }
        }

        if (e.key === 'Enter') {
            handleCommandOrCreation(input.trim());
        } else if (e.key === 'Escape') {
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

    // Global escape to clear selection
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && document.activeElement !== inputRef.current) {
                onClearSelection();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [onClearSelection]);

    const placeholder = useMemo(() => {
        if (activeScope) return "Query to extract from this source...";
        if (selectedNodes.length === 1) return "Find excerpts, add tags, synthesize, or ask about this node...";
        if (selectedNodes.length === 2) return "Describe the relationship, or let the engine propose one...";
        return "scaffold: [topic]  ·  @source [query]  ·  or ask anything...";
    }, [activeScope, selectedNodes.length]);

    return (
        <div ref={containerRef} className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-[720px] px-4 flex flex-col gap-2" style={{ bottom: '24px' }}>

            {/* Scope Selection Dropdown */}
            {isDropdownOpen && filteredSources.length > 0 && (
                <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-bg-surface border border-border-subtle rounded-xl shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden max-h-[300px] z-[60]">
                    <div className="px-3 py-2 border-b border-border-subtle bg-bg-elevated/50 text-[10px] uppercase font-mono tracking-wider text-text-dim font-semibold">Select Scope</div>
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
                                    <span className={`text-xs font-semibold ${idx === selectedIndex ? 'text-text-primary' : 'text-text-secondary'}`}>{source.name}</span>
                                </div>
                                <div className="text-[10px] font-mono text-text-muted">{source.meta}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.03),0_24px_80px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden transition-all">

                {/* Context Strip */}
                {selectedNodes.length > 0 && (
                    <div className={`px-4 pt-3 pb-2 flex items-center justify-between border-b border-border-base bg-bg-elevated/50 ${selectedNodes.length === 2 ? 'bg-accent-blue/5' : ''}`}>
                        <div className="flex items-center gap-2">
                            {selectedNodes.map((node, idx) => {
                                const isSecond = idx === 1;
                                const chipBg = isSecond ? 'bg-accent-violet-muted' : 'bg-accent-blue-muted';
                                const chipBorder = isSecond ? 'border-accent-violet-border' : 'border-accent-blue-border';
                                const chipText = isSecond ? 'text-accent-violet' : 'text-accent-blue';

                                return (
                                    <React.Fragment key={node.id}>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${chipBg} ${chipBorder} ${chipText} shadow-sm transition-all`}>
                                            <span className="truncate max-w-[150px]">{node.data.title}</span>
                                            <button onClick={() => onDeselect(node.id)} className="opacity-50 hover:opacity-100 hover:bg-bg-surface/20 rounded-full p-0.5 transition-all cursor-pointer">
                                                <X size={12} />
                                            </button>
                                        </div>
                                        {idx === 0 && selectedNodes.length === 2 && (
                                            <ArrowRight size={14} className="text-text-dim mx-1" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {selectedNodes.length === 2 && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-bg-surface border border-border-base rounded-lg shadow-sm animate-in zoom-in-95 duration-200">
                                <span className="text-[9px] font-mono font-bold text-text-dim uppercase tracking-wider">Relationship</span>
                                <select
                                    autoFocus
                                    value={edgeType}
                                    onChange={e => setEdgeType(e.target.value as SemanticRelationType)}
                                    className="bg-transparent border-none text-xs font-semibold text-accent-blue outline-none cursor-pointer hover:text-accent-blue-focus transition-colors"
                                >
                                    <option value="supports" className="bg-bg-surface">supports</option>
                                    <option value="contradicts" className="bg-bg-surface">contradicts</option>
                                    <option value="refines" className="bg-bg-surface">refines</option>
                                    <option value="prerequisite" className="bg-bg-surface">prerequisite</option>
                                    <option value="extends" className="bg-bg-surface">extends</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Response Toast Area */}
                {toast && <Toast {...toast} />}

                {/* Input Bar */}
                <div className="flex items-center px-4 h-[52px] gap-2.5">
                    {isLoading ? (
                        <Loader2 size={16} className="text-accent-blue animate-spin" />
                    ) : (
                        <span className={`font-mono text-[14px] font-semibold transition-colors ${isFocused ? 'text-accent-blue' : 'text-text-dim'}`}>›</span>
                    )}

                    {activeScope && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent-emerald-muted border border-accent-emerald-border rounded-full shadow-sm shrink-0">
                            <span className="text-[11px] font-mono text-accent-emerald tracking-tight">{activeScope.name}</span>
                            <button onClick={() => setActiveScope(null)} className="opacity-60 hover:opacity-100 text-accent-emerald hover:bg-accent-emerald/20 rounded-full p-0.5 transition-all cursor-pointer">
                                <X size={10} />
                            </button>
                        </div>
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
                        className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-dim"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleCommandOrCreation(input.trim())}
                        className="w-[30px] h-[30px] flex items-center justify-center rounded border border-border-base text-text-dim hover:border-accent-blue hover:text-accent-blue hover:bg-accent-blue-muted transition-all cursor-pointer"
                        disabled={isLoading}
                    >
                        <ArrowRight size={14} />
                    </button>
                </div>

                {/* Keyboard Hints Footer */}
                {(isFocused || selectedNodes.length > 0) && (
                    <div className="px-4 py-2 border-t border-border-base bg-bg-elevated/30 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[10px] font-mono text-text-dim">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><kbd className="px-1 bg-bg-elevated border border-border-base rounded-[3px] text-text-muted">@</kbd> index</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 bg-bg-elevated border border-border-base rounded-[3px] text-text-muted">↵</kbd> run</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 bg-bg-elevated border border-border-base rounded-[3px] text-text-muted">esc</kbd> clear</span>
                            </div>
                            {selectedNodes.length === 1 && (
                                <span className="text-accent-blue/80 font-medium animate-pulse">
                                    Hold <kbd className="px-1 bg-bg-elevated border border-border-base rounded-[3px]">Shift</kbd> + click another node to create an edge
                                </span>
                            )}
                        </div>
                        {selectedNodes.length === 2 && (
                            <span className="text-[9px] font-mono font-medium text-accent-blue uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300">
                                Ready to link
                            </span>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export interface ToastProps {
    message: string;
    type: 'info' | 'success' | 'error';
    onDismiss: () => void;
}

export function Toast({ message, type, onDismiss }: ToastProps) {
    const [displayedMessage, setDisplayedMessage] = useState('');
    const typingFrameRef = useRef<number>();

    useEffect(() => {
        if (type === 'error') {
            setDisplayedMessage(message);
            return;
        }

        // Typewriter effect for AI responses
        setDisplayedMessage('');
        let charIndex = 0;
        let accumulator = 0;
        const charsPerFrame = 0.5;

        const animateTyping = () => {
            accumulator += charsPerFrame;
            if (accumulator >= 1) {
                const charsToAdd = Math.floor(accumulator);
                accumulator -= charsToAdd;
                charIndex += charsToAdd;
                setDisplayedMessage(message.slice(0, charIndex));
            }

            if (charIndex < message.length) {
                typingFrameRef.current = requestAnimationFrame(animateTyping);
            } else {
                setDisplayedMessage(message);
            }
        };

        typingFrameRef.current = requestAnimationFrame(animateTyping);

        // Auto dismiss after a delay
        const dismissTimeout = setTimeout(() => {
            onDismiss();
        }, 8000);

        return () => {
            if (typingFrameRef.current) cancelAnimationFrame(typingFrameRef.current);
            clearTimeout(dismissTimeout);
        };
    }, [message, type, onDismiss]);

    return (
        <div className="bg-bg-surface border border-border-subtle rounded-[12px] overflow-hidden shadow-[0_8px_40px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between px-[12px] py-[7px] border-b border-border-base">
                <div className="flex items-center gap-[5px] font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-accent-blue">
                    <Sparkles size={10} />
                    Engine
                </div>
                <button
                    onClick={onDismiss}
                    className="flex items-center justify-center w-[18px] h-[18px] rounded-[4px] text-text-dim hover:text-text-muted transition-colors cursor-pointer"
                >
                    <X size={11} />
                </button>
            </div>
            <div className="px-[14px] py-[9px] max-h-[120px] overflow-y-auto">
                <p className={`text-[12px] leading-[1.6] ${type === 'error' ? 'text-accent-red' : 'text-text-secondary'}`}>
                    {displayedMessage}
                    {displayedMessage.length < message.length && type !== 'error' && (
                        <span className="inline-block w-1.5 h-3 ml-0.5 bg-accent-blue align-middle animate-pulse" />
                    )}
                </p>
            </div>
        </div>
    );
}
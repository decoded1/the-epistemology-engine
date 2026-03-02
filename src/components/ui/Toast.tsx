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
        <div className="bg-bg-elevated/30 border-b border-border-base animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-surface/50">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-accent-blue uppercase tracking-wider">
                    <Sparkles size={10} />
                    Engine
                </div>
                <button
                    onClick={onDismiss}
                    className="text-text-dim hover:text-text-primary transition-colors cursor-pointer"
                >
                    <X size={12} />
                </button>
            </div>
            <div className="px-4 py-3 max-h-[120px] overflow-y-auto">
                <p className={`text-xs leading-relaxed ${type === 'error' ? 'text-accent-red' : 'text-text-secondary'}`}>
                    {displayedMessage}
                    {displayedMessage.length < message.length && type !== 'error' && (
                        <span className="inline-block w-1.5 h-3 ml-0.5 bg-accent-blue align-middle animate-pulse" />
                    )}
                </p>
            </div>
        </div>
    );
}
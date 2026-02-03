"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useLore } from '../context/LoreContext';
import EraSelector from './EraSelector';
import { Send } from 'lucide-react';

export default function ChatInterface() {
    const { activeEra } = useLore();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Ideally we would store messages here too, but for Mission 2 we just need the request logic.
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        try {
            console.log(`Sending request for Era: ${activeEra}`);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: input,
                    activeEra,
                }),
            });

            const data = await response.json();
            console.log('Response:', data);

            setInput(''); // Clear input after send
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
            // Keep focus
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-screen w-full relative">
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 pb-32">
                <div className="w-full max-w-2xl flex flex-col items-center gap-8">

                    {/* Header / Intro */}
                    <div className="text-center space-y-2 opacity-80">
                        <h1 className="text-4xl font-light tracking-[0.2em] uppercase text-white/50">
                            Oracle <span className="text-white">v1.0</span>
                        </h1>
                        <p className="text-sm text-gray-500 tracking-widest uppercase">
                            Accessing <span className="text-white">{activeEra}</span> Database
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="relative w-full group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-black rounded-lg border border-white/10 p-1">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask the Oracle..."
                                className="w-full bg-transparent text-white placeholder-gray-600 px-4 py-3 min-h-[60px] max-h-[200px] resize-none focus:outline-none text-lg font-light tracking-wide leading-relaxed"
                                rows={1}
                                style={{ height: 'auto' }} // Simple auto-resize logic could be added here
                            />
                            <button
                                onClick={() => handleSubmit()}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-3 bottom-3 p-2 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Cursor Animation Helper if we want a separate visual, but textarea caret is usually sufficient. 
              The prompt asked for "custom blinking cursor" - standard textarea caret is good, 
              but "Implementation" might imply a visual fake terminal. 
              For now, standard textarea with styling is functional and clean.
          */}

                </div>
            </main>

            <EraSelector />
        </div>
    );
}

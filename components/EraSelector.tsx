"use client";

import React from 'react';
import { useLore, Era } from '../context/LoreContext';
import { Sparkles, Sword, Crown, Scroll } from 'lucide-react';

export default function EraSelector() {
    const { activeEra, setActiveEra } = useLore();

    const eras: { id: Era; label: string; icon: React.ReactNode; color: string }[] = [
        { id: 'Vanilla', label: 'Vanilla', icon: <Scroll className="w-5 h-5" />, color: 'text-amber-200' },
        { id: 'TBC', label: 'TBC', icon: <Sparkles className="w-5 h-5" />, color: 'text-emerald-400' },
        { id: 'WotLK', label: 'WotLK', icon: <Crown className="w-5 h-5" />, color: 'text-cyan-300' },
        { id: 'Retail', label: 'Retail', icon: <Sword className="w-5 h-5" />, color: 'text-rose-400' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center bg-black/80 backdrop-blur-md border-t border-white/10">
            <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/10">
                {eras.map((era) => (
                    <button
                        key={era.id}
                        onClick={() => setActiveEra(era.id)}
                        className={`
              relative px-6 py-2 rounded-full flex items-center gap-2 transition-all duration-300 font-medium
              ${activeEra === era.id
                                ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }
            `}
                    >
                        <span className={`${activeEra === era.id ? era.color : 'text-gray-500'} transition-colors`}>
                            {era.icon}
                        </span>
                        {era.label}
                        {activeEra === era.id && (
                            <span className="absolute inset-0 rounded-full ring-1 ring-white/20 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

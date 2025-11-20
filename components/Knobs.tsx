
import React from 'react';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (val: number) => void;
    onCommit?: (val: number) => void;
    isRTL?: boolean;
}

export const SliderControl: React.FC<SliderProps> = ({ label, value, min, max, step, unit = '', onChange, onCommit, isRTL = false }) => {
    return (
        <div className="mb-4">
            <div className={`flex justify-between mb-2 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="text-gold-400 font-mono">{value > 0 && unit !== 'x' && unit !== 's' ? '+' : ''}{value.toFixed(2).replace(/[.,]00$/, '')}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onMouseUp={(e) => onCommit && onCommit(parseFloat((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => onCommit && onCommit(parseFloat((e.target as HTMLInputElement).value))}
                className="w-full h-1 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
        </div>
    );
};

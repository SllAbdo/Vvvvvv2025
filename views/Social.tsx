import React, { useRef, useEffect, useState } from 'react';
import { Language } from '../types';
import { Download, RefreshCw, Instagram, Facebook } from 'lucide-react';

const Social: React.FC<{ lang: Language }> = ({ lang }) => {
    const isRTL = lang === 'ar';
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [title, setTitle] = useState('New Single 2025');
    const [artist, setArtist] = useState('RaïWave Exclusive');
    const [template, setTemplate] = useState<'ig' | 'fb' | 'story'>('ig');

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = 1080, h = 1080;
        if (template === 'fb') { w = 1200; h = 630; }
        if (template === 'story') { w = 1080; h = 1920; }

        canvas.width = w;
        canvas.height = h;

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#040E1A');
        grad.addColorStop(1, '#0F253E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Decorative Circles
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#FFB74D';
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.2, w * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#42A5F5';
        ctx.beginPath();
        ctx.arc(w * 0.1, h * 0.9, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Center Card
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#0A1624';
        const cardW = w * 0.7;
        const cardH = h * 0.4;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2;
        ctx.fillRect(cardX, cardY, cardW, cardH);
        
        // Border
        ctx.strokeStyle = '#1A304A';
        ctx.lineWidth = 4;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        // Text
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        
        // Title
        ctx.font = `900 ${w * 0.06}px Orbitron`;
        ctx.fillStyle = '#FFB74D';
        ctx.fillText(title.toUpperCase(), w / 2, h / 2 - h * 0.02);

        // Artist
        ctx.font = `400 ${w * 0.03}px Inter`;
        ctx.fillStyle = '#42A5F5';
        ctx.fillText(artist, w / 2, h / 2 + h * 0.08);

        // Footer Logo
        ctx.font = `600 ${w * 0.025}px Inter`;
        ctx.fillStyle = '#607D8B';
        ctx.fillText('PRODUCED WITH RAIWAVE PRO', w / 2, h - h * 0.05);
    };

    useEffect(() => {
        draw();
    }, [title, artist, template]);

    const download = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `RaïWave_${template}.png`;
        link.href = canvasRef.current.toDataURL();
        link.click();
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-4 space-y-6">
                    <h2 className="text-xl font-bold text-slate-200 mb-4">Marketing Generator</h2>
                    
                    <div className="bg-ocean-900 p-6 rounded-xl border border-ocean-800">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-muted mb-1">Template Size</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setTemplate('ig')} className={`flex-1 py-2 rounded border ${template === 'ig' ? 'border-primary-400 bg-primary-400/10 text-primary-400' : 'border-ocean-800 text-muted'}`}>
                                        <Instagram size={16} className="mx-auto mb-1"/> SQ (1:1)
                                    </button>
                                    <button onClick={() => setTemplate('fb')} className={`flex-1 py-2 rounded border ${template === 'fb' ? 'border-primary-400 bg-primary-400/10 text-primary-400' : 'border-ocean-800 text-muted'}`}>
                                        <Facebook size={16} className="mx-auto mb-1"/> Land (1.91:1)
                                    </button>
                                    <button onClick={() => setTemplate('story')} className={`flex-1 py-2 rounded border ${template === 'story' ? 'border-primary-400 bg-primary-400/10 text-primary-400' : 'border-ocean-800 text-muted'}`}>
                                        <div className="w-2 h-4 border border-current mx-auto mb-1 rounded-sm"/> Story (9:16)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-muted mb-1">Main Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-ocean-950 border border-ocean-800 rounded px-3 py-2 text-slate-200 text-sm focus:border-gold-400 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs text-muted mb-1">Subtitle / Artist</label>
                                <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="w-full bg-ocean-950 border border-ocean-800 rounded px-3 py-2 text-slate-200 text-sm focus:border-gold-400 outline-none" />
                            </div>

                            <button onClick={draw} className="w-full py-2 bg-ocean-800 hover:bg-ocean-700 rounded text-sm font-bold text-slate-300 flex items-center justify-center gap-2">
                                <RefreshCw size={14} /> Refresh Preview
                            </button>
                        </div>
                    </div>
                    
                    <button onClick={download} className="w-full py-3 bg-primary-400 hover:bg-primary-400/90 text-ocean-950 font-bold rounded-lg shadow-lg shadow-primary-400/20 flex items-center justify-center gap-2 transition-all">
                        <Download size={18} /> Download Asset
                    </button>
                </div>

                <div className="lg:col-span-8 flex items-center justify-center bg-ocean-900/50 rounded-xl border border-ocean-800 p-4 lg:p-10">
                    <canvas ref={canvasRef} className="max-w-full max-h-[60vh] shadow-2xl border border-ocean-800 rounded" />
                </div>

            </div>
        </div>
    );
};

export default Social;
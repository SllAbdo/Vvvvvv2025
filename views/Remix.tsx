
import React, { useState } from 'react';
import { Language, RemixParams } from '../types';
import { SliderControl } from '../components/Knobs';
import { mixAudioOffline } from '../services/audioUtils';
import { Upload, Settings, Zap, Loader2, Download } from 'lucide-react';
import Waveform from '../components/Waveform';

const Remix: React.FC<{ lang: Language }> = ({ lang }) => {
    const isRTL = lang === 'ar';
    const [fileA, setFileA] = useState<File | null>(null);
    const [fileB, setFileB] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mixUrl, setMixUrl] = useState<string | null>(null);

    const [alignment, setAlignment] = useState<RemixParams>({
        key: 0,
        tempo: 1.0,
        shift: 0.0,
        balance: 0.5
    });
    
    const handleFile = (setter: React.Dispatch<React.SetStateAction<File|null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files?.[0]) setter(e.target.files[0]);
    };

    const handleMix = async () => {
        if(!fileA || !fileB) return;
        setIsProcessing(true);
        setMixUrl(null); // Clear previous
        try {
            const result = await mixAudioOffline(fileA, fileB, alignment, () => {});
            const url = URL.createObjectURL(result);
            setMixUrl(url);
        } catch(e) {
            console.error(e);
            alert('Mixing failed. Please verify audio formats.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6 border-b border-gold-400 pb-3">
                <Zap className="text-gold-400" />
                <h2 className="text-2xl font-bold text-gold-400">
                    {isRTL ? 'ريمكس ذكي' : 'AI-Smart Remix'}
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-6 bg-ocean-900 rounded-xl border border-ocean-800 p-6">
                    <h3 className="text-sm font-bold text-muted mb-4 uppercase tracking-widest">Source Material</h3>
                    
                    <div className="bg-ocean-950/50 p-4 rounded-lg border border-ocean-800 mb-4">
                        <label className="text-xs font-bold text-primary-400 mb-2 block">SOURCE A (Rhythm/Base)</label>
                        <input type="file" onChange={handleFile(setFileA)} className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-ocean-800 file:text-primary-400"/>
                        {fileA && <p className="text-[10px] text-gold-400 mt-1">{fileA.name}</p>}
                    </div>
                    
                    <div className="bg-ocean-950/50 p-4 rounded-lg border border-ocean-800 mb-4">
                        <label className="text-xs font-bold text-primary-400 mb-2 block">SOURCE B (Vocals/Overlay)</label>
                        <input type="file" onChange={handleFile(setFileB)} className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-ocean-800 file:text-primary-400"/>
                        {fileB && <p className="text-[10px] text-gold-400 mt-1">{fileB.name}</p>}
                    </div>

                    <div className="mt-6 pt-6 border-t border-ocean-800">
                        <h3 className="text-sm font-bold text-primary-400 mb-4 flex items-center gap-2">
                            <Settings size={16}/> {isRTL ? 'إعدادات المحاذاة' : 'Alignment Settings'}
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            <SliderControl 
                                label={isRTL ? 'قفل المفتاح' : "Key Lock (Semitones)"} 
                                value={alignment.key} min={-12} max={12} step={1} unit="st" 
                                onChange={(v) => setAlignment(prev => ({...prev, key: v}))} isRTL={isRTL} 
                            />
                            <SliderControl 
                                label={isRTL ? 'مزامنة الإيقاع' : "Tempo Sync"} 
                                value={alignment.tempo} min={0.5} max={1.5} step={0.01} unit="x" 
                                onChange={(v) => setAlignment(prev => ({...prev, tempo: v}))} isRTL={isRTL} 
                            />
                            <div className="relative p-2 bg-ocean-950/50 rounded-lg border border-ocean-800/50">
                                <SliderControl 
                                    label={isRTL ? 'تحول دقيق (Auto-Legal)' : "Auto-Legal Shift (Fine)"} 
                                    value={alignment.shift} min={-0.5} max={0.5} step={0.01} unit="st" 
                                    onChange={(v) => setAlignment(prev => ({...prev, shift: v}))} isRTL={isRTL} 
                                />
                                <p className="text-[10px] text-muted mt-[-10px] mb-2">
                                    {isRTL ? 'ضبط دقيق للموجة لتفادي النشاز' : 'Micro-adjust pitch to fit the mix pocket'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-6 space-y-6">
                    <div className="bg-gradient-to-br from-gold-500/10 to-transparent rounded-xl border border-gold-500/30 p-6 text-center">
                        <button 
                            onClick={handleMix}
                            disabled={!fileA || !fileB || isProcessing}
                            className="w-full py-4 bg-gradient-to-r from-gold-400 to-gold-500 text-ocean-950 font-black text-lg rounded-lg shadow-lg shadow-gold-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="animate-spin mx-auto"/> : (isRTL ? 'تنفيذ الدمج' : 'EXECUTE FUSION')}
                        </button>
                    </div>

                    {mixUrl && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="bg-ocean-900 p-4 rounded-xl border border-ocean-800">
                                <h4 className="text-xs font-bold text-gold-400 mb-2">FUSION PREVIEW</h4>
                                <Waveform audioUrl={mixUrl} isRTL={isRTL} />
                            </div>
                            <a 
                                href={mixUrl} 
                                download="RaïWave_Remix.wav"
                                className="flex w-full items-center justify-center gap-2 py-3 bg-ocean-800 hover:bg-primary-400 hover:text-ocean-950 rounded-lg font-bold transition-colors"
                            >
                                <Download size={16}/> {isRTL ? 'تنزيل الريمكس' : 'Download Remix'}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Remix;

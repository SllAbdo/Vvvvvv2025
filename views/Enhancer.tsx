
import React, { useState, useRef, useEffect } from 'react';
import { AudioProcessParams, Language, Preset } from '../types';
import { renderAudioFromBuffer, analyzeAudioBuffer, decodeAudio } from '../services/audioUtils';
import { SliderControl } from '../components/Knobs';
import Waveform from '../components/Waveform';
import { Upload, Mic, Download, Loader2, Music, Wand2, Sparkles, CheckCircle, User, Ghost, Bot, Baby, ShieldAlert, Zap, Users, Undo2, Redo2, RotateCcw, Save, FolderOpen, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface EnhancerProps {
    lang: Language;
}

const INITIAL_PARAMS: AudioProcessParams = {
    pitch: 0,
    stretch: 1.0,
    denoise: 0.1,
    deess: 0.2,
    reverb: 0.1,
    reverbDecay: 1.5,
    masterReverb: 1.0,
    stereo: 0.1,
    drive: 0.0, 
    shift: 0.0,
    delay: 0.0,
    delayTime: 0.3,
    delayFeedback: 0.3,
    eqBass: 0,
    eqMid: 0,
    eqAir: 0,
    master: 0,
    vibratoDepth: 0,
    vibratoSpeed: 0,
    ringMod: 0,
    backingVocals: 0
};

const Enhancer: React.FC<EnhancerProps> = ({ lang }) => {
    const isRTL = lang === 'ar';
    const { user, login } = useAuth();
    
    // Files & Buffers
    const [file, setFile] = useState<File | null>(null);
    const [sourceBuffer, setSourceBuffer] = useState<AudioBuffer | null>(null);
    const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    // Loading States
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [progress, setProgress] = useState(0);
    
    // Recording
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // History & Params
    const [params, setParams] = useState<AudioProcessParams>(INITIAL_PARAMS);
    const [history, setHistory] = useState<AudioProcessParams[]>([INITIAL_PARAMS]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Presets
    const [showPresetMenu, setShowPresetMenu] = useState(false);
    const [savedPresets, setSavedPresets] = useState<Preset[]>([]);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // Load Presets on Mount
    useEffect(() => {
        const saved = localStorage.getItem('raiwave_presets');
        if (saved) {
            try {
                setSavedPresets(JSON.parse(saved));
            } catch (e) { console.error(e); }
        }
    }, []);

    const addToHistory = (newParams: AudioProcessParams) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newParams);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const updateParam = (key: keyof AudioProcessParams, value: number, commit = false) => {
        const newParams = { ...params, [key]: value };
        setParams(newParams);
        if (commit) {
            addToHistory(newParams);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setParams(history[newIndex]);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setParams(history[newIndex]);
        }
    };

    const handleReset = () => {
        setParams(INITIAL_PARAMS);
        addToHistory(INITIAL_PARAMS);
    };

    const handleSavePreset = () => {
        const name = prompt(isRTL ? 'اسم القالب:' : "Preset Name:");
        if (name) {
            const newPresets = [...savedPresets, { name, params }];
            setSavedPresets(newPresets);
            localStorage.setItem('raiwave_presets', JSON.stringify(newPresets));
            alert("Preset Saved!");
        }
    };

    const handleLoadPreset = (preset: Preset) => {
        setParams(preset.params);
        addToHistory(preset.params);
        setShowPresetMenu(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setProcessedBlob(null);
            
            // Immediate Playback
            if(audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(URL.createObjectURL(f));

            // Decode in background
            setIsAnalyzing(true);
            try {
                const buf = await decodeAudio(f);
                setSourceBuffer(buf);
            } catch (e) {
                console.error("Decode failed", e);
                alert("Could not decode audio file.");
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];
            
            mr.ondataavailable = (e) => chunksRef.current.push(e.data);
            mr.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const recFile = new File([blob], "recording.webm", { type: 'audio/webm' });
                setFile(recFile);
                setAudioUrl(URL.createObjectURL(recFile));
                setProcessedBlob(null);
                
                setIsAnalyzing(true);
                const buf = await decodeAudio(recFile);
                setSourceBuffer(buf);
                setIsAnalyzing(false);
            };
            mr.start();
            setIsRecording(true);
        } catch (err) {
            console.error(err);
            alert("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAutoEnhance = async () => {
        if (!sourceBuffer) return;
        setIsAnalyzing(true);
        try {
            await new Promise(r => setTimeout(r, 500)); 
            const suggestions = analyzeAudioBuffer(sourceBuffer);
            const newParams = { ...params, ...suggestions };
            setParams(newParams);
            addToHistory(newParams);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePreview = async () => {
        if (!sourceBuffer) return;
        setIsPreviewing(true);
        try {
            // Slice first 10 seconds
            const duration = Math.min(10, sourceBuffer.duration);
            const length = Math.floor(duration * sourceBuffer.sampleRate);
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const tempCtx = new AudioContextClass();
            const sliceBuffer = tempCtx.createBuffer(sourceBuffer.numberOfChannels, length, sourceBuffer.sampleRate);
            
            for (let i = 0; i < sourceBuffer.numberOfChannels; i++) {
                sliceBuffer.copyToChannel(sourceBuffer.getChannelData(i).subarray(0, length), i);
            }
            tempCtx.close();

            // Render Slice
            const outBlob = await renderAudioFromBuffer(sliceBuffer, params, () => {});
            
            // Play Result
            if(audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(URL.createObjectURL(outBlob));
            
        } catch (e) {
            console.error(e);
            alert("Preview failed");
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleProcess = async () => {
        if (!sourceBuffer) return;
        setIsProcessing(true);
        setProgress(0);
        try {
            const outBlob = await renderAudioFromBuffer(sourceBuffer, params, (p) => setProgress(p));
            setProcessedBlob(outBlob);
            if(audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(URL.createObjectURL(outBlob)); 
        } catch (e) {
            console.error(e);
            alert('Processing failed.');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const applyPreset = (name: string) => {
        const newParams = { ...params, ringMod: 0, vibratoDepth: 0, backingVocals: 0 }; // Reset FX
        // Voice Presets
        if (name === 'Child') { newParams.pitch = 6; newParams.stretch = 1.0; newParams.eqBass = -5; newParams.eqAir = 5; }
        if (name === 'Giant') { newParams.pitch = -4; newParams.stretch = 1.0; newParams.eqBass = 8; newParams.eqAir = -5; newParams.drive = 0.2; }
        if (name === 'Robot') { newParams.pitch = 0; newParams.ringMod = 0.6; newParams.drive = 0.4; }
        if (name === 'Alien') { newParams.pitch = 0; newParams.vibratoDepth = 8.0; newParams.vibratoSpeed = 10; newParams.delay = 0.2; }
        if (name === 'Chorus') { newParams.backingVocals = 0.6; newParams.reverb = 0.3; newParams.stereo = 0.8; }
        
        // Style Presets
        if (name === 'Nightcore') { newParams.pitch = 3; newParams.stretch = 0.88; newParams.eqAir = 3; newParams.denoise = 0; }
        if (name === 'Slowed') { newParams.pitch = -3; newParams.stretch = 1.15; newParams.reverb = 0.5; newParams.reverbDecay = 2.5; newParams.eqBass = 4; }
        if (name === 'CopyrightBypass') { 
            newParams.pitch = 0.7; 
            newParams.stretch = 0.97; 
            newParams.drive = 0.15; 
            newParams.eqMid = 1.5; 
            newParams.stereo = 0.6;
        }
        
        setParams(newParams);
        addToHistory(newParams);
    };

    const download = async (bitrateLabel: string) => {
        if (!user) {
            await login(); 
            if (!localStorage.getItem('raiwave_user')) return;
        }
        if (!processedBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(processedBlob);
        a.download = `RaïWave_${bitrateLabel}.wav`; 
        a.click();
    };

    return (
        <div className="animate-fade-in p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b border-primary-400 pb-3">
                <div className="flex items-center gap-3">
                    <Wand2 className="text-primary-400" />
                    <h2 className="text-2xl font-bold text-primary-400">
                        {isRTL ? 'معزّز الصوت السحري ومغيّر الأصوات' : 'Magic Audio Enhancer & Voice Changer'}
                    </h2>
                </div>
                
                {/* Global Actions */}
                <div className="flex items-center gap-2">
                    <button onClick={handleUndo} disabled={historyIndex === 0} className="p-2 bg-ocean-900 rounded-lg text-muted hover:text-white disabled:opacity-30" title="Undo">
                        <Undo2 size={18} />
                    </button>
                    <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-2 bg-ocean-900 rounded-lg text-muted hover:text-white disabled:opacity-30" title="Redo">
                        <Redo2 size={18} />
                    </button>
                    <button onClick={handleReset} className="p-2 bg-ocean-900 rounded-lg text-muted hover:text-red-400" title="Reset All">
                        <RotateCcw size={18} />
                    </button>
                    <div className="h-6 w-px bg-ocean-800 mx-1"></div>
                    <button onClick={handleSavePreset} className="p-2 bg-ocean-900 rounded-lg text-muted hover:text-gold-400" title="Save Preset">
                        <Save size={18} />
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowPresetMenu(!showPresetMenu)} className="p-2 bg-ocean-900 rounded-lg text-muted hover:text-primary-400" title="Load Preset">
                            <FolderOpen size={18} />
                        </button>
                        {showPresetMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-ocean-900 border border-ocean-800 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                {savedPresets.length === 0 && <div className="p-3 text-xs text-muted">No saved presets</div>}
                                {savedPresets.map((p, i) => (
                                    <button key={i} onClick={() => handleLoadPreset(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-ocean-800 text-slate-200">
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-ocean-900 rounded-xl border border-ocean-800 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gold-400"></div>
                        <label className="block text-xs font-bold text-muted mb-3 uppercase tracking-widest">
                            {isRTL ? 'المصدر الصوتي' : 'Source Input'}
                        </label>
                        
                        <div className="flex flex-col gap-4">
                            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-ocean-800 rounded-lg hover:bg-ocean-950 hover:border-primary-400 transition-all cursor-pointer group-hover:shadow-lg group-hover:shadow-primary-400/10">
                                <div className="flex flex-col items-center justify-center">
                                    <Upload className="w-6 h-6 mb-2 text-muted group-hover:text-primary-400" />
                                    <p className="mb-1 text-sm text-slate-400">
                                        <span className="font-semibold text-primary-400">{isRTL ? 'اضغط للرفع' : 'Click to upload'}</span>
                                    </p>
                                    <p className="text-[10px] text-muted">WAV, MP3, AIFF</p>
                                </div>
                                <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                            </label>

                            <div className="flex gap-3 justify-center">
                                {!isRecording ? (
                                    <button onClick={startRecording} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                        <Mic size={16} /> {isRTL ? 'تسجيل غناء مباشر' : 'Record Live Vocals'}
                                    </button>
                                ) : (
                                    <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg animate-pulse">
                                        <Mic size={16} /> {isRTL ? 'إيقاف التسجيل' : 'Stop Recording'}
                                    </button>
                                )}
                            </div>
                            {file && <p className="text-center text-xs text-gold-400 font-mono">{file.name} {sourceBuffer && `(${Math.floor(sourceBuffer.duration)}s)`}</p>}
                        </div>
                    </div>

                    {/* Controls Section */}
                    <div className="bg-ocean-900 rounded-xl border border-ocean-800 p-6 relative">
                         
                        <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                                {isRTL ? 'تغيير الصوت والمؤثرات' : 'Voice Lab & Effects'}
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handlePreview}
                                    disabled={!sourceBuffer || isPreviewing}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold bg-ocean-800 border border-ocean-700 hover:bg-ocean-700 text-primary-400 transition-colors"
                                >
                                    {isPreviewing ? <Loader2 size={12} className="animate-spin"/> : <PlayCircle size={12} />}
                                    {isRTL ? 'معاينة 10ث' : 'Preview 10s'}
                                </button>
                                <button 
                                    onClick={handleAutoEnhance}
                                    disabled={!sourceBuffer || isAnalyzing}
                                    className={`
                                        flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all
                                        ${isAnalyzing 
                                            ? 'bg-gold-400 text-ocean-950 cursor-wait' 
                                            : 'bg-gradient-to-r from-gold-400 to-orange-500 text-ocean-950 hover:scale-105 shadow-[0_0_15px_rgba(245,124,0,0.4)]'
                                        }
                                    `}
                                >
                                    {isAnalyzing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                                    {isAnalyzing ? (isRTL ? 'تحليل...' : 'Analyzing...') : (isRTL ? '✨ سحر تلقائي' : '✨ Auto-Magic')}
                                </button>
                            </div>
                        </div>

                        {/* Voice Quick Buttons */}
                        <div className="grid grid-cols-5 gap-2 mb-6">
                             <button onClick={() => applyPreset('Child')} className="flex flex-col items-center gap-1 p-3 bg-ocean-950 border border-ocean-800 rounded-lg hover:border-primary-400 hover:bg-ocean-800 transition-all">
                                 <Baby size={20} className="text-pink-400" />
                                 <span className="text-[10px]">{isRTL ? 'طفل' : 'Baby'}</span>
                             </button>
                             <button onClick={() => applyPreset('Giant')} className="flex flex-col items-center gap-1 p-3 bg-ocean-950 border border-ocean-800 rounded-lg hover:border-primary-400 hover:bg-ocean-800 transition-all">
                                 <User size={20} className="text-purple-400" />
                                 <span className="text-[10px]">{isRTL ? 'ضخم' : 'Giant'}</span>
                             </button>
                             <button onClick={() => applyPreset('Robot')} className="flex flex-col items-center gap-1 p-3 bg-ocean-950 border border-ocean-800 rounded-lg hover:border-primary-400 hover:bg-ocean-800 transition-all">
                                 <Bot size={20} className="text-cyan-400" />
                                 <span className="text-[10px]">{isRTL ? 'روبوت' : 'Robot'}</span>
                             </button>
                             <button onClick={() => applyPreset('Alien')} className="flex flex-col items-center gap-1 p-3 bg-ocean-950 border border-ocean-800 rounded-lg hover:border-primary-400 hover:bg-ocean-800 transition-all">
                                 <Ghost size={20} className="text-green-400" />
                                 <span className="text-[10px]">{isRTL ? 'فضائي' : 'Alien'}</span>
                             </button>
                             <button onClick={() => applyPreset('Chorus')} className="flex flex-col items-center gap-1 p-3 bg-ocean-950 border border-ocean-800 rounded-lg hover:border-gold-400 hover:bg-ocean-800 transition-all">
                                 <Users size={20} className="text-gold-400" />
                                 <span className="text-[10px]">{isRTL ? 'كورال' : 'Chorus'}</span>
                             </button>
                        </div>

                        {/* Detailed Sliders */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 bg-ocean-950/50 p-4 rounded-lg border border-ocean-800/50">
                            <div className="sm:col-span-2 pb-2 border-b border-ocean-800/50 mb-2">
                                <SliderControl isRTL={isRTL} label={isRTL ? 'غناء خلفي (كورال)' : "Backing Vocals (Harmony)"} value={params.backingVocals} min={0} max={1} step={0.05} onChange={v => updateParam('backingVocals', v)} onCommit={v => updateParam('backingVocals', v, true)} />
                            </div>

                            <SliderControl isRTL={isRTL} label={isRTL ? 'تعديل الطبقة' : "Pitch"} value={params.pitch} min={-12} max={12} step={1} unit="st" onChange={v => updateParam('pitch', v)} onCommit={v => updateParam('pitch', v, true)} />
                            <SliderControl isRTL={isRTL} label={isRTL ? 'سرعة الوقت' : "Speed"} value={params.stretch} min={0.5} max={1.5} step={0.01} unit="x" onChange={v => updateParam('stretch', v)} onCommit={v => updateParam('stretch', v, true)} />
                            
                            <SliderControl isRTL={isRTL} label={isRTL ? 'تأثير الروبوت' : "Robot FX"} value={params.ringMod} min={0} max={1} step={0.01} onChange={v => updateParam('ringMod', v)} onCommit={v => updateParam('ringMod', v, true)} />
                            <SliderControl isRTL={isRTL} label={isRTL ? 'اهتزاز الصوت' : "Vibrato"} value={params.vibratoDepth} min={0} max={10} step={0.1} onChange={v => updateParam('vibratoDepth', v)} onCommit={v => updateParam('vibratoDepth', v, true)} />

                            <div className="sm:col-span-2 pt-4 pb-2 border-t border-ocean-800/50 mt-2">
                                <p className="text-[10px] font-bold text-muted mb-4 uppercase">Spatial & Reverb</p>
                                <div className="grid grid-cols-2 gap-x-8">
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'صدى (Wet)' : "Reverb Mix"} value={params.reverb} min={0} max={1} step={0.05} onChange={v => updateParam('reverb', v)} onCommit={v => updateParam('reverb', v, true)} />
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'طول الصدى' : "Decay Time"} value={params.reverbDecay} min={0.5} max={5.0} step={0.1} unit="s" onChange={v => updateParam('reverbDecay', v)} onCommit={v => updateParam('reverbDecay', v, true)} />
                                     
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'تأخير (Delay)' : "Delay Mix"} value={params.delay} min={0} max={1} step={0.05} onChange={v => updateParam('delay', v)} onCommit={v => updateParam('delay', v, true)} />
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'زمن التأخير' : "Delay Time"} value={params.delayTime} min={0.01} max={1.0} step={0.01} unit="s" onChange={v => updateParam('delayTime', v)} onCommit={v => updateParam('delayTime', v, true)} />
                                </div>
                            </div>

                            <div className="sm:col-span-2 pt-2">
                                <SliderControl isRTL={isRTL} label={isRTL ? 'تشبع (Drive)' : "Warmth/Drive"} value={params.drive} min={0} max={1} step={0.05} onChange={v => updateParam('drive', v)} onCommit={v => updateParam('drive', v, true)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-ocean-900 rounded-xl border border-ocean-800 p-6">
                        <button 
                            onClick={handleProcess} 
                            disabled={!sourceBuffer || isProcessing}
                            className="w-full py-4 bg-gradient-to-r from-primary-400 to-gold-500 text-ocean-950 font-black text-lg rounded-lg shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <Music />}
                            {isProcessing ? (isRTL ? 'جاري المعالجة...' : 'RENDERING...') : (isRTL ? 'تطبيق التعديلات (HQ)' : 'APPLY FX (HQ)')}
                        </button>
                        
                        {isProcessing && (
                            <div className="w-full bg-ocean-950 rounded-full h-2 mt-4 overflow-hidden">
                                <div className="bg-primary-400 h-2 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}

                        <div className={`mt-4 grid grid-cols-2 gap-4 transition-opacity duration-300 ${processedBlob ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <button onClick={() => download('HQ')} className="flex items-center justify-center gap-2 p-3 bg-ocean-800 hover:bg-ocean-700 rounded-lg text-sm font-semibold border border-ocean-800 hover:border-primary-400 transition-all">
                                <Download size={16} /> WAV Master
                            </button>
                            <button onClick={() => download('320k')} className="flex items-center justify-center gap-2 p-3 bg-ocean-800 hover:bg-ocean-700 rounded-lg text-sm font-semibold border border-ocean-800 hover:border-primary-400 transition-all">
                                <Download size={16} /> MP3 320kbps
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="sticky top-24 space-y-6">
                         {processedBlob && (
                             <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 text-green-400 text-sm animate-pulse">
                                 <CheckCircle size={16} />
                                 {isRTL ? 'تمت المعالجة بنجاح! استمع الآن.' : 'Processing Complete! Previewing Enhanced Audio.'}
                             </div>
                         )}

                         {/* Light Effect Container */}
                         <div className="relative rounded-xl p-[2px] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-gold-400/20 to-primary-400/20 animate-pulse"></div>
                            <Waveform audioUrl={audioUrl} isRTL={isRTL} />
                         </div>
                         
                         <div className="bg-gradient-to-br from-ocean-900 to-ocean-950 p-6 rounded-xl border border-ocean-800">
                            <h4 className="text-gold-400 font-bold mb-2 text-sm">PRO TIPS</h4>
                            <ul className="text-xs text-muted leading-relaxed list-disc pl-4 space-y-1">
                                <li>
                                    {isRTL ? 'لتفادي الحقوق: استخدم وضع "تخطي الحقوق" الذي يغير بصمة الصوت الرقمية.' : 'Use "Preview 10s" to quickly test your settings before the final render.'}
                                </li>
                                <li>
                                    {isRTL ? 'الكورال: استخدم "غناء خلفي" لإضافة صوت مصاحب (وهمي) للغناء الأصلي.' : 'Adjust "Decay Time" on Reverb to simulate larger halls.'}
                                </li>
                                <li>
                                    {isRTL ? 'السحر التلقائي: زر "سحر تلقائي" يحلل الملف ويحسن الجودة فوراً.' : 'Save your favorite settings as Presets using the folder icon.'}
                                </li>
                            </ul>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Enhancer;

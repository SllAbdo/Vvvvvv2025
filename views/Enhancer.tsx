
import React, { useState, useRef, useEffect } from 'react';
import { AudioProcessParams, Language, Preset } from '../types';
import { renderAudioFromBuffer, analyzeAudioBuffer, decodeAudio } from '../services/audioUtils';
import { saveTrackToCloud } from '../services/cloudService';
import { SliderControl } from '../components/Knobs';
import Waveform from '../components/Waveform';
import { Upload, Mic, Download, Loader2, Music, Wand2, Sparkles, CheckCircle, User, Ghost, Bot, Baby, ShieldAlert, Zap, Users, Undo2, Redo2, RotateCcw, Save, FolderOpen, PlayCircle, Cloud, ToggleLeft, ToggleRight, Disc, FileAudio, Clock, HardDrive } from 'lucide-react';
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
    
    // We keep two URLs: Original (Source) and Processed (Result)
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    
    // Active Player State
    const [compareMode, setCompareMode] = useState<'original' | 'processed'>('original');
    const activeUrl = compareMode === 'processed' ? processedUrl : originalUrl;
    
    const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
    
    // Loading States
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    
    // Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<any>(null);

    // History & Params
    const [params, setParams] = useState<AudioProcessParams>(INITIAL_PARAMS);
    const [history, setHistory] = useState<AudioProcessParams[]>([INITIAL_PARAMS]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Presets
    const [showPresetMenu, setShowPresetMenu] = useState(false);
    const [savedPresets, setSavedPresets] = useState<Preset[]>([]);

    useEffect(() => {
        return () => {
            if (originalUrl) URL.revokeObjectURL(originalUrl);
            if (processedUrl) URL.revokeObjectURL(processedUrl);
        };
    }, [originalUrl, processedUrl]);

    // Whenever processed blob changes, switch to processed view
    useEffect(() => {
        if (processedUrl) setCompareMode('processed');
    }, [processedUrl]);

    // Safe Storage Helper for Presets
    const getSafePresets = () => {
        try {
            const saved = localStorage.getItem('raiwave_presets');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn("Preset storage access restricted");
            return [];
        }
    };

    // Load Presets on Mount
    useEffect(() => {
        setSavedPresets(getSafePresets());
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
            try {
                localStorage.setItem('raiwave_presets', JSON.stringify(newPresets));
                alert("Preset Saved!");
            } catch (e) {
                console.error(e);
                alert("Could not save preset (Storage Permission Denied).");
            }
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
            setProcessedUrl(null);
            
            // Immediate Playback
            if(originalUrl) URL.revokeObjectURL(originalUrl);
            const url = URL.createObjectURL(f);
            setOriginalUrl(url);
            setCompareMode('original');

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

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Recording not supported in this environment");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Detect best mime type
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg'
            ];
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
            const options = mimeType ? { mimeType } : undefined;

            const mr = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];
            
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mr.onstop = async () => {
                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
                
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                setRecordingTime(0);

                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
                const ext = (mimeType || '').includes('mp4') ? 'm4a' : 'webm';
                const recFile = new File([blob], `recording.${ext}`, { type: mimeType || 'audio/webm' });
                
                setFile(recFile);
                
                // Clear previous URLs
                if(originalUrl) URL.revokeObjectURL(originalUrl);
                if(processedUrl) URL.revokeObjectURL(processedUrl);
                setProcessedBlob(null);
                setProcessedUrl(null);

                const url = URL.createObjectURL(recFile);
                setOriginalUrl(url);
                setCompareMode('original');
                
                setIsAnalyzing(true);
                try {
                    const buf = await decodeAudio(recFile);
                    setSourceBuffer(buf);
                } catch(e) {
                    console.error("Recording decode failed", e);
                    alert("Failed to process recording. Please try again or upload a file.");
                } finally {
                    setIsAnalyzing(false);
                }
            };

            mr.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error(err);
            alert("Microphone access denied. Please check your browser permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
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
            // Process full buffer instead of a 10s slice
            const outBlob = await renderAudioFromBuffer(sourceBuffer, params, () => {});
            
            // Play Result
            if(processedUrl) URL.revokeObjectURL(processedUrl);
            const url = URL.createObjectURL(outBlob);
            setProcessedUrl(url);
            setCompareMode('processed');
            
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
            if(processedUrl) URL.revokeObjectURL(processedUrl);
            const url = URL.createObjectURL(outBlob);
            setProcessedUrl(url);
            setCompareMode('processed'); // Auto switch to hear result
        } catch (e) {
            console.error(e);
            alert('Processing failed.');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleSaveToCloud = async () => {
        if (!processedBlob || !file) return;
        setIsUploading(true);
        
        // Simulate network delay for realism
        await new Promise(r => setTimeout(r, 1500));
        
        try {
            const trackData = {
                id: crypto.randomUUID(),
                name: `Edited_${file.name}`,
                date: new Date().toISOString(),
                tags: ['Edited', 'CloudSave'],
                blob: processedBlob,
                duration: sourceBuffer?.duration || 0
            };
            await saveTrackToCloud(trackData);
            alert(isRTL ? 'تم الحفظ في المكتبة السحابية بنجاح' : 'Saved to Cloud Library successfully!');
        } catch(e) {
            console.error(e);
            alert('Failed to save to library.');
        } finally {
            setIsUploading(false);
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
            await login('google'); 
            if (!processedBlob) return; 
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
                            {!file ? (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-ocean-800 rounded-xl hover:bg-ocean-950 hover:border-primary-400 transition-all cursor-pointer group-hover:shadow-lg group-hover:shadow-primary-400/10">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 mb-3 bg-ocean-900 rounded-full flex items-center justify-center border border-ocean-800 text-primary-400 group-hover:scale-110 transition-transform">
                                            <Upload size={20} />
                                        </div>
                                        <p className="mb-1 text-sm text-slate-400">
                                            <span className="font-semibold text-primary-400">{isRTL ? 'اضغط للرفع' : 'Click to upload'}</span>
                                        </p>
                                        <p className="text-[10px] text-muted">WAV, MP3, AIFF</p>
                                    </div>
                                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="relative overflow-hidden bg-gradient-to-r from-ocean-950 to-ocean-900 border border-ocean-800 rounded-xl p-4 flex items-center gap-5 shadow-xl">
                                    {/* Aesthetic Vinyl Animation */}
                                    <div className="relative flex-shrink-0 w-20 h-20">
                                        <div className={`absolute inset-0 rounded-full border-4 border-ocean-800 bg-black flex items-center justify-center ${originalUrl && !isRecording ? 'animate-spin-slow' : ''}`}>
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-orange-600 border-2 border-white/20"></div>
                                            <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                                        </div>
                                        <Disc className="absolute -bottom-1 -right-1 text-gold-400 drop-shadow-lg bg-ocean-950 rounded-full" size={24} />
                                    </div>
                                    
                                    <div className="flex-grow min-w-0">
                                        <h3 className="text-lg font-bold text-white truncate font-orbitron tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                            {file.name}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted font-mono uppercase">
                                            <span className="flex items-center gap-1 bg-ocean-950/50 px-2 py-1 rounded border border-ocean-800/50">
                                                <Clock size={10} className="text-primary-400" />
                                                {sourceBuffer ? `${Math.floor(sourceBuffer.duration)}s` : '--'}
                                            </span>
                                            <span className="flex items-center gap-1 bg-ocean-950/50 px-2 py-1 rounded border border-ocean-800/50">
                                                <HardDrive size={10} className="text-green-400" />
                                                {(file.size / (1024*1024)).toFixed(2)} MB
                                            </span>
                                            <span className="flex items-center gap-1 bg-ocean-950/50 px-2 py-1 rounded border border-ocean-800/50">
                                                <FileAudio size={10} className="text-gold-400" />
                                                {file.type.split('/')[1] || 'AUDIO'}
                                            </span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => { setFile(null); setSourceBuffer(null); setOriginalUrl(null); setProcessedUrl(null); setCompareMode('original'); }}
                                        className="p-2 text-muted hover:text-red-400 transition-colors"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 justify-center items-center">
                                {!isRecording ? (
                                    <button onClick={startRecording} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                        <Mic size={16} /> {isRTL ? 'تسجيل غناء مباشر' : 'Record Live Vocals'}
                                    </button>
                                ) : (
                                    <button onClick={stopRecording} className="flex items-center gap-3 px-6 py-2 bg-red-600 text-white rounded-full animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-400">
                                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                        <span className="font-mono font-bold">{formatTimer(recordingTime)}</span>
                                        <span className="text-xs uppercase tracking-wider">{isRTL ? 'إيقاف' : 'STOP'}</span>
                                    </button>
                                )}
                            </div>
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
                                    {isRTL ? 'معاينة كاملة' : 'Full Preview'}
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
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'طول الصدى' : "Reverb Decay"} value={params.reverbDecay} min={0.5} max={5.0} step={0.1} unit="s" onChange={v => updateParam('reverbDecay', v)} onCommit={v => updateParam('reverbDecay', v, true)} />
                                     
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'تأخير (Delay)' : "Delay Mix"} value={params.delay} min={0} max={1} step={0.05} onChange={v => updateParam('delay', v)} onCommit={v => updateParam('delay', v, true)} />
                                     <SliderControl isRTL={isRTL} label={isRTL ? 'زمن التأخير' : "Delay Time"} value={params.delayTime} min={0.01} max={1.0} step={0.01} unit="s" onChange={v => updateParam('delayTime', v)} onCommit={v => updateParam('delayTime', v, true)} />

                                     <SliderControl isRTL={isRTL} label={isRTL ? 'صدى رئيسي' : "Master Reverb"} value={params.masterReverb} min={0} max={1} step={0.05} onChange={v => updateParam('masterReverb', v)} onCommit={v => updateParam('masterReverb', v, true)} />
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

                        <div className={`mt-4 flex flex-col md:flex-row gap-4 transition-opacity duration-300 ${processedBlob ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <button onClick={() => download('HQ')} className="flex-1 flex items-center justify-center gap-2 p-3 bg-ocean-800 hover:bg-ocean-700 rounded-lg text-sm font-semibold border border-ocean-800 hover:border-primary-400 transition-all">
                                <Download size={16} /> WAV Master
                            </button>
                            <button onClick={handleSaveToCloud} className="flex-1 flex items-center justify-center gap-2 p-3 bg-ocean-800 hover:bg-ocean-700 rounded-lg text-sm font-semibold border border-ocean-800 hover:border-gold-400 transition-all">
                                {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Cloud size={16} />}
                                {isRTL ? 'حفظ في المكتبة السحابية' : 'Save to Cloud Library'}
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
                            <Waveform audioUrl={activeUrl} isRTL={isRTL} />
                            
                            {/* Compare Switch */}
                            {processedUrl && (
                                <div className="absolute top-4 right-4 z-20">
                                    <div className="flex items-center bg-ocean-950/80 backdrop-blur rounded-full p-1 border border-ocean-800">
                                        <button 
                                            onClick={() => setCompareMode('original')}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${compareMode === 'original' ? 'bg-ocean-800 text-white' : 'text-muted hover:text-slate-300'}`}
                                        >
                                            {isRTL ? 'الأصل' : 'Original'}
                                        </button>
                                        <button 
                                            onClick={() => setCompareMode('processed')}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${compareMode === 'processed' ? 'bg-primary-400 text-ocean-950' : 'text-muted hover:text-slate-300'}`}
                                        >
                                            {isRTL ? 'المعدل' : 'Result'}
                                        </button>
                                    </div>
                                </div>
                            )}
                         </div>
                         
                         <div className="bg-gradient-to-br from-ocean-900 to-ocean-950 p-6 rounded-xl border border-ocean-800">
                            <h4 className="text-gold-400 font-bold mb-2 text-sm">PRO TIPS</h4>
                            <ul className="text-xs text-muted leading-relaxed list-disc pl-4 space-y-1">
                                <li>
                                    {isRTL ? 'قارن: استخدم الأزرار فوق المشغل للتبديل بين الصوت الأصلي والمعدل لحظياً.' : 'Toggle "Original" vs "Result" above the player to instantly compare changes before downloading.'}
                                </li>
                                <li>
                                    {isRTL ? 'السحابة: زر "حفظ في المكتبة" يخزن الملف في المتصفح دائماً دون تحميل.' : 'Save to Cloud Library stores your song safely in the browser database.'}
                                </li>
                                <li>
                                    {isRTL ? 'السحر التلقائي: زر "سحر تلقائي" يحلل الملف ويحسن الجودة فوراً.' : 'Use Auto-Magic to instantly clean up noise and boost clarity.'}
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

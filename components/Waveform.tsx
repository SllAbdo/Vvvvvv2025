
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, ZoomIn, ZoomOut, Gauge, Repeat, Volume2, VolumeX, Music } from 'lucide-react';

interface WaveformProps {
    audioUrl: string | null;
    isRTL?: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl, isRTL = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationRef = useRef<number | null>(null);
    
    // Visualizer Context
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [speed, setSpeed] = useState(1.0);
    const [isLooping, setIsLooping] = useState(false);
    const [volume, setVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    
    // Party Mode State
    const [bassIntensity, setBassIntensity] = useState(0);

    // Setup Audio Element
    useEffect(() => {
        if (audioUrl) {
            const audio = new Audio();
            audio.src = audioUrl;
            audio.crossOrigin = "anonymous"; 
            audio.playbackRate = speed;
            audio.loop = isLooping;
            audio.volume = isMuted ? 0 : volume;
            
            const handleMetadata = () => {
                if (isFinite(audio.duration)) setDuration(audio.duration);
            };
            const handleEnded = () => {
                if (!isLooping) setIsPlaying(false);
            };
            const handleError = (e: Event) => {
                console.warn("Waveform audio source error:", e);
                setIsPlaying(false);
            };

            audio.addEventListener('loadedmetadata', handleMetadata);
            audio.addEventListener('ended', handleEnded);
            audio.addEventListener('error', handleError);

            audioRef.current = audio;
            
            return () => {
                audio.pause();
                audio.removeEventListener('loadedmetadata', handleMetadata);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('error', handleError);
                audio.src = '';
                audioRef.current = null;
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
                if (audioCtxRef.current) {
                    audioCtxRef.current.close();
                    audioCtxRef.current = null;
                }
            };
        } else {
            audioRef.current = null;
            setDuration(0);
            setCurrentTime(0);
            setIsPlaying(false);
            setBassIntensity(0);
        }
    }, [audioUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
            audioRef.current.loop = isLooping;
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [speed, isLooping, volume, isMuted]);

    const setupVisualizer = () => {
        if (!audioRef.current || audioCtxRef.current) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
        } catch(e) {
            console.warn("Visualizer setup blocked", e);
        }
    };

    const formatTime = (t: number) => {
        if(isNaN(t)) return "0:00";
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        const ms = Math.floor((t % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    };

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (audioRef.current && !audioRef.current.paused) {
            setCurrentTime(audioRef.current.currentTime);
        }

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = 160;
        }
        const width = canvas.width;
        const height = canvas.height;

        // Get Frequency Data
        let dataArray = new Uint8Array(0);
        let bass = 0;
        let treble = 0;
        if (analyserRef.current) {
            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);
            const bassLimit = Math.floor(bufferLength * 0.1);
            for(let i=0; i<bassLimit; i++) bass += dataArray[i];
            bass = bass / bassLimit;
            const trebleStart = Math.floor(bufferLength * 0.7);
            for(let i=trebleStart; i<bufferLength; i++) treble += dataArray[i];
            treble = treble / (bufferLength - trebleStart);
            
            setBassIntensity(bass); // Sync state for glow effect
        } else {
            setBassIntensity(0);
        }

        // Background
        ctx.clearRect(0, 0, width, height);
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0A1624');
        grad.addColorStop(1, '#040E1A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Party Light Overlay on Canvas (Canvas internal glow)
        if (bass > 100) {
            ctx.globalCompositeOperation = 'overlay';
            const lightGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.8);
            lightGrad.addColorStop(0, `rgba(255, 183, 77, ${bass/500})`);
            lightGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }

        // Grid
        ctx.strokeStyle = '#1A304A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < width; i += width / 10) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
        }
        ctx.stroke();

        // EMOJI & BEAT
        if (isPlaying && audioUrl) {
            const beat = bass / 255; 
            const scale = 1 + (beat * 0.8);
            const centerX = width / 2;
            const centerY = height / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            
            let emoji = "🎵";
            if (beat > 0.6) emoji = "🔥";
            if (beat > 0.8) emoji = "🤯";
            if (treble > 150) emoji = "✨";
            
            ctx.font = "60px serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(255, 183, 77, 0.5)";
            ctx.shadowBlur = 20 * beat;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + beat * 0.4})`;
            ctx.fillText(emoji, 0, 0);
            ctx.restore();
        }

        // Visualizer Bars
        ctx.beginPath();
        const bars = 64;
        const barWidth = width / bars;
        const mid = height / 2;

        if (analyserRef.current && isPlaying) {
            for (let i = 0; i < bars; i++) {
                const percent = i / bars;
                const dataIndex = Math.floor(percent * (analyserRef.current?.frequencyBinCount || 0));
                const val = dataArray[dataIndex] || 0;
                const h = (val / 255) * (height * 0.8);
                const x = i * barWidth;
                
                // Color shifts with bass
                const r = 66 + Math.floor(val * 0.5);
                const g = 165 - Math.floor(val * 0.2);
                const b = 245;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${val/255})`;
                ctx.fillRect(x, mid - h/2, barWidth - 2, h);
            }
        } else {
            ctx.strokeStyle = audioUrl ? '#42A5F5' : '#1A304A';
            ctx.lineWidth = 2;
            for (let x = 0; x < width; x++) {
                const t = x * zoom * 0.1; 
                let y = 0;
                if (audioUrl) {
                    const f1 = Math.sin(t * 0.5);
                    const f2 = Math.sin(t * 2) * 0.5;
                    const songPos = x / width;
                    const envelope = Math.sin(songPos * Math.PI) * 0.8 + 0.2;
                    y = (f1 + f2) * envelope * (height * 0.35);
                } else {
                    const idle = Date.now() / 1000;
                    y = Math.sin(x * 0.02 + idle) * 5 + Math.sin(x * 0.05 - idle) * 5;
                }
                ctx.lineTo(x, mid + y);
            }
            ctx.stroke();
        }

        // Playhead
        if (audioUrl && duration > 0) {
            const progress = currentTime / duration;
            const xPos = progress * width;
            ctx.fillStyle = 'rgba(255, 183, 77, 0.5)';
            ctx.fillRect(xPos - 1, 0, 2, height);
            ctx.fillText(formatTime(currentTime), xPos + 5, 20);
        }

        animationRef.current = requestAnimationFrame(render);
    }, [audioUrl, currentTime, duration, isPlaying, zoom, isLooping, volume, isMuted, speed]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(render);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [render]);

    const togglePlay = async () => {
        if (!audioRef.current) return;
        if (!audioCtxRef.current) setupVisualizer();
        try {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (e) {
            console.error(e);
            setIsPlaying(false);
        }
    };

    const stop = () => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        audioRef.current.currentTime = percent * duration;
        setCurrentTime(percent * duration);
    };

    return (
        <div 
            className="bg-ocean-900 rounded-xl border border-ocean-800 p-4 shadow-lg transition-shadow duration-100"
            style={{
                boxShadow: bassIntensity > 100 ? `0 0 ${bassIntensity/5}px rgba(66, 165, 245, 0.5)` : 'none',
                borderColor: bassIntensity > 150 ? '#42A5F5' : '#1A304A'
            }}
        >
            <div className="flex justify-between items-end mb-2">
                <h3 className={`text-sm font-bold text-muted ${isRTL ? 'order-last' : ''}`}>
                    {isRTL ? 'المُشغّل التفاعلي' : 'VISUALIZER PLAYER'}
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded transition-all ${isLooping ? 'text-gold-400 bg-gold-400/10' : 'text-muted hover:text-slate-300'}`}>
                        <Repeat size={14} />
                    </button>
                </div>
            </div>
            
            <div 
                className="w-full overflow-hidden rounded-lg border border-ocean-800 mb-4 relative bg-ocean-950 cursor-crosshair group"
                onClick={handleSeek}
            >
                <canvas ref={canvasRef} className="w-full h-[160px] block" />
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex gap-2">
                    <button onClick={togglePlay} disabled={!audioUrl} className="p-3 rounded-lg bg-gradient-to-b from-ocean-800 to-ocean-900 border border-ocean-800 text-primary-400 hover:text-gold-400 shadow-lg disabled:opacity-50">
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>
                    <button onClick={stop} disabled={!audioUrl} className="p-3 rounded-lg bg-ocean-800 border border-ocean-800 text-slate-400 hover:text-red-400 disabled:opacity-50">
                        <Square size={20} fill="currentColor" />
                    </button>
                </div>
                {/* Controls reused from previous... */}
                <div className="flex items-center gap-3 bg-ocean-950/50 p-1.5 rounded-xl border border-ocean-800/50">
                    <div className="flex items-center gap-2 px-3 py-1 bg-ocean-900 rounded-lg">
                        <Gauge size={12} className="text-muted" />
                        <input type="range" min="0.5" max="2.0" step="0.05" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-16 h-1 bg-ocean-800 rounded appearance-none cursor-pointer accent-gold-400" />
                    </div>
                    <div className="w-px h-6 bg-ocean-800"></div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsMuted(!isMuted)} className="text-muted">
                            {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} className="w-16 h-1 bg-ocean-800 rounded appearance-none cursor-pointer accent-primary-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Waveform;

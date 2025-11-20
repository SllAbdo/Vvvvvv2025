
import { AudioProcessParams, RemixParams } from '../types';

// Helper: Create an impulse response buffer for convolution reverb
function impulse(ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const impulseData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return impulse;
}

// Helper: Saturation Curve for Warmth/Drive
function makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        // Soft clipping formula
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

// Helper: Convert AudioBuffer to WAV Blob
function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new Uint8Array(length);
    const view = new DataView(bufferArray.buffer);
    
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, length - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length - 44, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numOfChan; channel++) {
            let sample = buffer.getChannelData(channel)[i];
            // Hard Limit to prevent clipping
            sample = Math.max(-1, Math.min(1, sample)); 
            // Bit depth 16 PCM conversion
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    return new Blob([bufferArray], { type: 'audio/wav' });
}

// 1. Decode Helper
export async function decodeAudio(file: File): Promise<AudioBuffer> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    try {
        const arrayBuffer = await file.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    } finally {
        await ctx.close();
    }
}

// 2. Analysis Helper (Now accepts buffer)
export function analyzeAudioBuffer(audioBuffer: AudioBuffer): Partial<AudioProcessParams> {
    try {
        const data = audioBuffer.getChannelData(0);
        let sumSquares = 0;
        let zeroCrossings = 0;
        
        // Analyze a representative segment (up to 30s)
        const sampleLimit = Math.min(data.length, audioBuffer.sampleRate * 30); 
        const step = 10; // Downsample for performance
        
        for (let i = 0; i < sampleLimit; i += step) { 
            const val = data[i];
            sumSquares += val * val;
            if (i > 0 && data[i] * data[i-step] < 0) zeroCrossings++;
        }
        
        const count = sampleLimit / step;
        const rms = Math.sqrt(sumSquares / count);
        const zcr = zeroCrossings / count;

        // Heuristics for auto-enhancement
        const suggestions: Partial<AudioProcessParams> = {
            pitch: 0,
            stretch: 1.0,
            drive: 0.0,
            vibratoDepth: 0,
            vibratoSpeed: 6,
            ringMod: 0,
            backingVocals: 0,
            delayTime: 0.3,
            delayFeedback: 0.3,
            reverbDecay: 1.5
        };

        // 1. Dynamic EQ & Presence based on ZCR
        if (zcr < 0.02) {
            suggestions.eqAir = 5.0;
            suggestions.eqMid = 2.0;
            suggestions.eqBass = -2; 
            suggestions.denoise = 0.1;
            suggestions.drive = 0.3; 
        } else if (zcr > 0.15) {
            suggestions.eqAir = -2.0;
            suggestions.denoise = 0.4;
            suggestions.deess = 0.5;
        } else {
            suggestions.eqAir = 2.5;
            suggestions.denoise = 0.2;
            suggestions.drive = 0.1;
        }

        // 2. Normalization (Target RMS)
        const targetRMS = 0.15;
        const gainRatio = targetRMS / (rms || 0.001);
        const gainDb = 20 * Math.log10(gainRatio);
        suggestions.master = Math.max(0, Math.min(9, gainDb));

        // 3. Stereo Image
        if (audioBuffer.numberOfChannels === 1) {
            suggestions.stereo = 0.5; 
        } else {
            suggestions.stereo = 0.25; 
        }

        suggestions.reverb = 0.2;
        suggestions.masterReverb = 1.0;

        return suggestions;
    } catch (e) {
        console.error("Analysis failed", e);
        return {};
    }
}

// Legacy wrapper for Remix.tsx or if needed
export async function analyzeAudio(file: File): Promise<Partial<AudioProcessParams>> {
    const buffer = await decodeAudio(file);
    return analyzeAudioBuffer(buffer);
}

// 3. Main Processor (Takes Buffer)
export async function renderAudioFromBuffer(
    inputBuffer: AudioBuffer,
    params: AudioProcessParams,
    onProgress: (percent: number) => void
): Promise<Blob> {
    onProgress(10);

    const originalDuration = inputBuffer.duration;
    const speed = 1; 
    const pitchFactor = Math.pow(2, params.pitch / 12);
    const effectivePlaybackRate = speed * (pitchFactor / params.stretch);
    const newDuration = originalDuration / effectivePlaybackRate;
    
    const sampleRate = 48000;
    
    const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineContextClass(
        2,
        Math.ceil(newDuration * sampleRate) + sampleRate * 2, // Add 2s buffer for trails
        sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = inputBuffer;
    source.playbackRate.value = effectivePlaybackRate;

    // --- FX CHAIN ---

    // 1. Filters
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 70 + (200 * params.denoise); 

    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 19000 - (5000 * params.denoise); 

    const deesser = offlineCtx.createBiquadFilter();
    deesser.type = 'peaking';
    deesser.frequency.value = 7000;
    deesser.Q.value = 1 + params.deess;
    deesser.gain.value = -12 * params.deess;

    // 2. Saturation
    const shaper = offlineCtx.createWaveShaper();
    if (params.drive > 0) {
        shaper.curve = makeDistortionCurve(params.drive * 100);
        shaper.oversample = '4x';
    }

    // 3. EQ
    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 200;
    bass.gain.value = params.eqBass;

    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1500;
    mid.Q.value = 1.0;
    mid.gain.value = params.eqMid;

    const air = offlineCtx.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = 8000;
    air.gain.value = params.eqAir;

    // 4. Vibrato / Alien
    const vibratoDelay = offlineCtx.createDelay();
    vibratoDelay.delayTime.value = 0.005; 
    
    // 5. Backing Vocals
    const chorusDelay = offlineCtx.createDelay();
    chorusDelay.delayTime.value = 0.025;
    const chorusGain = offlineCtx.createGain();
    chorusGain.gain.value = params.backingVocals;
    const chorusOsc = offlineCtx.createOscillator();
    chorusOsc.frequency.value = 0.5; 
    const chorusOscGain = offlineCtx.createGain();
    chorusOscGain.gain.value = 0.002; 
    chorusOsc.connect(chorusOscGain);
    chorusOscGain.connect(chorusDelay.delayTime);
    if(params.backingVocals > 0) chorusOsc.start(0);

    // 6. Standard Delay (Detailed)
    const delayNode = offlineCtx.createDelay();
    const dTime = params.delayTime || 0.3;
    delayNode.delayTime.value = dTime;
    
    const delayFeedback = offlineCtx.createGain();
    const dFeed = params.delayFeedback || 0.3;
    delayFeedback.gain.value = dFeed; 
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    const delayGain = offlineCtx.createGain();
    delayGain.gain.value = params.delay;

    // 7. Reverb (Detailed)
    const convolver = offlineCtx.createConvolver();
    // Ensure minimum decay
    const rDecay = params.reverbDecay || 1.5; 
    convolver.buffer = impulse(offlineCtx, rDecay, 2.0);
    
    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = params.reverb;

    // 8. Dynamics
    const panner = offlineCtx.createStereoPanner();
    panner.pan.value = 0; 
    
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = Math.pow(10, params.master / 20);

    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = -1.0;
    limiter.ratio.value = 20; 
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;

    // --- ROUTING GRAPH ---
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(deesser);

    let currentLastNode: AudioNode = deesser;

    // Ring Mod
    if (params.ringMod > 0) {
        const osc = offlineCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 30;
        const dryGain = offlineCtx.createGain();
        dryGain.gain.value = 1 - (params.ringMod * 0.5);
        const ringModulator = offlineCtx.createGain();
        ringModulator.gain.value = 0; 
        osc.connect(ringModulator.gain);
        
        currentLastNode.connect(dryGain);
        currentLastNode.connect(ringModulator);
        
        const mixNode = offlineCtx.createGain();
        mixNode.gain.value = params.ringMod;
        ringModulator.connect(mixNode);

        const merger = offlineCtx.createGain();
        dryGain.connect(merger);
        mixNode.connect(merger);

        osc.start(0);
        currentLastNode = merger;
    }

    // Drive
    if (params.drive > 0) {
        currentLastNode.connect(shaper);
        currentLastNode = shaper;
    }

    // EQ
    currentLastNode.connect(bass);
    bass.connect(mid);
    mid.connect(air);
    
    // Vibrato
    if (params.vibratoDepth > 0) {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = params.vibratoSpeed || 6;
        gain.gain.value = params.vibratoDepth * 0.003; 
        osc.connect(gain);
        gain.connect(vibratoDelay.delayTime);
        osc.start(0);
        
        air.connect(vibratoDelay);
        currentLastNode = vibratoDelay;
    } else {
        currentLastNode = air;
    }

    // Chorus Split
    if (params.backingVocals > 0) {
        currentLastNode.connect(chorusDelay);
        const backingEq = offlineCtx.createBiquadFilter();
        backingEq.type = 'highpass';
        backingEq.frequency.value = 300;
        chorusDelay.connect(backingEq);
        backingEq.connect(chorusGain);
        chorusGain.connect(compressor); 
    }

    // FX Sends
    currentLastNode.connect(compressor); 
    currentLastNode.connect(delayNode); 
    currentLastNode.connect(convolver); 

    // Returns
    delayNode.connect(delayGain);
    delayGain.connect(compressor);

    convolver.connect(reverbGain);
    reverbGain.connect(compressor);

    // Final
    compressor.connect(panner);
    panner.connect(masterGain);
    masterGain.connect(limiter);
    limiter.connect(offlineCtx.destination);

    onProgress(50);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    onProgress(90);

    return bufferToWav(renderedBuffer);
}

// Legacy bridge used by Remix (though Remix has its own mixer, keeping this for safety)
export async function processAudioOffline(
    file: File | Blob, 
    params: AudioProcessParams, 
    onProgress: (percent: number) => void
): Promise<Blob> {
    // This creates a temporary decode - inefficient for repeated use but works for legacy calls
    if (file instanceof File) {
        const buffer = await decodeAudio(file);
        return renderAudioFromBuffer(buffer, params, onProgress);
    } else {
        // Handle Blob
        const buffer = await decodeAudio(new File([file], "temp"));
        return renderAudioFromBuffer(buffer, params, onProgress);
    }
}

export async function mixAudioOffline(
    fileA: File,
    fileB: File,
    params: RemixParams,
    onProgress: (p: number) => void
): Promise<Blob> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    onProgress(10);

    try {
        const [bufA, bufB] = await Promise.all([
            fileA.arrayBuffer().then(b => ctx.decodeAudioData(b)),
            fileB.arrayBuffer().then(b => ctx.decodeAudioData(b))
        ]);
        onProgress(40);
        await ctx.close();

        const durationA = bufA.duration / params.tempo;
        const shiftFactor = Math.pow(2, (params.key + params.shift) / 12);
        const durationB = bufB.duration / (params.tempo * shiftFactor);
        const duration = Math.max(durationA, durationB);
        
        const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
        const offlineCtx = new OfflineContextClass(2, Math.ceil(duration * 44100), 44100);

        const srcA = offlineCtx.createBufferSource();
        srcA.buffer = bufA;
        srcA.playbackRate.value = params.tempo;

        const srcB = offlineCtx.createBufferSource();
        srcB.buffer = bufB;
        srcB.playbackRate.value = params.tempo * shiftFactor;

        const gainA = offlineCtx.createGain();
        gainA.gain.value = 0.8; 

        const gainB = offlineCtx.createGain();
        gainB.gain.value = 0.8;

        const limiter = offlineCtx.createDynamicsCompressor();
        limiter.threshold.value = -2.0;
        limiter.ratio.value = 10;

        srcA.connect(gainA);
        gainA.connect(limiter);

        srcB.connect(gainB);
        gainB.connect(limiter);

        limiter.connect(offlineCtx.destination);

        srcA.start(0);
        srcB.start(0);

        onProgress(60);
        const rendered = await offlineCtx.startRendering();
        onProgress(90);
        
        return bufferToWav(rendered);
        
    } catch (e) {
        console.error("Mixing error", e);
        if (ctx.state !== 'closed') await ctx.close();
        throw new Error("Mixing failed. Please check audio files.");
    }
}

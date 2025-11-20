
export const View = {
    Enhancer: 'Enhancer',
    Remix: 'Remix',
    Feed: 'Feed',
    Social: 'Social',
} as const;

export type View = typeof View[keyof typeof View];

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

export interface AudioProcessParams {
    pitch: number;
    stretch: number;
    denoise: number;
    deess: number;
    reverb: number; // Wet amount
    reverbDecay: number; // Tail length
    masterReverb: number; // Overall Gain
    stereo: number;
    drive: number; // Saturation/Warmth
    shift: number; // Auto-legal shift
    
    delay: number; // Wet amount
    delayTime: number; // Time in seconds
    delayFeedback: number; // 0-1
    
    eqBass: number;
    eqMid: number;
    eqAir: number;
    master: number;
    
    // New FX
    vibratoDepth: number;
    vibratoSpeed: number;
    ringMod: number; // 0 to 1 (Robot effect)
    backingVocals: number; // 0 to 1 (Chorus/Doubler)
}

export interface RemixParams {
    key: number;
    tempo: number;
    shift: number; // Auto-legal shift (fine tune)
    balance: number;
}

export interface FeedPost {
    id: number;
    name: string;
    date: string;
    tags: string[];
    url: string;
}

export interface Preset {
    name: string;
    params: AudioProcessParams;
}

export type Language = 'ar' | 'en';

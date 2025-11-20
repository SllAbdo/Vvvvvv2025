
import React, { useEffect, useState } from 'react';
import { FeedPost, Language } from '../types';
import { Play, Download, Clock, Tag, Cloud, Loader2, Trash2 } from 'lucide-react';
import { getCloudTracks } from '../services/cloudService';
import Waveform from '../components/Waveform';

const Feed: React.FC<{ lang: Language }> = ({ lang }) => {
    const isRTL = lang === 'ar';
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTrack, setActiveTrack] = useState<FeedPost | null>(null);
    const [activeUrl, setActiveUrl] = useState<string | null>(null);

    useEffect(() => {
        loadTracks();
    }, []);

    useEffect(() => {
        if (activeTrack?.blob) {
            const url = URL.createObjectURL(activeTrack.blob);
            setActiveUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [activeTrack]);

    const loadTracks = async () => {
        setLoading(true);
        try {
            const tracks = await getCloudTracks();
            setPosts(tracks);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
    };

    const downloadBlob = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8 border-b border-ocean-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                        <Cloud className="text-gold-400" />
                        {isRTL ? 'الأرشيف السحابي' : 'Cloud Library Archive'}
                    </h2>
                    <p className="text-xs text-muted mt-1">
                        {isRTL ? 'جميع الملفات التي قمت بحفظها (محفوظة محلياً)' : 'Your saved sessions and mixes (Locally Persisted)'}
                    </p>
                </div>
                <button onClick={loadTracks} className="p-2 bg-ocean-900 rounded-full hover:bg-ocean-800 transition-colors">
                    <Clock size={18} className="text-muted" />
                </button>
            </div>

            {activeTrack && activeUrl && (
                <div className="mb-8 sticky top-20 z-30 animate-fade-in">
                    <div className="bg-ocean-900/90 backdrop-blur p-4 rounded-xl border border-primary-400 shadow-[0_0_30px_rgba(66,165,245,0.2)]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-primary-400">Now Playing: {activeTrack.name}</h3>
                            <button onClick={() => setActiveTrack(null)} className="text-xs text-muted hover:text-white">Close</button>
                        </div>
                        <Waveform audioUrl={activeUrl} isRTL={isRTL} />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-primary-400" />
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-20 text-muted border-2 border-dashed border-ocean-800 rounded-xl">
                    <Cloud size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{isRTL ? 'لا يوجد ملفات محفوظة بعد' : 'No saved tracks yet.'}</p>
                    <p className="text-xs mt-2">{isRTL ? 'اذهب للمحسن وقم بالحفظ.' : 'Go to Enhancer and click "Save to Cloud".'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map(post => (
                        <div key={post.id} className={`bg-ocean-900 rounded-xl border transition-all group ${activeTrack?.id === post.id ? 'border-primary-400 ring-1 ring-primary-400' : 'border-ocean-800 hover:border-gold-400'}`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <button 
                                        onClick={() => setActiveTrack(post)}
                                        className="w-12 h-12 rounded-full bg-ocean-950 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform shadow-lg"
                                    >
                                        {activeTrack?.id === post.id ? <Loader2 className="animate-spin"/> : <Play size={20} fill="currentColor" />}
                                    </button>
                                    <span className="text-[10px] text-muted flex items-center gap-1 bg-ocean-950 px-2 py-1 rounded-full">
                                        <Clock size={10} /> {formatTime(post.date)}
                                    </span>
                                </div>
                                
                                <h3 className="font-bold text-slate-200 mb-2 truncate" title={post.name}>{post.name}</h3>
                                
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {post.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-ocean-950 rounded text-[10px] text-slate-400 border border-ocean-800 flex items-center gap-1">
                                            <Tag size={8} /> {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-ocean-800/50">
                                    {post.blob && (
                                        <button 
                                            onClick={() => downloadBlob(post.blob!, post.name)}
                                            className="flex-1 py-2 bg-ocean-800 hover:bg-primary-400 hover:text-ocean-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Download size={12} /> {isRTL ? 'تنزيل' : 'Download'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Feed;

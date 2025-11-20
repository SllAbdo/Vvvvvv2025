import React from 'react';
import { FeedPost, Language } from '../types';
import { Play, Download, Clock, Tag } from 'lucide-react';

const Feed: React.FC<{ lang: Language }> = ({ lang }) => {
    const isRTL = lang === 'ar';
    const posts: FeedPost[] = [
        { id: 1, name: "Cheb Hasni - Remix 2024", date: "2 mins ago", tags: ["Raï", "Remix", "Auto-Tune"], url: "#" },
        { id: 2, name: "Gnawa Fusion Session", date: "1 hour ago", tags: ["Gnawa", "Atmospheric", "Reverb"], url: "#" },
        { id: 3, name: "Wedding Chaabi Set 1", date: "Yesterday", tags: ["Chaabi", "Live", "Cleaned"], url: "#" },
        { id: 4, name: "Vocals_Raw_Take_3", date: "2 days ago", tags: ["Raw", "Vocal"], url: "#" },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-200">
                    {isRTL ? 'الأرشيف والمكتبة' : 'Library Archive'}
                </h2>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder={isRTL ? 'بحث...' : "Search..."}
                        className="bg-ocean-900 border border-ocean-800 rounded-lg px-4 py-2 text-sm text-slate-300 focus:border-primary-400 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-ocean-900 rounded-xl border border-ocean-800 p-5 hover:border-primary-400 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-ocean-800 flex items-center justify-center text-primary-400 group-hover:bg-primary-400 group-hover:text-ocean-950 transition-colors">
                                <Play size={18} fill="currentColor" />
                            </div>
                            <span className="text-[10px] text-muted flex items-center gap-1">
                                <Clock size={10} /> {post.date}
                            </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-200 mb-2 truncate">{post.name}</h3>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                            {post.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-ocean-950 rounded text-[10px] text-slate-400 border border-ocean-800 flex items-center gap-1">
                                    <Tag size={8} /> {tag}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 py-2 bg-ocean-800 hover:bg-gold-400 hover:text-ocean-950 rounded-lg text-xs font-bold transition-colors">
                                {isRTL ? 'تعديل' : 'Edit FX'}
                            </button>
                            <button className="flex-1 py-2 bg-ocean-800 hover:bg-primary-400 hover:text-ocean-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                <Download size={12} /> WAV
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Feed;
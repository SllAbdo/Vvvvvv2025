
import React, { useState, useRef, useEffect } from 'react';
import { Zap, Disc, Archive, Share2, Layers, Globe, LogIn, LogOut, User as UserIcon, ChevronDown, Mail, Sparkles, ShieldCheck } from 'lucide-react';
import { View, Language } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    currentView: View;
    onChangeView: (view: View) => void;
    lang: Language;
    onToggleLang: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView, lang, onToggleLang }) => {
    const isRTL = lang === 'ar';
    const { user, login, logout, isLoading } = useAuth();
    const [showLoginMenu, setShowLoginMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowLoginMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogin = (provider: string) => {
        login(provider);
        setShowLoginMenu(false);
    };

    const NavBtn = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
        <button
            onClick={() => onChangeView(view)}
            className={`flex items-center gap-2 px-3 py-3 text-sm font-bold transition-all duration-200 border-b-2 ${
                currentView === view
                    ? 'text-gold-400 border-gold-400 drop-shadow-[0_0_8px_rgba(255,183,77,0.5)]'
                    : 'text-muted border-transparent hover:text-white hover:border-ocean-800'
            }`}
        >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
        </button>
    );

    return (
        <header className="bg-ocean-900/90 border-b border-ocean-800 px-4 lg:px-8 py-2 sticky top-0 z-50 backdrop-blur-xl">
            <div className={`flex flex-wrap items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                
                {/* Branding */}
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-gold-400 shadow-[0_0_20px_rgba(66,165,245,0.3)] flex items-center justify-center text-ocean-950 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <Layers size={24} />
                    </div>
                    <div className="hidden sm:block cursor-default">
                        <h1 className="font-orbitron text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-primary-400 tracking-wider drop-shadow-sm">
                            RaïWave
                        </h1>
                        <div className="flex items-center gap-1 text-[10px] text-muted font-semibold tracking-widest uppercase">
                            <span>Deep Ocean Studio</span>
                            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={`flex items-center gap-1 md:gap-4 overflow-x-auto scrollbar-hide ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <NavBtn view={View.Enhancer} icon={Zap} label={isRTL ? 'المُحسّن' : 'Enhancer'} />
                    <NavBtn view={View.Remix} icon={Disc} label={isRTL ? 'ريمكس' : 'Remix'} />
                    <NavBtn view={View.Feed} icon={Archive} label={isRTL ? 'الأرشيف' : 'Archive'} />
                    <NavBtn view={View.Social} icon={Share2} label={isRTL ? 'تسويق' : 'Social'} />
                </nav>

                {/* Controls & Auth */}
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button 
                        onClick={onToggleLang}
                        className="p-2 rounded-lg bg-ocean-950 border border-ocean-800 text-muted hover:text-white transition-colors hover:bg-ocean-800"
                        title={isRTL ? 'Switch to English' : 'تبديل للعربية'}
                    >
                        <Globe size={16} />
                    </button>

                    {/* Auth Section */}
                    {!isLoading && (
                        user ? (
                            <div className={`flex items-center gap-3 bg-ocean-950 border border-ocean-800 rounded-full pl-1 pr-4 py-1 group hover:border-primary-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="relative">
                                    <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full bg-ocean-800 object-cover border border-ocean-700" />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-ocean-950 rounded-full"></div>
                                </div>
                                <div className="hidden md:block text-xs">
                                    <p className="text-slate-200 font-bold group-hover:text-primary-400 transition-colors">{user.name}</p>
                                    <button onClick={logout} className="text-muted hover:text-red-400 text-[10px] flex items-center gap-1 transition-colors">
                                        <LogOut size={10} /> {isRTL ? 'تسجيل خروج' : 'Sign Out'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative" ref={menuRef}>
                                <button 
                                    onClick={() => setShowLoginMenu(!showLoginMenu)}
                                    className={`
                                        relative flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300
                                        bg-ocean-950 border border-gold-500/30 text-gold-400
                                        hover:shadow-[0_0_20px_rgba(255,183,77,0.2)] hover:border-gold-400 hover:text-white hover:-translate-y-0.5
                                        active:translate-y-0 active:shadow-none
                                        ${isRTL ? 'flex-row-reverse' : ''}
                                    `}
                                >
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-400/10 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                                    <ShieldCheck size={16} className="relative z-10" />
                                    <span className="relative z-10 tracking-wide">{isRTL ? 'دخول الأعضاء' : 'MEMBER LOGIN'}</span>
                                    <ChevronDown size={12} className={`relative z-10 transition-transform duration-300 ${showLoginMenu ? 'rotate-180' : ''}`} />
                                </button>

                                {showLoginMenu && (
                                    <div className={`absolute top-full mt-3 w-72 bg-ocean-900/95 backdrop-blur-xl border border-ocean-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 animate-fade-in z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
                                        <div className="text-center mb-4">
                                            <div className="w-12 h-12 bg-ocean-800 rounded-full flex items-center justify-center mx-auto mb-2 text-gold-400 shadow-inner">
                                                <Sparkles size={20} />
                                            </div>
                                            <p className="text-sm font-bold text-white">
                                                {isRTL ? 'مرحباً بك في الاستوديو' : 'Welcome to Studio'}
                                            </p>
                                            <p className="text-[10px] text-muted">
                                                {isRTL ? 'سجّل للدخول والحفظ والمشاركة' : 'Sign in to save, mix and share'}
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-2.5">
                                            {/* Google */}
                                            <button onClick={() => handleLogin('google')} className="relative w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors text-slate-700 font-bold text-xs border border-slate-200 group overflow-hidden">
                                                <div className="absolute inset-0 bg-slate-100 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                                <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                <span className="relative z-10 flex-grow text-center">{isRTL ? 'جوجل' : 'Continue with Google'}</span>
                                            </button>

                                            {/* Facebook */}
                                            <button onClick={() => handleLogin('facebook')} className="relative w-full flex items-center gap-3 p-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] transition-colors text-white font-bold text-xs group overflow-hidden">
                                                <div className="absolute inset-0 bg-black/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                                <svg className="w-5 h-5 fill-current relative z-10" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                                <span className="relative z-10 flex-grow text-center">{isRTL ? 'فيسبوك' : 'Continue with Facebook'}</span>
                                            </button>

                                            {/* Apple */}
                                            <button onClick={() => handleLogin('apple')} className="relative w-full flex items-center gap-3 p-3 rounded-xl bg-black hover:bg-gray-900 transition-colors text-white font-bold text-xs group overflow-hidden">
                                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                                <svg className="w-5 h-5 fill-current relative z-10" viewBox="0 0 384 512">
                                                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
                                                </svg>
                                                <span className="relative z-10 flex-grow text-center">{isRTL ? 'أبل' : 'Continue with Apple'}</span>
                                            </button>

                                            {/* Email */}
                                            <button onClick={() => handleLogin('google')} className="relative w-full flex items-center gap-3 p-3 rounded-xl bg-ocean-800 hover:bg-ocean-700 transition-colors text-slate-300 font-bold text-xs border border-ocean-700 group">
                                                <Mail size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                                                <span className="flex-grow text-center">{isRTL ? 'البريد الإلكتروني' : 'Use Email Address'}</span>
                                            </button>
                                        </div>
                                        
                                        <div className="mt-4 pt-3 border-t border-ocean-700 text-center">
                                            <p className="text-[10px] text-muted hover:text-primary-400 cursor-pointer transition-colors">
                                                {isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

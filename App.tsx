import React, { useState } from 'react';
import Header from './components/Header';
import Enhancer from './views/Enhancer';
import Remix from './views/Remix';
import Feed from './views/Feed';
import Social from './views/Social';
import { View, Language } from './types';
import { AuthProvider } from './contexts/AuthContext';

const AppContent: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>(View.Enhancer);
    const [lang, setLang] = useState<Language>('ar');

    const toggleLang = () => {
        setLang(prev => prev === 'ar' ? 'en' : 'ar');
        document.documentElement.dir = lang === 'ar' ? 'ltr' : 'rtl';
        document.documentElement.lang = lang === 'ar' ? 'en' : 'ar';
    };

    // Set initial dir
    React.useEffect(() => {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-ocean-950 text-slate-200 font-sans">
            <Header 
                currentView={currentView} 
                onChangeView={setCurrentView}
                lang={lang}
                onToggleLang={toggleLang}
            />
            
            <main className="flex-grow relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#0A1624_0%,transparent_50%)] pointer-events-none" />
                
                {currentView === View.Enhancer && <Enhancer lang={lang} />}
                {currentView === View.Remix && <Remix lang={lang} />}
                {currentView === View.Feed && <Feed lang={lang} />}
                {currentView === View.Social && <Social lang={lang} />}
            </main>

            <footer className="py-6 text-center text-[10px] text-ocean-800/50 font-mono border-t border-ocean-900">
                RaïWave Pro v2.5.0 | Built by Deep Ocean Studio | Universal Audio Engine
            </footer>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
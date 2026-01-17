import React, { useState, useEffect } from 'react';
import { SearchMode, SearchStrategy } from './types';
import Navbar from './components/Navbar';
import ModeCard from './components/ModeCard';
import SingleSongSearch from './components/SingleSongSearch';
import PlaylistManager from './components/PlaylistManager';
import FAQ from './components/FAQ';
import SettingsPage from './components/SettingsPage';
import { Music2, ListMusic } from 'lucide-react';

type View = 'home' | 'single' | 'playlist' | 'faq' | 'settings';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [strategy, setStrategy] = useState<SearchStrategy>({
    mode: SearchMode.FUZZY,
    tryExternal: true,
  });

  // Init theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load strategy from localStorage
  useEffect(() => {
    const savedStrategy = localStorage.getItem('lyrical_setting_search_strategy');
    if (savedStrategy) {
      try {
        setStrategy(JSON.parse(savedStrategy));
      } catch (e) {
        console.error('Failed to parse saved strategy:', e);
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
          <div className="max-w-6xl mx-auto py-20 animate-fade-in">
            <div className="text-center mb-20 space-y-6">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Synced Lyrics. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Made Simple.</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Download precise .LRC files for your music library. <br className="hidden md:inline" />
                Support for single tracks or entire M3U playlists powered by AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 px-4">
              <ModeCard
                title="Single Song"
                description="Search for individual tracks using Title, Artist and Duration. Perfect for fixing specific metadata."
                icon={Music2}
                onClick={() => setView('single')}
                colorClass="bg-gradient-to-br from-indigo-500 to-blue-600"
              />
              <ModeCard
                title="Playlist Import"
                description="Bulk process .m3u or .json playlists. We use Gemini AI to parse messy filenames into clean metadata."
                icon={ListMusic}
                onClick={() => setView('playlist')}
                colorClass="bg-gradient-to-br from-emerald-500 to-teal-600"
              />
            </div>
          </div>
        );

      case 'single':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Music2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Single Track Search</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Find lyrics for one song at a time</p>
              </div>
            </div>
            <SingleSongSearch strategy={strategy} />
          </div>
        );

      case 'playlist':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                <ListMusic size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Playlist Manager</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Bulk search and download</p>
              </div>
            </div>
            <PlaylistManager strategy={strategy} />
          </div>
        );

      case 'faq':
        return <FAQ />;

      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        onBack={() => setView('home')}
        showBack={view !== 'home' && view !== 'faq' && view !== 'settings'}
        onNavigate={setView}
        currentView={view}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="py-8 text-center text-slate-400 dark:text-slate-600 text-sm border-t border-slate-200 dark:border-slate-800 mt-12">
        <p>&copy; {new Date().getFullYear()} Lyra. No login required.</p>
      </footer>
    </div>
  );
};

export default App;
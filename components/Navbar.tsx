import React from 'react';
import { Music2, Sun, Moon, Github, ArrowLeft, HelpCircle, Settings } from 'lucide-react';

interface NavbarProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onBack?: () => void;
  showBack: boolean;
  onNavigate: (view: any) => void;
  currentView?: string; // Add this optional prop to highlight active tab
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme, onBack, showBack, onNavigate, currentView }) => {
  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 transition-colors duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            {showBack && (
              <button
                onClick={onBack}
                className="p-2.5 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onNavigate('home')}>
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/40 transition-all">
                <Music2 size={24} />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Lyra</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('faq')}
              className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2.5 rounded-xl ${currentView === 'faq' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' : 'text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <HelpCircle size={18} />
              <span className="hidden sm:inline">FAQ</span>
            </button>

            {/* NEW: Settings Button */}
            <button
              onClick={() => onNavigate('settings')}
              className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2.5 rounded-xl ${currentView === 'settings' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' : 'text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all active:scale-95 focus:outline-none"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
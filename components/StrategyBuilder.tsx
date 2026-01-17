import React from 'react';
import { SearchStrategy, SearchMode } from '../types';
import { Settings, CheckCircle2, Search, Zap } from 'lucide-react';

interface StrategyBuilderProps {
  strategy: SearchStrategy;
  onChange: (s: SearchStrategy) => void;
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({ strategy, onChange }) => {
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
          <Settings size={22} />
          <h2 className="text-base font-bold uppercase tracking-wider">Search Configuration</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mode Selection */}
        <button
          onClick={() => onChange({ ...strategy, mode: SearchMode.EXACT })}
          className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${strategy.mode === SearchMode.EXACT
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-lg shadow-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-400'
            }`}
        >
          {strategy.mode === SearchMode.EXACT && (
            <div className="absolute top-3 right-3 text-indigo-500"><CheckCircle2 size={18} /></div>
          )}
          <span className="font-bold text-base">Exact Match</span>
          <span className="text-xs text-center mt-1.5 opacity-80">High precision</span>
        </button>

        <button
          onClick={() => onChange({ ...strategy, mode: SearchMode.FUZZY })}
          className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${strategy.mode === SearchMode.FUZZY
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-lg shadow-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-400'
            }`}
        >
          {strategy.mode === SearchMode.FUZZY && (
            <div className="absolute top-3 right-3 text-indigo-500"><CheckCircle2 size={18} /></div>
          )}
          <span className="font-bold text-base">Fuzzy Search</span>
          <span className="text-xs text-center mt-1.5 opacity-80">Smart matching</span>
        </button>

        <button
          onClick={() => onChange({ ...strategy, mode: SearchMode.CACHED })}
          className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${strategy.mode === SearchMode.CACHED
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-lg shadow-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-400'
            }`}
        >
          {strategy.mode === SearchMode.CACHED && (
            <div className="absolute top-3 right-3 text-indigo-500"><CheckCircle2 size={18} /></div>
          )}
          <span className="font-bold text-base">Cached Only</span>
          <span className="text-xs text-center mt-1.5 opacity-80">Instant speed</span>
        </button>
      </div>

      {/* External Sources Toggle */}
      <label className="mt-6 flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all">
        <div>
          <span className="block text-base font-bold text-slate-900 dark:text-white">External API Fallback</span>
          <span className="block text-sm text-slate-600 dark:text-slate-400 mt-1">Search external providers if internal DB fails (Slower)</span>
        </div>
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={strategy.tryExternal}
            onChange={(e) => onChange({ ...strategy, tryExternal: e.target.checked })}
            disabled={strategy.mode === SearchMode.CACHED}
          />
          <div className="w-14 h-7 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
        </div>
      </label>
    </div>
  );
};

export default StrategyBuilder;
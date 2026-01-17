import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, FileText, Search, Sparkles, Trash2, Check, LayoutTemplate, AlertCircle, Key } from 'lucide-react';
import { filenameFormats, defaultFormat } from '../services/filenameService';
import { SearchMode, SearchStrategy } from '../types';
import StrategyBuilder from './StrategyBuilder';

const SettingsPage: React.FC = () => {
    // State for settings
    const [defaultFilenameId, setDefaultFilenameId] = useState<string>(defaultFormat.id);
    const [defaultSearchMode, setDefaultSearchMode] = useState<SearchMode>(SearchMode.FUZZY);
    const [defaultAiPrompt, setDefaultAiPrompt] = useState<string>('');
    const [defaultJsonPrompt, setDefaultJsonPrompt] = useState<string>('');
    const [geminiApiKey, setGeminiApiKey] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const [strategy, setStrategy] = useState<SearchStrategy>({
        mode: SearchMode.FUZZY,
        useAlbum: true,
        useDuration: true,
    });

    // Load from localStorage on mount
    useEffect(() => {
        const savedFormat = localStorage.getItem('lyrical_setting_filename_format');
        if (savedFormat) setDefaultFilenameId(savedFormat);

        const savedMode = localStorage.getItem('lyrical_setting_search_mode');
        if (savedMode && Object.values(SearchMode).includes(savedMode as SearchMode)) {
            setDefaultSearchMode(savedMode as SearchMode);
        }

        const savedPrompt = localStorage.getItem('lyrical_setting_ai_prompt');
        if (savedPrompt) setDefaultAiPrompt(savedPrompt);

        const savedJsonPrompt = localStorage.getItem('lyrical_setting_json_prompt');
        if (savedJsonPrompt) setDefaultJsonPrompt(savedJsonPrompt);

        const savedGeminiKey = localStorage.getItem('lyrical_setting_gemini_key');
        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);

        // Load strategy from localStorage
        const savedStrategy = localStorage.getItem('lyrical_setting_search_strategy');
        if (savedStrategy) {
            try {
                setStrategy(JSON.parse(savedStrategy));
            } catch (e) {
                console.error('Failed to parse saved strategy:', e);
            }
        }
    }, []);

    // Auto-save on change
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('lyrical_setting_filename_format', defaultFilenameId);
            localStorage.setItem('lyrical_setting_search_mode', defaultSearchMode.toString());
            localStorage.setItem('lyrical_setting_ai_prompt', defaultAiPrompt);
            localStorage.setItem('lyrical_setting_json_prompt', defaultJsonPrompt);
            localStorage.setItem('lyrical_setting_gemini_key', geminiApiKey);
            localStorage.setItem('lyrical_setting_search_strategy', JSON.stringify(strategy));

            setSaveStatus('saved');
            const statusReset = setTimeout(() => setSaveStatus('idle'), 1500);
            return () => clearTimeout(statusReset);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [defaultFilenameId, defaultSearchMode, defaultAiPrompt, defaultJsonPrompt, geminiApiKey, strategy]);

    const handleReset = () => {
        if (window.confirm('Reset all settings to default?')) {
            setDefaultFilenameId(defaultFormat.id);
            setDefaultSearchMode(SearchMode.FUZZY);
            setDefaultAiPrompt('');
            setDefaultJsonPrompt('');
            setGeminiApiKey('');
            localStorage.clear(); // Clear everything to ensure clean state
            window.location.reload(); // Reload to refresh all components
        }
    };

    const clearHistory = () => {
        if (window.confirm('Clear all saved sessions and search history? This cannot be undone.')) {
            localStorage.removeItem('playlist-session');
            // Add any other specific keys you use for caching
            alert('Local history cleared.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 animate-fade-in space-y-8 mb-20 px-4">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-slate-200 dark:border-slate-800 pb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">Manage global preferences and defaults.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleReset}
                        className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl text-sm font-bold transition-all border-2 border-slate-200 dark:border-slate-700"
                    >
                        Reset Defaults
                    </button>
                    <div
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${saveStatus === 'saved' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/50' : 'text-slate-400 opacity-50 border-2 border-slate-200 dark:border-slate-700'}`}
                    >
                        {saveStatus === 'saved' ? <Check size={20} /> : <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-indigo-500 rounded-full animate-spin" />}
                        {saveStatus === 'saved' ? 'Saved' : 'Auto-saving...'}
                    </div>
                </div>
            </div>

            {/* 1. Download Preferences */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <FileText className="text-emerald-500" size={28} />
                    Download Preferences
                </h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-4">Default Filename Format</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filenameFormats.map(fmt => (
                                <button
                                    key={fmt.id}
                                    onClick={() => setDefaultFilenameId(fmt.id)}
                                    className={`text-left p-5 rounded-xl border-2 text-sm transition-all hover:scale-105 active:scale-95 ${defaultFilenameId === fmt.id
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600'
                                        }`}
                                >
                                    <div className="font-bold text-base">{fmt.name}</div>
                                    <div className="text-xs opacity-70 mt-2 font-mono">{fmt.pattern}</div>
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">This format will be pre-selected whenever you download lyrics.</p>
                    </div>
                </div>
            </div>

            {/* 2. Search Strategy */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Search className="text-indigo-500" size={28} />
                        Search Strategy
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
                        Configure how lyrics are matched when searching. These settings apply to both Single Song and Playlist searches.
                    </p>
                </div>
                <StrategyBuilder strategy={strategy} onChange={setStrategy} />
            </div>

            {/* 3. AI & Parsing */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <Sparkles className="text-violet-500" size={28} />
                    AI & Parsing
                </h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
                            Default M3U Extraction Prompt
                        </label>
                        <textarea
                            value={defaultAiPrompt}
                            onChange={(e) => setDefaultAiPrompt(e.target.value)}
                            placeholder="e.g. Extract all tracks. Return JSON array. Do not truncate..."
                            className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                            This instruction will be automatically loaded into the prompt editor when you upload an M3U file.
                        </p>
                    </div>
                    <div>
                        <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
                            Default JSON Extraction Prompt
                        </label>
                        <textarea
                            value={defaultJsonPrompt}
                            onChange={(e) => setDefaultJsonPrompt(e.target.value)}
                            placeholder="e.g. Extract all tracks from the JSON data. Return clean metadata..."
                            className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                            This instruction will be automatically loaded into the prompt editor when you upload a JSON file.
                        </p>
                    </div>
                </div>
            </div>

            {/* 3.5. Gemini API Key */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <Key className="text-amber-500" size={28} />
                    Gemini API Key
                </h2>
                <div>
                    <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
                        Your Google Gemini API Key
                    </label>
                    <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Enter your Gemini API key..."
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                        Required for AI-powered playlist parsing. Get your free key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-semibold">Google AI Studio</a>. Your key is stored locally and never sent to our servers.
                    </p>
                    {!geminiApiKey && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl">
                            <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold">
                                ⚠️ No API Key Found: You need to add a Gemini API key to use AI-powered playlist parsing features.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-8 border-2 border-red-200 dark:border-red-900/30 shadow-lg">
                <h2 className="text-2xl font-black text-red-800 dark:text-red-400 mb-6 flex items-center gap-3">
                    <AlertCircle size={28} />
                    Data Management
                </h2>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="text-base text-red-700 dark:text-red-300">
                        <p className="font-bold text-lg">Clear Local Storage</p>
                        <p className="opacity-90 mt-1">Removes all saved sessions, cached history, and temporary data.</p>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="px-6 py-3 bg-white dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl text-base font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap shadow-md"
                    >
                        <Trash2 size={20} /> Clear Data
                    </button>
                </div>
            </div>

        </div>
    );
};

export default SettingsPage;
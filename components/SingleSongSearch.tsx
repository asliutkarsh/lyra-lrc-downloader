import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Eraser, Clock, ChevronDown, ChevronUp, Settings, Music, User, Disc, Timer, Sparkles, AlertCircle } from 'lucide-react';
// IMPORT FIXED: Use searchLyrics from your provided service code
import { searchLyrics } from '../services/lrcService';
import { calculateConfidence } from '../services/utils';
import { SearchStrategy, MatchResult, LrcLibTrack } from '../types';
import ResultCard from './ResultCard';

// --- Types ---
interface Props {
  strategy: SearchStrategy;
}

interface SearchHistoryItem {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: string;
  timestamp: number;
}

interface AdvancedInputs {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: string;
}

type SearchStatus = 'idle' | 'loading' | 'success' | 'not-found';

// --- Component ---
const SingleSongSearch: React.FC<Props> = ({ strategy }) => {
  // --- State ---
  const [simpleQuery, setSimpleQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<SearchStatus>('idle');

  const [inputs, setInputs] = useState<AdvancedInputs>({
    trackName: '',
    artistName: '',
    albumName: '',
    duration: '',
  });

  // Stores the array of results
  const [results, setResults] = useState<MatchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const [filters, setFilters] = useState({
    useTrackName: true,
    useArtistName: true,
    useAlbumName: true,
  });

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('lrc-search-history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse search history:', e);
        localStorage.removeItem('lrc-search-history');
      }
    }
  }, []);

  // --- Helpers ---
  const saveToHistory = useCallback((searchData: SearchHistoryItem) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(
        item => item.trackName.toLowerCase() !== searchData.trackName.toLowerCase() ||
          item.artistName.toLowerCase() !== searchData.artistName.toLowerCase()
      );
      const newHistory = [searchData, ...filtered].slice(0, 8);
      localStorage.setItem('lrc-search-history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('lrc-search-history');
  };

  const loadFromHistory = (item: SearchHistoryItem) => {
    setSimpleQuery(`${item.trackName} ${item.artistName}`.trim());
    setInputs({
      trackName: item.trackName || '',
      artistName: item.artistName || '',
      albumName: item.albumName || '',
      duration: item.duration || '',
    });
    if (item.albumName || item.duration) {
      setShowAdvanced(true);
    }
  };

  const clearForm = () => {
    setSimpleQuery('');
    setInputs({ trackName: '', artistName: '', albumName: '', duration: '' });
    setResults([]);
    setStatus('idle');
  };

  // --- Search Logic ---
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Prepare search parameters
    let q = '';
    let tName = '';
    let aName = '';
    let albName = '';
    let searchDuration = 0;

    // Logic to map UI inputs to API arguments
    if (showAdvanced) {
      // In advanced mode, we pass specific fields
      tName = filters.useTrackName ? inputs.trackName.trim() : '';
      aName = filters.useArtistName ? inputs.artistName.trim() : '';
      albName = filters.useAlbumName ? inputs.albumName.trim() : '';
      const parsedDur = parseInt(inputs.duration, 10);
      searchDuration = !isNaN(parsedDur) ? parsedDur : 0;
    } else {
      // In simple mode, we use the generic 'q' query
      if (!simpleQuery.trim()) return;
      q = simpleQuery.trim();
    }

    if (!q && !tName && !aName && !albName) {
      return;
    }

    setStatus('loading');
    setResults([]);

    try {
      // CALLING searchLyrics from your snippet
      // Signature: searchLyrics(query, trackName, artistName, albumName)
      const rawTracks = await searchLyrics(q, tName, aName, albName);

      if (rawTracks && rawTracks.length > 0) {

        // Define the "Target" (what the user wanted) for confidence scoring
        // If simple search, we just assume the query is the track name for scoring purposes
        const targetMetadata = {
          trackName: showAdvanced ? tName : q,
          artistName: aName,
          duration: searchDuration || undefined
        };

        // Convert raw tracks to MatchResults with confidence scores
        const processedResults = rawTracks.map(track => {
          return calculateConfidence(targetMetadata, track);
        });

        // Sort by confidence score (Highest first)
        processedResults.sort((a, b) => b.confidenceScore - a.confidenceScore);

        setResults(processedResults);
        setStatus('success');

        // Save to history
        saveToHistory({
          trackName: tName || q,
          artistName: aName,
          albumName: albName,
          duration: searchDuration ? searchDuration.toString() : '',
          timestamp: Date.now(),
        });
      } else {
        setStatus('not-found');
      }
    } catch (error) {
      console.error("Search failed", error);
      setStatus('not-found');
    }
  };

  const isFormActive = simpleQuery || inputs.trackName || inputs.artistName || inputs.albumName;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in">

      {/* Page Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
          <Music size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Single Track Search</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Find synchronized lyrics for any song instantly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* === Left Column: Search Panel (5 cols) === */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-8">

            {/* Form */}
            <form onSubmit={handleSearch} className="p-6 space-y-5">

              {/* Simple Input */}
              <div className={`relative transition-all duration-300 ${showAdvanced ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Quick Search
                </label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="text"
                    value={simpleQuery}
                    onChange={(e) => setSimpleQuery(e.target.value)}
                    placeholder="Song title and artist..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-base text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                    disabled={showAdvanced}
                  />
                </div>
              </div>

              {/* Advanced Toggle */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${showAdvanced
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400'
                      }`}
                  >
                    <Settings size={12} />
                    Advanced Search
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* Advanced Fields - Grid Layout */}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 fade-in duration-300">

                  {/* Track - Full Width */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1">Track Title</label>
                    <div className="relative">
                      <Music className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={inputs.trackName}
                        onChange={(e) => setInputs({ ...inputs, trackName: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Blinding Lights"
                      />
                    </div>
                  </div>

                  {/* Artist - Full Width */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1">Artist</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={inputs.artistName}
                        onChange={(e) => setInputs({ ...inputs, artistName: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. The Weeknd"
                      />
                    </div>
                  </div>

                  {/* Album */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1">Album</label>
                    <div className="relative">
                      <Disc className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={inputs.albumName}
                        onChange={(e) => setInputs({ ...inputs, albumName: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1">Duration (s)</label>
                    <div className="relative">
                      <Timer className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        type="number"
                        value={inputs.duration}
                        onChange={(e) => setInputs({ ...inputs, duration: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. 204"
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="col-span-2 pt-2 flex gap-4">
                    {(['useTrackName', 'useArtistName'] as const).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={filters[key]}
                            onChange={(e) => setFilters({ ...filters, [key]: e.target.checked })}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:bg-indigo-500 checked:border-indigo-500 transition-all"
                          />
                          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors select-none">
                          Match {key === 'useTrackName' ? 'Title' : 'Artist'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                {isFormActive && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-all"
                    title="Clear"
                  >
                    <Eraser size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98]"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> Searching...
                    </>
                  ) : (
                    <>
                      <Search size={20} /> Search Lyrics
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Recent History - Compact */}
            {searchHistory.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Clock size={12} /> Recent
                  </div>
                  <button onClick={clearHistory} className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors">
                    CLEAR
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => loadFromHistory(item)}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all text-left max-w-full"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {item.trackName || "Unknown Track"}
                        </span>
                        {(item.artistName) && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {item.artistName}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === Right Column: Results (7 cols) === */}
        <div className="lg:col-span-7 space-y-4">

          {/* Empty State */}
          {status === 'idle' && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/30 dark:bg-slate-900/20">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Sparkles className="text-indigo-400 dark:text-slate-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Ready to discover</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Use the search panel to find high-quality, synchronized LRC lyrics for your music collection.
              </p>
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="h-[500px] flex flex-col items-center justify-center rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music size={20} className="text-indigo-500" />
                </div>
              </div>
              <p className="mt-6 text-slate-600 dark:text-slate-400 font-medium animate-pulse">Scanning libraries...</p>
            </div>
          )}

          {/* Not Found State */}
          {status === 'not-found' && (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center shadow-sm">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No lyrics found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                We couldn't find a match. Try simplifying your search terms or checking the spelling.
              </p>
              <button
                onClick={() => setShowAdvanced(true)}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Try Advanced Search options &rarr;
              </button>
            </div>
          )}

          {/* Success State - LIST VIEW */}
          {status === 'success' && results.length > 0 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 fade-in fill-mode-forwards">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Found {results.length} Matches
                </span>
                <span className="text-xs text-slate-500">
                  Best match first
                </span>
              </div>

              {results.map((resultItem, index) => (
                <ResultCard
                  key={resultItem.track.id || index}
                  matchData={resultItem}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SingleSongSearch;
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Eraser, AlertCircle, Clock, X, Music2, User, Disc, Timer, Settings } from 'lucide-react';
import { findBestMatch } from '../services/lrcService';
import { calculateConfidence } from '../services/utils';
import { SearchStrategy, MatchResult } from '../types';
import ResultCard from './ResultCard';

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

const SingleSongSearch: React.FC<Props> = ({ strategy }) => {
  const [inputs, setInputs] = useState({
    trackName: '',
    artistName: '',
    albumName: '',
    duration: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [filters, setFilters] = useState({
    useTrackName: true,
    useArtistName: true,
    useAlbumName: true,
  });

  // Load search history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lrc-search-history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveToHistory = (searchData: SearchHistoryItem) => {
    const newHistory = [searchData, ...searchHistory.filter(
      item => item.trackName !== searchData.trackName || item.artistName !== searchData.artistName
    )].slice(0, 10); // Keep only last 10 unique searches
    setSearchHistory(newHistory);
    localStorage.setItem('lrc-search-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('lrc-search-history');
  };

  const loadFromHistory = (item: SearchHistoryItem) => {
    setInputs({
      trackName: item.trackName,
      artistName: item.artistName,
      albumName: item.albumName,
      duration: item.duration,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: at least one filter must be enabled with corresponding data
    const hasValidFilter = (
      (filters.useTrackName && inputs.trackName) ||
      (filters.useArtistName && inputs.artistName) ||
      (filters.useAlbumName && inputs.albumName)
    );

    if (!hasValidFilter) {
      alert('Please enable at least one filter and fill in the corresponding field.');
      return;
    }

    setLoading(true);
    setSearched(true);
    setResult(null);

    const durationSec = inputs.duration ? parseInt(inputs.duration) : 0;

    // Apply filters to search query
    const track = await findBestMatch(
      filters.useTrackName ? inputs.trackName : '',
      filters.useArtistName ? inputs.artistName : '',
      filters.useAlbumName ? inputs.albumName : '',
      durationSec,
      strategy
    );

    if (track) {
      const matchData = calculateConfidence(
        { trackName: inputs.trackName, artistName: inputs.artistName, duration: durationSec || undefined },
        track
      );
      setResult(matchData);
      // Save to history on successful match
      saveToHistory({
        trackName: inputs.trackName,
        artistName: inputs.artistName,
        albumName: inputs.albumName,
        duration: inputs.duration,
        timestamp: Date.now(),
      });
    }

    setLoading(false);
  };

  const clearForm = () => {
    setInputs({ trackName: '', artistName: '', albumName: '', duration: '' });
    setResult(null);
    setSearched(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Input Form Column */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-24">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white">Track Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter metadata to find lyrics</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {searchHistory.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recent Searches</label>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => loadFromHistory(item)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Clock size={10} />
                      <span className="max-w-[150px] truncate">{item.trackName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="max-w-[100px] truncate">{item.artistName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Track Title *</label>
                <div className="relative">
                  <Music2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={inputs.trackName}
                    onChange={(e) => setInputs({ ...inputs, trackName: e.target.value })}
                    placeholder="e.g. Blinding Lights"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Artist Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={inputs.artistName}
                    onChange={(e) => setInputs({ ...inputs, artistName: e.target.value })}
                    placeholder="e.g. The Weeknd"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Album (Optional)</label>
                <div className="relative">
                  <Disc className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={inputs.albumName}
                    onChange={(e) => setInputs({ ...inputs, albumName: e.target.value })}
                    placeholder="e.g. After Hours"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Duration (Seconds)</label>
                <div className="relative">
                  <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    value={inputs.duration}
                    onChange={(e) => setInputs({ ...inputs, duration: e.target.value })}
                    placeholder="e.g. 200"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Improves match accuracy significantly.</p>
              </div>
            </div>

            {/* Search Filters */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border-2 border-indigo-200 dark:border-indigo-800">
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Settings size={16} />
                Search Filters
              </h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.useTrackName}
                    onChange={(e) => setFilters({ ...filters, useTrackName: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-indigo-300 dark:border-indigo-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Match by Track Title</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.useArtistName}
                    onChange={(e) => setFilters({ ...filters, useArtistName: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-indigo-300 dark:border-indigo-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Match by Artist Name</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.useAlbumName}
                    onChange={(e) => setFilters({ ...filters, useAlbumName: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-indigo-300 dark:border-indigo-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Match by Album</span>
                </label>
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 opacity-90">
                💡 Uncheck filters for broader matching. At least one filter must be active.
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Searching
                  </>
                ) : (
                  <>
                    <Search size={18} /> Search
                  </>
                )}
              </button>

              {(inputs.trackName || inputs.artistName) && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="Clear form"
                >
                  <Eraser size={18} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-4">
          {!searched && !result && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 text-center p-8">
              <Search className="text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Ready to search</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                Enter the track details on the left to instantly retrieve synchronized lyrics.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
              <p className="text-slate-500 animate-pulse">Scanning lyric databases...</p>
            </div>
          )}

          {!loading && searched && !result && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-red-800 dark:text-red-300">No matches found</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  We couldn't find lyrics for this specific track. Try loosening your search criteria by enabling "Fuzzy Search" or checking for typos.
                </p>
              </div>
            </div>
          )}

          {result && <ResultCard match={result} />}
        </div>
      </div>
    </div>
  );
};

export default SingleSongSearch;
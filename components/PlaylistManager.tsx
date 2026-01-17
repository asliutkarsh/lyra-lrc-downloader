import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, RefreshCw, FileJson, ListMusic, CheckCircle2, XCircle, AlertCircle, X, Code, Table, Info, Save, Sparkles, Download, Archive, Settings, Eye, RotateCcw, Check, Key } from 'lucide-react';
import { SearchStrategy, PlaylistEntry } from '../types';
import { parseM3UContent, parseRawPlaylistData } from '../services/geminiService';
import { findBestMatch, searchLyrics } from '../services/lrcService';
import { calculateConfidence, downloadLrc } from '../services/utils';
import { formatFilename, FilenameFormat, filenameFormats, defaultFormat } from '../services/filenameService';
import ConfidenceBadge from './ConfidenceBadge';
import JSZip from 'jszip';

interface Props {
  strategy: SearchStrategy;
}

const PlaylistManager: React.FC<Props> = ({ strategy }) => {
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [filenameFormat, setFilenameFormat] = useState<FilenameFormat>(() => {
    const saved = localStorage.getItem('lyrical_setting_filename_format');
    return filenameFormats.find(f => f.id === saved) || defaultFormat;
  });

  // Helper function to check if Gemini API key exists
  const hasGeminiApiKey = (): boolean => {
    const apiKey = localStorage.getItem('lyrical_setting_gemini_key');
    return !!apiKey && apiKey.trim().length > 0;
  };

  // 2. Update the customAiPrompt state initialization:
  const [customAiPrompt, setCustomAiPrompt] = useState(() => {
    return localStorage.getItem('lyrical_setting_ai_prompt') || '';
  }); const [showFormatSettings, setShowFormatSettings] = useState(false);

  // Error & Recovery State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string>('');
  const [showAiFixOption, setShowAiFixOption] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  // AI Interception State (New)
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);
  const [showAiConfirmation, setShowAiConfirmation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // View Mode State
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [jsonEditorContent, setJsonEditorContent] = useState('');
  const [showJsonInfo, setShowJsonInfo] = useState(false);

  // Manual search modal state
  const [editingEntry, setEditingEntry] = useState<PlaylistEntry | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState<any[]>([]);

  // Session persistence state
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [savedSession, setSavedSession] = useState<PlaylistEntry[] | null>(null);

  // Preview modal state
  const [previewTrack, setPreviewTrack] = useState<PlaylistEntry | null>(null);

  // Queue processing state
  const [queueStatus, setQueueStatus] = useState('');
  const [rateLimitPaused, setRateLimitPaused] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Session persistence - save to localStorage whenever entries change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('playlist-session', JSON.stringify(entries));
    }
  }, [entries]);

  // Check for saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem('playlist-session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session && session.length > 0) {
          setSavedSession(session);
          setShowRestorePrompt(true);
        }
      } catch (e) {
        console.error('Failed to parse saved session:', e);
      }
    }
  }, []);

  // Track name cleaning for auto-retry
  const cleanTrackName = (trackName: string): string => {
    let cleaned = trackName;
    cleaned = cleaned.replace(/\([^)]*\)/g, '').trim();
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '').trim();
    cleaned = cleaned.replace(/-\s*Remastered.*$/gi, '').trim();
    cleaned = cleaned.replace(/-\s*Explicit$/gi, '').trim();
    cleaned = cleaned.replace(/-\s*Radio\s*Edit$/gi, '').trim();
    cleaned = cleaned.replace(/\s+-\s*$/g, '').trim();
    return cleaned;
  };

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setErrorMessage(null);
    setShowAiFixOption(false);
    setShowAiConfirmation(false); // Reset confirmation state
    setViewMode('table');

    try {
      const text = await file.text();
      setRawFileContent(text); // Store for potential AI fix

      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          if (!Array.isArray(json)) {
            setErrorMessage("The JSON file must contain an array of objects at the root level.");
            setShowAiFixOption(true);
          } else {
            const parsed = json.map((item: any) => ({
              id: crypto.randomUUID(),
              trackName: item.trackName || item.title || '',
              artistName: item.artistName || item.artist || '',
              albumName: item.albumName,
              duration: item.duration || 0,
              fileName: item.fileName,
              status: 'pending' as const
            })).filter((item: any) => item.trackName && item.artistName);

            if (parsed.length === 0) {
              setErrorMessage("No valid track objects found. Please ensure objects have 'trackName' and 'artistName' properties.");
              setShowAiFixOption(true);
            } else {
              setEntries(parsed);
            }
          }
        } catch (err) {
          setErrorMessage("Invalid JSON format. There might be a syntax error in your file.");
          setShowAiFixOption(true);
        }
      } else {
        // M3U - Intercept logic here!
        setPendingFileContent(text);
        // Set a helpful default prompt if empty
        if (!customAiPrompt) {
          setCustomAiPrompt("Extract all tracks from this playlist. Return a JSON array. IMPORTANT: Do not truncate the list. Process every single line to ensure no songs are missing.");
        }
        setShowAiConfirmation(true);
        // Note: setIsParsing will be set to false in finally block, which is what we want (stop spinner, show modal)
      }
    } catch (err) {
      setErrorMessage("Failed to read the file. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const executeAiParse = async () => {
    if (!pendingFileContent) return;

    if (!hasGeminiApiKey()) {
      setShowApiKeyPrompt(true);
      return;
    }

    setShowAiConfirmation(false);
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const parsed = await parseM3UContent(pendingFileContent, customAiPrompt, filenameFormat.pattern);

      if (parsed && parsed.length > 0) {
        setEntries(parsed as PlaylistEntry[]);
        setPendingFileContent(null);
      } else {
        setErrorMessage("AI returned no results. Try adjusting the prompt.");
        setShowAiConfirmation(true); // Re-show modal to allow retry
      }
    } catch (error) {
      setErrorMessage("AI Parsing failed. Please try again.");
      setShowAiConfirmation(true);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAiFix = async () => {
    if (!rawFileContent) return;

    if (!hasGeminiApiKey()) {
      setShowApiKeyPrompt(true);
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const parsed = await parseRawPlaylistData(rawFileContent, customAiPrompt, filenameFormat.pattern);

      if (parsed && parsed.length > 0) {
        setEntries(parsed as PlaylistEntry[]);
        setShowAiFixOption(false);
        setShowPromptEditor(false);
      } else {
        setErrorMessage("AI could not extract structured data. Try adjusting your prompt.");
        setShowAiFixOption(true);
      }
    } catch (err) {
      setErrorMessage("AI Fix failed. Check your instructions and try again.");
      setShowAiFixOption(true);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    if (e.target) e.target.value = '';
  };

  const processAll = async () => {
    setIsProcessing(true);
    setRateLimitPaused(false);
    setQueueStatus('');
    if (viewMode === 'json') setViewMode('table');

    abortControllerRef.current = new AbortController();

    const newEntries = [...entries];
    const CONCURRENCY_LIMIT = 3;
    const queue: Promise<void>[] = [];

    const entriesToProcess = selectedIds.size > 0
      ? newEntries.filter((_, idx) => selectedIds.has(newEntries[idx].id))
      : newEntries;

    for (let i = 0; i < newEntries.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;

      if (selectedIds.size > 0 && !selectedIds.has(newEntries[i].id)) continue;
      if (newEntries[i].status === 'found') continue;

      while (queue.length >= CONCURRENCY_LIMIT) {
        if (abortControllerRef.current?.signal.aborted) break;
        await Promise.race(queue);
        queue.splice(queue.findIndex(p => p), 1);
      }

      if (abortControllerRef.current?.signal.aborted) break;

      if (rateLimitPaused) {
        setQueueStatus('Rate limited. Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        setRateLimitPaused(false);
        setQueueStatus('');
      }

      if (abortControllerRef.current?.signal.aborted) break;

      const processEntry = async (index: number) => {
        if (abortControllerRef.current?.signal.aborted) return;

        newEntries[index].status = 'searching';
        setEntries([...newEntries]);

        try {
          let match = await findBestMatch(
            newEntries[index].trackName,
            newEntries[index].artistName,
            newEntries[index].albumName || '',
            newEntries[index].duration || 0,
            strategy
          );

          if (!match) {
            if (abortControllerRef.current?.signal.aborted) return;
            const cleanedTrackName = cleanTrackName(newEntries[index].trackName);
            if (cleanedTrackName !== newEntries[index].trackName) {
              match = await findBestMatch(
                cleanedTrackName,
                newEntries[index].artistName,
                newEntries[index].albumName || '',
                newEntries[index].duration || 0,
                strategy
              );
            }
          }

          if (abortControllerRef.current?.signal.aborted) return;

          if (match) {
            newEntries[index].status = 'found';
            newEntries[index].matchData = calculateConfidence(
              {
                trackName: newEntries[index].trackName,
                artistName: newEntries[index].artistName,
                duration: newEntries[index].duration
              },
              match
            );
          } else {
            newEntries[index].status = 'not_found';
          }
          setEntries([...newEntries]);
        } catch (error: any) {
          if (error?.status === 429 || error?.message?.includes('429')) {
            setRateLimitPaused(true);
            newEntries[index].status = 'pending';
            setEntries([...newEntries]);
          } else {
            newEntries[index].status = 'not_found';
            setEntries([...newEntries]);
          }
        }
      };

      const promise = processEntry(i);
      queue.push(promise);
    }

    await Promise.all(queue);
    setIsProcessing(false);
    setQueueStatus('');
    abortControllerRef.current = null;
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery) return;
    const results = await searchLyrics(manualQuery);
    setManualResults(results);
  };

  const assignManualMatch = (track: any) => {
    if (!editingEntry) return;
    const updated = entries.map(ent => {
      if (ent.id === editingEntry.id) {
        return {
          ...ent,
          status: 'found' as const,
          matchData: calculateConfidence({
            trackName: ent.trackName,
            artistName: ent.artistName
          }, track)
        };
      }
      return ent;
    });
    setEntries(updated);
    setEditingEntry(null);
    setManualResults([]);
    setManualQuery('');
  };

  const restoreSession = () => {
    if (savedSession) {
      setEntries(savedSession);
      setShowRestorePrompt(false);
      setSavedSession(null);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('playlist-session');
    setShowRestorePrompt(false);
    setSavedSession(null);
  };

  const triggerManualReparse = () => {
    setEntries([]);
    setErrorMessage("Manual re-parse requested. Adjust options below.");
    setShowAiFixOption(true);
    setShowPromptEditor(true);
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const downloadSelected = async () => {
    const selectedEntries = entries.filter(entry =>
      selectedIds.has(entry.id) && entry.status === 'found' && entry.matchData
    );

    if (selectedEntries.length === 0) {
      setErrorMessage("No selected tracks with lyrics found to download.");
      return;
    }

    setIsDownloadingAll(true);

    try {
      const zip = new JSZip();

      selectedEntries.forEach((entry) => {
        const content = entry.matchData!.track.syncedLyrics || entry.matchData!.track.plainLyrics || '';
        let filename = entry.fileName || formatFilename(entry.matchData!.track, filenameFormat);
        if (!filename.toLowerCase().endsWith('.lrc')) filename += '.lrc';
        const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
        zip.file(sanitizedFilename, content);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(zipBlob);
      element.download = `lyrics-${selectedEntries.length}-selected.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (error) {
      setErrorMessage("Failed to create zip file. Please try again.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const switchToJson = () => {
    const sanitize = (str: string) => str.replace(/[<>:"/\\|?*]/g, '').trim();
    const editableData = entries.map(({ trackName, artistName, albumName, duration, fileName }) => {
      const exportFileName = fileName || `${sanitize(artistName)} - ${sanitize(trackName)}.lrc`;
      return {
        trackName,
        artistName,
        albumName: albumName || undefined,
        duration: duration || undefined,
        fileName: exportFileName
      };
    });
    setJsonEditorContent(JSON.stringify(editableData, null, 2));
    setViewMode('json');
    setErrorMessage(null);
  };

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonEditorContent);
      if (!Array.isArray(parsed)) {
        setErrorMessage("❌ JSON must be an array of objects at the root level.");
        return;
      }

      const newEntries: PlaylistEntry[] = parsed.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        trackName: item.trackName || item.title || '',
        artistName: item.artistName || item.artist || '',
        albumName: item.albumName,
        duration: item.duration || 0,
        fileName: item.fileName,
        status: item.status || 'pending' as const
      })).filter((item: any) => item.trackName && item.artistName);

      if (newEntries.length === 0) {
        setErrorMessage("⚠️ No valid track objects found. Please ensure objects have 'trackName' and 'artistName' properties.");
        return;
      }

      // Update rawFileContent so AI fix uses this updated JSON
      setRawFileContent(jsonEditorContent);
      setEntries(newEntries);

      const count = newEntries.length;

      if (showJsonEditor) {
        setShowJsonEditor(false);
        setJsonEditorContent('');
      } else {
        setViewMode('table');
      }

      setErrorMessage(`✅ JSON updated successfully! Found ${count} valid tracks. You can use "Fix with AI" if you need further improvements.`);
      setShowAiFixOption(true);
    } catch (e) {
      setErrorMessage("❌ Invalid JSON syntax: " + (e as Error).message);
    }
  };

  const downloadJson = () => {
    try {
      JSON.parse(jsonEditorContent);
      const element = document.createElement('a');
      const file = new Blob([jsonEditorContent], { type: 'application/json' });
      element.href = URL.createObjectURL(file);
      element.download = 'playlist-metadata.json';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      setErrorMessage("Cannot download: Invalid JSON content.");
    }
  };

  const downloadAllLrc = async () => {
    const foundEntries = entries.filter(entry => entry.status === 'found' && entry.matchData);

    if (foundEntries.length === 0) {
      setErrorMessage("No lyrics found to download.");
      return;
    }

    setIsDownloadingAll(true);

    try {
      const zip = new JSZip();
      foundEntries.forEach((entry) => {
        const content = entry.matchData!.track.syncedLyrics || entry.matchData!.track.plainLyrics || '';
        let filename = entry.fileName || formatFilename(entry.matchData!.track, filenameFormat);
        if (!filename.toLowerCase().endsWith('.lrc')) filename += '.lrc';
        const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
        zip.file(sanitizedFilename, content);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(zipBlob);
      element.download = `lyrics-${foundEntries.length}-tracks.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (error) {
      setErrorMessage("Failed to create zip file. Please try again.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const stats = {
    total: entries.length,
    found: entries.filter(e => e.status === 'found').length,
    missing: entries.filter(e => e.status === 'not_found').length
  };

  const progress = stats.total > 0 ? (stats.found + stats.missing) / stats.total * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* Error/Success Message Banner */}
      {errorMessage && (
        <div className={`mb-8 p-6 rounded-2xl animate-slide-up shadow-lg border-2 ${errorMessage.includes('✅')
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
          <div className="flex items-start gap-5">
            <div className={`flex items-start gap-4 flex-1 ${errorMessage.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
              {errorMessage.includes('✅') ? <CheckCircle2 size={24} className="shrink-0 mt-1" /> : <AlertCircle size={24} className="shrink-0 mt-1" />}
              <div>
                <h4 className="font-bold text-lg">{errorMessage.includes('✅') ? 'Success' : 'Notification'}</h4>
                <p className="text-base opacity-90 leading-relaxed mt-1">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setShowAiFixOption(false);
                setShowPromptEditor(false);
              }}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-xl transition-all hover:scale-110 text-red-500"
            >
              <X size={20} />
            </button>
          </div>

          {showAiFixOption && (
            <div className="mt-6 pl-10 space-y-4">
              {showPromptEditor && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-bold text-slate-500 uppercase mb-2">
                    Custom AI Instructions
                  </label>
                  <textarea
                    value={customAiPrompt}
                    onChange={(e) => setCustomAiPrompt(e.target.value)}
                    placeholder="e.g. The 'title' field contains 'Artist - Title'. Please map 'title' directly to the 'fileName' field."
                    className="w-full p-4 text-base bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none min-h-[100px]"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleAiFix}
                  disabled={isParsing}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-5 py-3 rounded-xl text-base font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                >
                  <Sparkles size={18} />
                  {isParsing ? 'Fixing...' : 'Fix with AI'}
                </button>
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="flex items-center gap-2 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-base font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <Settings size={18} />
                  {showPromptEditor ? 'Hide Options' : 'Edit Prompt'}
                </button>
                {rawFileContent && (
                  <button
                    onClick={() => {
                      setJsonEditorContent(rawFileContent);
                      setShowJsonEditor(true);
                      setErrorMessage(null);
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-base font-bold transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Code size={18} />
                    Edit JSON
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Restore Session Prompt */}
      {showRestorePrompt && (
        <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row items-start gap-5 animate-slide-up shadow-lg">
          <div className="flex items-start gap-4 flex-1 text-indigo-600 dark:text-indigo-400">
            <RotateCcw size={24} className="shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-lg">Restore Previous Session?</h4>
              <p className="text-base opacity-90 leading-relaxed mt-1">
                Found a saved playlist with {savedSession?.length || 0} tracks. Would you like to restore it?
              </p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={clearSession}
              className="px-5 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-base transition-all"
            >
              Clear
            </button>
            <button
              onClick={restoreSession}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-base rounded-xl shadow-xl shadow-indigo-500/30 transition-all"
            >
              Restore
            </button>
          </div>
        </div>
      )}

      {/* AI Interception Modal */}
      {showAiConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-up">

            {/* Header */}
            <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Sparkles className="text-indigo-500" size={28} />
                AI Parsing Required
              </h3>
              <p className="text-base text-slate-600 dark:text-slate-400 mt-3">
                M3U files are unstructured. We use AI to extract track data. You can customize the instructions to ensure all tracks are found.
              </p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">

              {/* Warning / Recommendation */}
              <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700/50 rounded-xl flex gap-4">
                <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0" size={24} />
                <div className="text-base">
                  <p className="font-bold text-amber-800 dark:text-amber-300">Recommendation: Use JSON</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-2">
                    For 100% accuracy and instant loading, convert your playlist to the JSON format shown in the FAQ.
                  </p>
                </div>
              </div>

              {/* Prompt Editor */}
              <div className="space-y-3">
                <label className="text-base font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>AI Instructions</span>
                  <span className="text-sm font-normal text-slate-500">Edit this to fix missing songs</span>
                </label>
                <textarea
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  className="w-full h-48 p-4 text-base font-mono bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                  placeholder="Enter instructions for the AI..."
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Tip:</strong> If you have 54 songs but get 25, try adding: <em>"Strictly process ALL lines. Do not stop early."</em>
                </p>
              </div>

            </div>

            {/* Actions */}
            <div className="p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowAiConfirmation(false);
                  setPendingFileContent(null);
                  setRawFileContent('');
                }}
                className="px-5 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-base transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeAiParse}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-base rounded-xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
              >
                <Sparkles size={20} />
                Start Parsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Editor Modal */}
      {/* API Key Request Modal */}
      {showApiKeyPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Sparkles className="text-amber-500" size={28} />
                Enable AI Features?
              </h3>
              <p className="text-base text-slate-600 dark:text-slate-400 mt-3">
                AI can help you parse unstructured playlists (like M3U) and fix extraction issues automatically.
              </p>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-base text-slate-600 dark:text-slate-400">
                To continue, please enter your <strong>Google Gemini API Key</strong>. You can get one for free from Google AI Studio.
              </p>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Gemini API Key</label>
                <div className="relative">
                  <Key size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="paste your key here..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base font-mono"
                  />
                </div>
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-700 underline block text-right font-medium">
                  Get key from AI Studio
                </a>
              </div>
            </div>
            <div className="p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4">
              <button
                onClick={() => setShowApiKeyPrompt(false)}
                className="px-5 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-base font-bold transition-all"
              >
                No, skip AI
              </button>
              <button
                onClick={() => {
                  if (newApiKey.trim()) {
                    localStorage.setItem('lyrical_setting_gemini_key', newApiKey.trim());
                    setShowApiKeyPrompt(false);
                    // Re-trigger the logic if possible, but user usually clicks again anyway.
                    // For now, we just save it.
                    setErrorMessage("✅ API Key saved! You can now use AI features.");
                  }
                }}
                disabled={!newApiKey.trim()}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-base shadow-xl shadow-amber-500/30 transition-all disabled:opacity-50"
              >
                Enable AI Features
              </button>
            </div>
          </div>
        </div>
      )}

      {showJsonEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-up max-h-[95vh] flex flex-col">

            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="text-indigo-500" />
                Edit JSON Content
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Manually edit your JSON file to fix issues. Make sure it's a valid JSON array with track objects.
              </p>

              {/* Status Message inside Modal */}
              {errorMessage && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 animate-fade-in border ${errorMessage.includes('✅')
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}>
                  {errorMessage.includes('✅') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <p className="text-xs font-medium">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
              <textarea
                value={jsonEditorContent}
                onChange={(e) => setJsonEditorContent(e.target.value)}
                className="flex-1 w-full p-4 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none overflow-auto min-h-[500px]"
                spellCheck={false}
              />
              <p className="text-xs text-slate-500 mt-2 shrink-0">
                <strong>Required fields:</strong> <code>trackName</code> and <code>artistName</code>. Optional: <code>albumName</code>, <code>duration</code>, <code>fileName</code>
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowJsonEditor(false);
                  setJsonEditorContent('');
                  setErrorMessage("Upload cancelled. Please upload your file again.");
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyJsonChanges}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Check size={16} />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {entries.length === 0 ? (
        <div
          className={`relative border-3 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer group ${dragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-xl shadow-indigo-500/20'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.info-icon')) return;
            fileInputRef.current?.click();
          }}
        >
          {/* Info Icon in upload area */}
          <div className="absolute top-6 right-6 info-icon">
            <button
              onClick={(e) => { e.stopPropagation(); setShowJsonInfo(!showJsonInfo); }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all hover:scale-110"
              title="View JSON Format"
            >
              <Info size={22} />
            </button>
            {showJsonInfo && (
              <div className="absolute right-0 top-14 w-80 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-6 z-20 text-left animate-fade-in" onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-base">Expected JSON Structure</h4>
                <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-xl text-slate-700 dark:text-slate-300 font-mono overflow-x-auto">
                  {`[
                {
                  "trackName": "Blinding Lights",
                  "artistName": "The Weeknd",
                  "albumName": "After Hours",
                  "duration": 200,
                  "fileName": "01 - Blinding Lights.lrc"
                },
                {
                  "trackName": "Levitating",
                  "artistName": "Dua Lipa"
                }
              ]`}
                </pre>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Upload a JSON file to skip AI parsing.</p>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".m3u,.m3u8,.json"
            onChange={handleFileUpload}
          />
          <div className="flex flex-col items-center gap-6">
            {isParsing ? (
              <div className="p-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-full animate-pulse">
                <Loader2 size={72} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-xl shadow-indigo-500/20 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-indigo-500/30 transition-all duration-300">
                <Upload size={72} className="text-indigo-500" />
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                {isParsing ? 'Analyzing Playlist...' : 'Upload Playlist File'}
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Drag and drop your <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">.m3u</span>, <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">.m3u8</span>, or <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">.json</span> file here
              </p>
            </div>

            <div className="flex gap-6 mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl"><ListMusic size={18} /> M3U Support</span>
              <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl"><FileJson size={18} /> JSON Support</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Header */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-12 text-center md:text-left">
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 mb-2">
                  <ListMusic className="text-slate-500" size={20} />
                  <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Tracks</p>
                </div>
                <p className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">Found</p>
                </div>
                <p className="text-4xl md:text-5xl font-black text-emerald-600 dark:text-emerald-400">{stats.found}</p>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="text-red-500" size={20} />
                  <p className="text-sm text-red-600 dark:text-red-400 uppercase font-bold tracking-wider">Missing</p>
                </div>
                <p className="text-4xl md:text-5xl font-black text-red-600 dark:text-red-400">{stats.missing}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-4 w-full md:w-auto">
              <div className="relative">
                <button
                  onClick={() => setShowFormatSettings(!showFormatSettings)}
                  className="px-5 py-3 rounded-xl text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 font-bold text-base flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <Settings size={20} /> Filename Format
                </button>
                {showFormatSettings && (
                  <div className="absolute right-0 top-full mt-3 w-72 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-10 animate-fade-in overflow-hidden">
                    <div className="p-3">
                      {filenameFormats.map((format) => (
                        <button
                          key={format.id}
                          onClick={() => {
                            setFilenameFormat(format);
                            setShowFormatSettings(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-base font-bold transition-all hover:scale-105 active:scale-95 ${filenameFormat.id === format.id
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                          {format.name}
                          <span className="block text-sm text-slate-500 dark:text-slate-400 font-normal mt-1">
                            {format.pattern}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                {/* NEW: Magic Fix Button (Only show if we have raw content to re-process) */}
                {rawFileContent && entries.length > 0 && (
                  <button
                    onClick={triggerManualReparse}
                    disabled={isProcessing}
                    className="px-4 py-3 text-indigo-600 dark:text-indigo-300 border-2 border-indigo-500/30 bg-transparent hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 hover:border-indigo-500 rounded-xl font-bold text-base flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    title="Re-scan original file with custom AI instructions"
                  >
                    <Sparkles size={18} /> Re-parse
                  </button>
                )}

                <button
                  onClick={() => {
                    setEntries([]);
                    setErrorMessage(null);
                    setRawFileContent('');
                    setViewMode('table');
                  }}
                  disabled={isProcessing || isDownloadingAll}
                  className="px-5 py-3 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-base transition-all hover:scale-105 active:scale-95"
                >
                  Clear List
                </button>
              </div>
              {stats.found > 0 && (
                <button
                  onClick={downloadAllLrc}
                  disabled={isDownloadingAll || isProcessing}
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-7 py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/30 transition-all"
                >
                  {isDownloadingAll ? <Loader2 className="animate-spin" size={20} /> : <Archive size={20} />}
                  {isDownloadingAll ? 'Creating Zip...' : `Download All (${stats.found})`}
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={downloadSelected}
                  disabled={isDownloadingAll || isProcessing}
                  className="flex-1 md:flex-none bg-violet-600 hover:bg-violet-700 active:scale-95 text-white px-7 py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-500/30 transition-all"
                >
                  {isDownloadingAll ? <Loader2 className="animate-spin" size={20} /> : <Archive size={20} />}
                  {isDownloadingAll ? 'Creating Zip...' : `Download Selected (${selectedIds.size})`}
                </button>
              )}
              {isProcessing ? (
                <button
                  onClick={cancelProcessing}
                  className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 active:scale-95 text-white px-7 py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-red-500/30 transition-all"
                >
                  <X size={20} />
                  Cancel
                </button>
              ) : (
                <button
                  onClick={processAll}
                  disabled={isDownloadingAll || stats.total === stats.found}
                  className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-7 py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/30 transition-all"
                >
                  <RefreshCw size={20} />
                  {selectedIds.size > 0 ? `Find Lyrics (${selectedIds.size} Selected)` : 'Find Lyrics (All)'}
                </button>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex justify-between items-end mb-2 px-1">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
              {viewMode === 'table' ? 'Playlist Tracks' : 'JSON Editor'}
            </h3>
            <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'table' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Table size={14} /> Modern
              </button>
              <button
                onClick={switchToJson}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'json' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Code size={14} /> JSON
              </button>
            </div>
          </div>

          {/* Progress Bar (Only show in table mode or if processing) */}
          {isProcessing && (
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-6 overflow-hidden animate-fade-in">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          {/* Queue Status */}
          {queueStatus && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3 animate-fade-in">
              <Loader2 size={16} className="text-amber-600 dark:text-amber-400 animate-spin" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{queueStatus}</span>
            </div>
          )}

          {/* Content Area */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden min-h-[400px]">

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 uppercase text-sm font-black tracking-wider">
                    <tr>
                      <th className="px-6 py-5 w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === entries.length && entries.length > 0}
                          onChange={toggleSelectAll}
                          className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-800 cursor-pointer"
                        />
                      </th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Track</th>
                      <th className="px-8 py-5">Artist</th>
                      <th className="px-8 py-5">Match</th>
                      <th className="px-8 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all hover:scale-[1.01]">
                        <td className="px-6 py-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelection(entry.id)}
                            className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-800 cursor-pointer"
                          />
                        </td>
                        <td className="px-8 py-5">
                          {entry.status === 'pending' && <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>}
                          {entry.status === 'searching' && <Loader2 size={20} className="text-indigo-500 animate-spin" />}
                          {entry.status === 'found' && <CheckCircle2 size={20} className="text-emerald-500" />}
                          {entry.status === 'not_found' && <XCircle size={20} className="text-red-500" />}
                        </td>
                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">{entry.trackName}</td>
                        <td className="px-8 py-5 text-slate-600 dark:text-slate-400">{entry.artistName}</td>
                        <td className="px-8 py-5">
                          {entry.matchData && (
                            <ConfidenceBadge score={entry.matchData.confidenceScore} reasons={[]} />
                          )}
                        </td>
                        <td className="px-8 py-5 text-right flex justify-end gap-3">
                          {entry.matchData ? (
                            <>
                              <button
                                onClick={() => setPreviewTrack(entry)}
                                className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all hover:scale-110"
                                title="Preview Lyrics"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  const filename = formatFilename(entry.matchData!.track, filenameFormat);
                                  const content = entry.matchData!.track.syncedLyrics || entry.matchData!.track.plainLyrics;
                                  downloadLrc(filename, content);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all hover:scale-105 active:scale-95"
                              >
                                <FileText size={16} /> LRC
                              </button>
                            </>
                          ) : (
                            entry.status === 'not_found' && (
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
                                  setManualQuery(`${entry.trackName} ${entry.artistName}`);
                                }}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-bold px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                              >
                                Fix
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entries.length === 0 && <div className="text-center py-20 text-slate-400">No entries loaded</div>}
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-[400px]">
                <div className="flex-1 relative">
                  <textarea
                    value={jsonEditorContent}
                    onChange={(e) => setJsonEditorContent(e.target.value)}
                    className="w-full h-full p-6 bg-slate-50 dark:bg-slate-900 font-mono text-sm text-slate-800 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 inset-0 absolute"
                    spellCheck={false}
                  />
                </div>
                <div className="border-t-2 border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4 items-center">
                  <button
                    onClick={downloadJson}
                    className="mr-auto text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 flex items-center gap-2 text-base font-bold px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl"
                    title="Download current JSON"
                  >
                    <Download size={20} /> <span className="hidden sm:inline">Download JSON</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className="px-5 py-3 text-slate-600 dark:text-slate-400 font-bold text-base hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyJsonChanges}
                    className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-base rounded-xl flex items-center gap-2 shadow-xl shadow-indigo-500/30 transition-all"
                  >
                    <Save size={20} /> Apply Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Manual Search Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Manual Search</h3>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-3xl leading-none p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">&times;</button>
            </div>
            <div className="p-8">
              <p className="text-base text-slate-600 dark:text-slate-400 mb-5">Finding match for: <span className="font-bold text-slate-900 dark:text-white">{editingEntry.trackName}</span></p>
              <form onSubmit={handleManualSearch} className="flex gap-4 mb-8">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-5 py-3 text-base text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Search keywords..."
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-7 py-3 rounded-xl text-white font-black text-base transition-all shadow-xl shadow-indigo-500/30">Search</button>
              </form>

              <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                {manualResults.map((res: any) => (
                  <div key={res.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.02] transition-all">
                    <div className="text-base">
                      <div className="text-slate-900 dark:text-white font-bold">{res.trackName}</div>
                      <div className="text-slate-600 dark:text-slate-400">{res.artistName}</div>
                    </div>
                    <button
                      onClick={() => assignManualMatch(res)}
                      className="text-sm bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                      Select
                    </button>
                  </div>
                ))}
                {manualResults.length === 0 && <div className="text-center py-12 text-slate-400 text-base">No results found yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTrack && previewTrack.matchData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{previewTrack.trackName}</h3>
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1">{previewTrack.artistName}</p>
              </div>
              <button onClick={() => setPreviewTrack(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-0 bg-slate-900 overflow-auto max-h-[60vh]">
              <pre className="p-8 text-slate-300 font-mono text-base whitespace-pre-wrap leading-relaxed">
                {previewTrack.matchData.track.syncedLyrics || previewTrack.matchData.track.plainLyrics || "No text available."}
              </pre>
            </div>

            <div className="p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewTrack(null)}
                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold text-base hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistManager;
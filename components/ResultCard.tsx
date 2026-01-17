import React, { useState } from 'react';
import { LrcLibTrack, MatchResult } from '../types';
import { Download, Music, Clock, Mic2, Settings2, FileCode, Copy, Check } from 'lucide-react';
import { downloadLrc } from '../services/utils';
import { formatFilename, FilenameFormat } from '../services/filenameService';
import ConfidenceBadge from './ConfidenceBadge';
import KaraokeModal from './KaraokeModal';

interface ResultCardProps {
  match: MatchResult;
  filenameFormat?: FilenameFormat;
}

const ResultCard: React.FC<ResultCardProps> = ({ match, filenameFormat }) => {
  const { track, confidenceScore, confidenceReasons } = match;
  const [offset, setOffset] = useState(0);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedType, setCopiedType] = useState<'synced' | 'plain' | null>(null);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleDownload = () => {
    let content = track.syncedLyrics || track.plainLyrics;
    
    if (offset !== 0 && track.syncedLyrics) {
       content = `[offset:${offset * 1000}]\n` + content;
    }

    if (content) {
      const filename = formatFilename(track, filenameFormat);
      downloadLrc(filename, content);
    } else {
      alert("No lyrics content available to download.");
    }
  };

  const handleCopy = (type: 'synced' | 'plain') => {
    let content = type === 'synced' ? track.syncedLyrics : track.plainLyrics;
    
    if (!content) {
      alert(`No ${type === 'synced' ? 'synced' : 'plain'} lyrics available to copy.`);
      return;
    }

    navigator.clipboard.writeText(content).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      alert('Failed to copy to clipboard.');
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg animate-slide-up">
        {/* Header Section */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
            <Music size={32} strokeWidth={1.5} />
          </div>

          <div className="flex-1 space-y-2 z-10">
            <div className="flex items-start justify-between gap-4">
               <div>
                  <h3 className="font-bold text-2xl text-slate-900 dark:text-white leading-tight tracking-tight">{track.trackName}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">{track.artistName}</p>
               </div>
               <ConfidenceBadge score={confidenceScore} reasons={confidenceReasons} />
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-md">
                <Clock size={14} /> {formatTime(track.duration)}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-md">
                 <FileCode size={14} /> {track.id}
              </span>
              <span>{track.albumName}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          
          <div className="flex items-center gap-4 w-full sm:w-auto bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
             <Settings2 size={16} className="text-slate-400" />
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Offset (s):</label>
             <input 
               type="range" 
               min="-5" max="5" step="0.5" 
               value={offset} 
               onChange={(e) => setOffset(parseFloat(e.target.value))}
               className="w-24 accent-indigo-600"
             />
             <span className="text-sm font-mono font-medium text-indigo-600 w-8 text-right">{offset > 0 ? '+' : ''}{offset}</span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
             {track.syncedLyrics && (
                <>
                  <button 
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium text-sm transition-colors"
                  >
                    {showPreview ? 'Hide Text' : 'View Text'}
                  </button>
                  <button 
                    onClick={() => setShowKaraoke(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mic2 size={16} /> Preview
                  </button>
                </>
             )}
             {track.syncedLyrics && (
               <button
                 onClick={() => handleCopy('synced')}
                 className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                 title="Copy synced lyrics"
               >
                 {copiedType === 'synced' ? <Check size={16} /> : <Copy size={16} />}
                 {copiedType === 'synced' ? 'Copied!' : 'Copy LRC'}
               </button>
             )}
             {track.plainLyrics && (
               <button
                 onClick={() => handleCopy('plain')}
                 className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                 title="Copy plain lyrics"
               >
                 {copiedType === 'plain' ? <Check size={16} /> : <Copy size={16} />}
                 {copiedType === 'plain' ? 'Copied!' : 'Copy Text'}
               </button>
             )}
             <button
                onClick={handleDownload}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
             >
                <Download size={16} /> Download
             </button>
          </div>
        </div>

        {/* Text Preview Area */}
        {showPreview && track.syncedLyrics && (
           <div className="bg-slate-900 text-slate-300 p-6 font-mono text-sm overflow-x-auto border-t border-slate-700 max-h-80 shadow-inner">
             <pre className="whitespace-pre-wrap">{track.syncedLyrics}</pre>
           </div>
        )}
      </div>

      <KaraokeModal 
        isOpen={showKaraoke} 
        onClose={() => setShowKaraoke(false)} 
        title={track.trackName}
        artist={track.artistName}
        syncedLyrics={track.syncedLyrics}
        offset={offset}
      />
    </>
  );
};

export default ResultCard;
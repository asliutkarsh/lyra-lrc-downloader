import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, FastForward } from 'lucide-react';

interface KaraokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  artist: string;
  syncedLyrics: string;
  offset: number;
}

interface LyricLine {
  time: number;
  text: string;
}

const parseLyrics = (lrc: string): LyricLine[] => {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
      const time = min * 60 + sec + ms / 1000;
      result.push({ time, text: match[4].trim() });
    }
  });
  return result;
};

const KaraokeModal: React.FC<KaraokeModalProps> = ({ isOpen, onClose, title, artist, syncedLyrics, offset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (syncedLyrics) {
      setParsedLyrics(parseLyrics(syncedLyrics));
    }
  }, [syncedLyrics]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const activeIndex = parsedLyrics.findIndex(line => line.time + offset > currentTime);
      const targetIndex = activeIndex === -1 ? parsedLyrics.length - 1 : Math.max(0, activeIndex - 1);
      
      const element = scrollRef.current.children[targetIndex] as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, parsedLyrics, offset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-[80vh] bg-slate-900 rounded-2xl flex flex-col relative border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 z-10">
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-indigo-400 text-sm font-medium">{artist}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Lyrics Display */}
        <div className="flex-1 overflow-y-auto p-8 relative scroll-smooth" ref={scrollRef}>
           <div className="space-y-8 text-center min-h-full flex flex-col justify-center py-20">
             {parsedLyrics.length > 0 ? parsedLyrics.map((line, idx) => {
               const isActive = currentTime >= (line.time + offset) && 
                                (idx === parsedLyrics.length - 1 || currentTime < (parsedLyrics[idx+1].time + offset));
               
               const isPast = currentTime > (line.time + offset);

               return (
                 <p 
                   key={idx} 
                   className={`transition-all duration-300 text-2xl font-bold leading-relaxed px-4 rounded-xl py-2 cursor-pointer ${
                     isActive 
                       ? 'text-white scale-110 bg-indigo-500/10 blur-none' 
                       : isPast 
                         ? 'text-slate-600 blur-[1px]' 
                         : 'text-slate-700 blur-[2px]'
                   }`}
                   onClick={() => setCurrentTime(line.time + offset)}
                 >
                   {line.text || "♪"}
                 </p>
               );
             }) : (
               <p className="text-slate-500">Lyrics parse error or empty.</p>
             )}
           </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/95 flex flex-col items-center gap-4">
           <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-100 ease-linear" 
                style={{ width: `${Math.min(100, (currentTime / (parsedLyrics[parsedLyrics.length-1]?.time + 10 || 200)) * 100)}%`}}
              />
           </div>
           
           <div className="flex items-center gap-6">
             <button 
               className="text-slate-400 hover:text-white transition-colors text-xs font-mono"
               onClick={() => setCurrentTime(0)}
             >
               00:00
             </button>

             <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 transition-transform active:scale-95"
             >
               {isPlaying ? <Pause fill="white" /> : <Play fill="white" className="ml-1" />}
             </button>

             <div className="text-slate-400 text-xs font-mono w-12 text-right">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
             </div>
           </div>
           
           <p className="text-xs text-slate-500">
             Simulation Only (No Audio Source) • Offset Applied: {offset > 0 ? '+' : ''}{offset}s
           </p>
        </div>
      </div>
    </div>
  );
};

export default KaraokeModal;
import React, { useState } from 'react';
import { HelpCircle, FileJson, Music2, Search, Upload, Archive, Copy, Eye, RotateCcw, Settings, Zap, ChevronDown } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  icon: React.ElementType;
  iconColor: string;
  content: React.ReactNode;
}

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['what-is-lrc']));

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const faqItems: FAQItem[] = [
    {
      id: 'what-is-lrc',
      question: 'What is an .LRC file?',
      icon: Music2,
      iconColor: 'text-indigo-500',
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
          LRC is a computer file format that synchronizes song lyrics with an audio file, such as MP3, Vorbis, or MIDI. When an audio file is played with certain music players on a computer or on modern digital audio players, the song lyrics are displayed time-synced with the music.
        </p>
      )
    },
    {
      id: 'playlist-import',
      question: 'How does Playlist Import work?',
      icon: Upload,
      iconColor: 'text-violet-500',
      content: (
        <>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 text-base">
            You can upload an <strong>.m3u/.m3u8</strong> playlist file or a <strong>.json</strong> file.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 text-base">
            <li>For <strong>M3U</strong> files, we use AI to analyze the filenames and extract metadata (Artist, Title).</li>
            <li>For <strong>JSON</strong> files, we read the structured data directly.</li>
          </ul>
        </>
      )
    },
    {
      id: 'download-all',
      question: 'How do I download all lyrics at once?',
      icon: Archive,
      iconColor: 'text-emerald-500',
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
          After processing your playlist, a <strong>"Download All"</strong> button will appear. Click it to download a ZIP file containing all the .lrc files for the tracks that were found. This is perfect for bulk downloads of large playlists.
        </p>
      )
    },
    {
      id: 'filename-format',
      question: 'Can I customize the filename format?',
      icon: Settings,
      iconColor: 'text-indigo-500',
      content: (
        <>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 text-base">
            Yes! Click the <strong>"Filename Format"</strong> button in Playlist Manager to choose from multiple formats:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 text-base">
            <li><strong>Artist - Title</strong> (default)</li>
            <li><strong>Title Only</strong></li>
            <li><strong>Artist - Album - Title</strong></li>
            <li><strong>Title - Artist</strong></li>
          </ul>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm">
            You can also specify custom filenames in your JSON file using the <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">fileName</code> field for perfect file matching.
          </p>
        </>
      )
    },
    {
      id: 'copy-lyrics',
      question: 'Can I copy lyrics instead of downloading?',
      icon: Copy,
      iconColor: 'text-blue-500',
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
          Yes! In the result card, you'll find <strong>"Copy LRC"</strong> and <strong>"Copy Text"</strong> buttons. These allow you to copy synced lyrics (with timestamps) or plain text lyrics directly to your clipboard for pasting into ID3 tags or other applications.
        </p>
      )
    },
    {
      id: 'session-restore',
      question: 'Will I lose my work if I refresh?',
      icon: RotateCcw,
      iconColor: 'text-cyan-500',
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
          No! We automatically save your playlist progress to your browser's local storage. If you accidentally refresh or close the tab, you'll see a prompt to restore your previous session when you return.
        </p>
      )
    },
    {
      id: 'track-not-found',
      question: 'What if a track isn\'t found?',
      icon: Zap,
      iconColor: 'text-amber-500',
      content: (
        <>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 text-base">
            We automatically retry with cleaned track names by removing:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 text-base">
            <li>Parenthetical content like <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">(feat. ...)</code></li>
            <li><strong>"Remastered"</strong> and <strong>"Explicit"</strong> tags</li>
            <li><strong>"Radio Edit"</strong> variations</li>
          </ul>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm">
            This significantly reduces the number of tracks that need manual fixing.
          </p>
        </>
      )
    },
    {
      id: 'preview-lyrics',
      question: 'Can I preview lyrics before downloading?',
      icon: Eye,
      iconColor: 'text-purple-500',
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
          Yes! In the Playlist Manager table, click the <strong>eye icon</strong> next to any found track to preview the lyrics in a modal. This lets you verify the lyrics are correct before committing to the bulk download.
        </p>
      )
    },
    {
      id: 'json-format',
      question: 'Expected JSON Format',
      icon: FileJson,
      iconColor: 'text-emerald-500',
      content: (
        <>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 text-base">
            If you want to prepare your own playlist data or edit the JSON view, please follow this structure. The root element must be an array.
          </p>
          <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto border-2 border-slate-700">
            <pre className="text-sm text-emerald-400 font-mono">
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
          </div>
          <div className="mt-4 space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <p>* <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">duration</code> is in seconds and is optional but recommended for better accuracy.</p>
            <p>* <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">fileName</code> is optional and allows you to specify custom filenames for downloads.</p>
          </div>
        </>
      )
    },
    {
      id: 'lyrics-not-found',
      question: 'Why are some lyrics not found?',
      icon: Search,
      iconColor: 'text-pink-500',
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
          We rely on LRCLIB's database. If a song is very new or niche, it might not be available yet. You can use the <strong>"Fix"</strong> button to manually search for alternative matches, or enable "Fuzzy Search" in the settings for more lenient matching.
        </p>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 animate-fade-in space-y-8 mb-12 px-4">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">Everything you need to know about Lyrical</p>
      </div>

      <div className="space-y-4">
        {faqItems.map((item) => {
          const Icon = item.icon;
          const isOpen = openItems.has(item.id);

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${item.iconColor}`}>
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                    {item.question}
                  </h3>
                </div>
                <ChevronDown
                  size={24}
                  className={`text-slate-400 transition-transform duration-300 shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="px-6 pb-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {item.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
export interface LrcLibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
}

export interface PlaylistEntry {
  id: string; // Internal UUID
  rawString?: string; // Original line from m3u
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  status: 'pending' | 'searching' | 'found' | 'not_found' | 'error';
  matchData?: MatchResult;
  fileName?: string; // Optional custom filename for downloads
}

export interface MatchResult {
  track: LrcLibTrack;
  confidenceScore: number;
  confidenceReasons: string[];
}

export enum SearchMode {
  EXACT = 'EXACT',
  FUZZY = 'FUZZY',
  CACHED = 'CACHED'
}

export interface SearchStrategy {
  mode: SearchMode;
  tryExternal: boolean; // If true, uses /api/get (slower), else /api/get-cached
}

export interface ConfidenceConfig {
  titleWeight: number;
  artistWeight: number;
  durationWeight: number;
}

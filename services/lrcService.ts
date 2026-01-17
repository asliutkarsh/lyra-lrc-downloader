import { LrcLibTrack, SearchStrategy, SearchMode } from '../types';

const BASE_URL = 'https://lrclib.net/api';

export const getLyrics = async (
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number,
  strategy: SearchStrategy
): Promise<LrcLibTrack | null> => {
  try {
    const endpoint = strategy.tryExternal ? '/get' : '/get-cached';
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      duration: duration.toString(),
    });

    if (albumName) params.append('album_name', albumName);

    const response = await fetch(`${BASE_URL}${endpoint}?${params.toString()}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Network response was not ok');

    return await response.json();
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
};

export const searchLyrics = async (
  query: string,
  trackName?: string,
  artistName?: string,
  albumName?: string
): Promise<LrcLibTrack[]> => {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (trackName) params.append('track_name', trackName);
    if (artistName) params.append('artist_name', artistName);
    if (albumName) params.append('album_name', albumName);

    const response = await fetch(`${BASE_URL}/search?${params.toString()}`);
    if (!response.ok) throw new Error('Search failed');

    return await response.json();
  } catch (error) {
    console.error('Error searching lyrics:', error);
    return [];
  }
};

export const findBestMatch = async (
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number,
  strategy: SearchStrategy
): Promise<LrcLibTrack | null> => {

  // 1. Try Exact/Cached Get first if requested
  if (strategy.mode === SearchMode.EXACT || strategy.mode === SearchMode.CACHED) {
    const directResult = await getLyrics(trackName, artistName, albumName, duration, strategy);
    if (directResult) return directResult;
  }

  // 2. If Exact failed or mode is Fuzzy, try Search
  if (strategy.mode === SearchMode.FUZZY || (strategy.mode === SearchMode.EXACT && !strategy.tryExternal)) {
    // Only search if we didn't just try a hard get or if we want to fallback
    const results = await searchLyrics('', trackName, artistName, albumName);

    // Simple filter for fuzzy match if we have results
    if (results.length > 0) {
      // Return the first one for now, or use our confidence score utility to sort them later
      return results[0];
    }
  }

  return null;
};

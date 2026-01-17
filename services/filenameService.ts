import { LrcLibTrack } from '../types';

export interface FilenameFormat {
    id: string;
    name: string;
    pattern: string;
}

export const filenameFormats: FilenameFormat[] = [
    {
        id: 'artist-title',
        name: 'Artist - Title',
        pattern: '{Artist} - {Title}'
    },
    {
        id: 'title',
        name: 'Title Only',
        pattern: '{Title}'
    },
    {
        id: 'artist-album-title',
        name: 'Artist - Album - Title',
        pattern: '{Artist} - {Album} - {Title}'
    },
    {
        id: 'title-artist',
        name: 'Title - Artist',
        pattern: '{Title} - {Artist}'
    }
];

export const defaultFormat = filenameFormats[0];

export const formatFilename = (track: LrcLibTrack, format: FilenameFormat = defaultFormat): string => {
    let filename = format.pattern;

    // Replace placeholders with actual values
    filename = filename.replace(/{Title}/g, track.trackName);
    filename = filename.replace(/{Artist}/g, track.artistName);
    filename = filename.replace(/{Album}/g, track.albumName || '');

    // Clean up the filename
    filename = filename
        .replace(/\s+-\s+$/g, '') // Remove trailing " - "
        .replace(/^\s+-\s+/g, '') // Remove leading " - "
        .replace(/\s+-\s+-\s+/g, ' - ') // Fix double separators
        .trim();

    // Sanitize filename for filesystem
    const sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');

    // Add .lrc extension
    return sanitized + '.lrc';
};
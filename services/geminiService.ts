import { GoogleGenAI, Type } from '@google/genai';
import { PlaylistEntry } from '../types';

// Get API key from localStorage or fallback to env variable
const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('lyrical_setting_gemini_key');
    if (storedKey) return storedKey;
  }
};

// Initialize Gemini with dynamic API key
let ai: GoogleGenAI | null = null;

const getGeminiClient = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = getApiKey();
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const parseM3UContent = async (content: string, customAiPrompt: string, fileNamePattern?: string): Promise<Partial<PlaylistEntry>[]> => {
  const lines = content.split(/\r?\n/).filter(line => line.trim().startsWith('#EXTINF') || (line.trim().length > 0 && !line.startsWith('#')));

  // We will take a subset if the file is huge for this demo, 
  // but let's process reasonable chunks.
  // For the prompt, we want Gemini to extract structured data.

  // Limit for demo purposes to avoid huge token usage if user uploads a 1000 song list
  // In a real app, we'd batch this.
  const sampleLines = lines.slice(0, 50).join('\n');

  let prompt = `
    Analyze the following lines from an M3U playlist file. 
    Each song usually has an #EXTINF line followed by a filename.
    Extract the Artist Name, Track Name, and Duration (in seconds) if available.
    If the artist and track are combined (e.g. "Artist - Track"), separate them.
    Ignore file paths unless they contain the song title.
    
    Return a JSON array of objects with keys: trackName, artistName, duration (number), fileName (string).
    
    ${fileNamePattern ? `IMPORTANT: Set the 'fileName' field for each track using this pattern: "${fileNamePattern}". Replace {artist} and {title} with the actual artist and track names. Ensure it ends with .lrc` : ''}

    Input Data:
    ${sampleLines}
  `;

  if (customAiPrompt) {
    prompt += `\n\nIMPORTANT USER INSTRUCTION: ${customAiPrompt}`;
  }


  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              trackName: { type: Type.STRING },
              artistName: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              fileName: { type: Type.STRING },
            },
            required: ['trackName', 'artistName'],
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return parsed.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      status: 'pending'
    }));

  } catch (error) {
    console.error("Gemini parsing failed:", error);
    // Fallback: Return empty or handle error gracefully
    return [];
  }
};

export const parseRawPlaylistData = async (content: string, customInstruction?: string, fileNamePattern?: string): Promise<Partial<PlaylistEntry>[]> => {
  // Truncate overly large files for the context window if necessary, though Gemini handles large context well.
  // Keeping it reasonable for latency.
  const sampleContent = content.slice(0, 15000);

  let prompt = `
    The following text contains music playlist data. It might be malformed JSON, a simple text list, or a mix of data.
    Identify all songs listed and extract the Metadata.
    
    Return a STRICT JSON array of objects with these keys: 
    - trackName (string, required)
    - artistName (string, required)
    - albumName (string, optional)
    - duration (number, optional, in seconds)
    - fileName (string, optional)

    ${fileNamePattern ? `IMPORTANT: If generating a 'fileName', use this pattern: "${fileNamePattern}". Replace {artist} and {title} with the actual artist and track names. Ensure it ends with .lrc` : ''}

    Input Data:
    ${sampleContent}
  `;

  // Append user instructions if they exist
  if (customInstruction) {
    prompt += `\n\nIMPORTANT USER INSTRUCTION: ${customInstruction}`;
  }

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              trackName: { type: Type.STRING },
              artistName: { type: Type.STRING },
              albumName: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              fileName: { type: Type.STRING },
            },
            required: ['trackName', 'artistName'],
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return parsed.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      status: 'pending'
    }));

  } catch (error) {
    console.error("Gemini raw parsing failed:", error);
    return [];
  }
};
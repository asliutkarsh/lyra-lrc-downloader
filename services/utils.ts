import { LrcLibTrack, MatchResult, ConfidenceConfig } from '../types';

// Levenshtein distance for string similarity
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  let i;
  let j;

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const calculateSimilarity = (s1: string, s2: string): number => {
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())) / longer.length;
};

export const calculateConfidence = (
  query: { trackName: string; artistName: string; duration?: number },
  result: LrcLibTrack
): MatchResult => {
  const config: ConfidenceConfig = {
    titleWeight: 0.5,
    artistWeight: 0.3,
    durationWeight: 0.2,
  };

  const reasons: string[] = [];
  
  // 1. Title Similarity
  const titleSim = calculateSimilarity(query.trackName, result.trackName);
  let score = titleSim * config.titleWeight;
  if (titleSim > 0.9) reasons.push('Title is an exact or near-exact match.');
  else if (titleSim > 0.7) reasons.push('Title is a close match.');
  else reasons.push(`Title mismatch detected (${Math.round(titleSim * 100)}% match).`);

  // 2. Artist Similarity
  const artistSim = calculateSimilarity(query.artistName, result.artistName);
  score += artistSim * config.artistWeight;
  if (artistSim > 0.9) reasons.push('Artist match confirmed.');
  else if (artistSim > 0.5) reasons.push('Artist name is similar.');
  else reasons.push('Artist name differs significantly.');

  // 3. Duration Delta
  if (query.duration && result.duration) {
    const delta = Math.abs(query.duration - result.duration);
    // Exponential decay for duration penalty
    const durationScore = Math.max(0, 1 - (delta / 10)); // Lose 10% per second difference roughly
    score += durationScore * config.durationWeight;
    
    if (delta <= 2) reasons.push(`Duration matches perfectly (±${delta}s).`);
    else if (delta <= 5) reasons.push(`Duration is close (±${delta}s).`);
    else reasons.push(`Significant duration difference (${delta}s).`);
  } else {
    // If no duration provided, redistribute weight
    const remainingWeight = config.titleWeight + config.artistWeight;
    score = (titleSim * config.titleWeight + artistSim * config.artistWeight) / remainingWeight;
    reasons.push('Duration comparison skipped (missing data).');
  }

  return {
    track: result,
    confidenceScore: Math.min(1, Math.max(0, score)),
    confidenceReasons: reasons,
  };
};

export const downloadLrc = (filename: string, content: string) => {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename.endsWith('.lrc') ? filename : `${filename}.lrc`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
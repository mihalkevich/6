/**
 * Image Presets types for NanaBanana photo generation
 *
 * Each preset contains 6-10 author-curated prompts
 * designed for girls' photo sessions.
 */

export type PresetCategory =
  | 'princess'
  | 'nature'
  | 'fairy_tale'
  | 'fashion'
  | 'seasons'
  | 'animals'
  | 'space'
  | 'underwater';

export type PresetDifficulty = 'easy' | 'medium' | 'creative';

export interface ImagePrompt {
  id: string;
  /** The generation prompt (author-written) */
  prompt: string;
  /** Russian translation */
  promptRu: string;
  /** Negative prompt for better quality */
  negativePrompt?: string;
  /** Style tags */
  styleTags: string[];
  /** Suggested pose or composition hint */
  poseHint?: string;
  poseHintRu?: string;
  /** Display order within the preset */
  order: number;
}

export interface ImagePreset {
  id: string;
  /** Preset name */
  name: string;
  nameRu: string;
  /** Short description */
  description: string;
  descriptionRu: string;
  /** Category */
  category: PresetCategory;
  /** Cover emoji for display */
  emoji: string;
  /** Accent color */
  accentColor: string;
  /** Author of this preset */
  author: string;
  /** Difficulty / creativity level */
  difficulty: PresetDifficulty;
  /** Number of photos in this session (6-10) */
  photoCount: number;
  /** The curated prompts */
  prompts: ImagePrompt[];
  /** Whether this preset is premium */
  isPremium: boolean;
  /** Tags for search/filter */
  tags: string[];
  /** Age recommendation */
  ageMin: number;
  ageMax: number;
}

export interface PhotoSessionState {
  presetId: string;
  startedAt: string;
  currentPromptIndex: number;
  completedPromptIds: string[];
  /** Generated image URIs (placeholder for actual generation) */
  generatedImages: Record<string, string>;
  isComplete: boolean;
}

export interface ImagePresetsStore {
  /** All available presets */
  presets: ImagePreset[];
  /** Active photo session */
  activeSession: PhotoSessionState | null;
  /** Completed session history */
  completedSessions: PhotoSessionState[];
  /** Favorite preset IDs */
  favoritePresetIds: string[];
}

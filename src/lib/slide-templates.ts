export type SlideTemplate = 'information' | 'open-text' | 'multiple-choice' | 'rating' | 'drawing' | 'end-game' | 'slider' | 'text-card';

export interface SlideTemplateConfig {
  id: SlideTemplate;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

export const SLIDE_TEMPLATES: SlideTemplateConfig[] = [
  {
    id: 'information',
    label: 'Information',
    description: 'Show text/media — players see a "Get Ready" screen',
    icon: 'Info',
  },
  {
    id: 'text-card',
    label: 'Text Card',
    description: 'Focused text slide with game elements (buzzer, points)',
    icon: 'Type',
  },
  {
    id: 'open-text',
    label: 'Open Text',
    description: 'Show a prompt — players type a text answer',
    icon: 'MessageSquare',
  },
  {
    id: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Show a question — players pick A/B/C/D',
    icon: 'CheckSquare',
  },
  {
    id: 'slider',
    label: 'Slider',
    description: 'Players pick a value on a numeric range',
    icon: 'SlidersHorizontal',
  },
  {
    id: 'rating',
    label: 'Rating / Scale',
    description: 'Show a statement — players use a star rating (1-10)',
    icon: 'Star',
  },
  {
    id: 'drawing',
    label: 'Drawing',
    description: 'Show a prompt — players draw on a canvas',
    icon: 'Pencil',
  },
  {
    id: 'end-game',
    label: 'End Game',
    description: 'Show an end game screen with an optional scoreboard',
    icon: 'Trophy',
  },
];

export type AnswerVisibility =
  | { mode: 'host-only' }
  | { mode: 'fastest'; count: number }
  | { mode: 'all-anonymous' }
  | { mode: 'all-named' };

export interface SlideContent {
  template: SlideTemplate;
  title: string;
  slideName?: string; // custom display name for sidebar
  body?: string;
  mediaUrl?: string;
  options?: string[]; // for multiple-choice
  correctOptionIndex?: number;
  buzzerEnabled?: boolean;
  buzzerMode?: 'first' | 'all';
  answerVisibility?: AnswerVisibility;
  showScoreboard?: boolean;
  scoreboardType?: 'list' | 'grid' | 'podium';
  scoreboardLimit?: number;
  scoreboardSortBy?: 'score' | 'fastest-buzzer';
  // Template specific config
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderLabel?: string;
}

/** Pack-level settings stored in content_packs.settings (jsonb) */
export interface PackSettings {
  answerVisibility?: AnswerVisibility;
  theme?: PackTheme;
}

export interface PackTheme {
  primaryColor?: string;   // hex
  backgroundColor?: string; // hex
  fontFamily?: string;
}

export function getDefaultContent(template: SlideTemplate): SlideContent {
  const base: SlideContent = { template, title: '' };
  switch (template) {
    case 'information':
    case 'text-card':
    case 'open-text':
    case 'rating':
    case 'drawing':
      return { ...base, body: '' };
    case 'slider':
      return { ...base, body: '', sliderMin: 0, sliderMax: 100, sliderStep: 1 };
    case 'multiple-choice':
      return { ...base, options: ['', '', '', ''], correctOptionIndex: 0 };
    case 'end-game':
      return { 
        ...base, 
        body: '', 
        showScoreboard: true, 
        scoreboardType: 'podium',
        scoreboardSortBy: 'score' 
      };
    default:
      return base;
  }
}

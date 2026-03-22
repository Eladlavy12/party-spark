export type SlideTemplate = 'information' | 'open-text' | 'multiple-choice' | 'rating' | 'drawing';

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
    id: 'rating',
    label: 'Rating / Scale',
    description: 'Show a statement — players use a slider or like/dislike',
    icon: 'Star',
  },
  {
    id: 'drawing',
    label: 'Drawing',
    description: 'Show a prompt — players draw on a canvas',
    icon: 'Pencil',
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
      return { ...base, body: '' };
    case 'open-text':
      return { ...base, body: '' };
    case 'multiple-choice':
      return { ...base, options: ['', '', '', ''], correctOptionIndex: 0 };
    case 'rating':
      return { ...base, body: '' };
    case 'drawing':
      return { ...base, body: '' };
  }
}

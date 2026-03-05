import type { DeckTemplate, DeckTemplateId } from '@/types/render';

const TEMPLATE_LIBRARY: DeckTemplate[] = [
  {
    id: 'reveal-black',
    name: 'Midnight Black',
    description: 'High-contrast dark template for executive updates.',
    backgroundStyle: 'dark-radial',
    source: {
      project: 'reveal.js',
      themeName: 'black',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/black.scss',
      license: 'MIT',
    },
    palette: {
      background: '191919',
      surface: '222222',
      text: 'FFFFFF',
      mutedText: 'C7CDD5',
      accent: '42AFFA',
      accentSoft: '21405A',
      divider: '2E2E2E',
    },
    typography: {
      titleFont: 'Aptos Display',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-white',
    name: 'Clean White',
    description: 'Minimal light template for formal reports.',
    backgroundStyle: 'solid-clean',
    source: {
      project: 'reveal.js',
      themeName: 'white',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/white.scss',
      license: 'MIT',
    },
    palette: {
      background: 'FFFFFF',
      surface: 'F7F9FC',
      text: '222222',
      mutedText: '6B7280',
      accent: '2A76DD',
      accentSoft: 'EAF2FF',
      divider: 'DDE3ED',
    },
    typography: {
      titleFont: 'Aptos Display',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-league',
    name: 'League Gradient',
    description: 'Bold gradient-like dark template with strong headings.',
    backgroundStyle: 'cool-gradient',
    source: {
      project: 'reveal.js',
      themeName: 'league',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/league.scss',
      license: 'MIT',
    },
    palette: {
      background: '1C1E20',
      surface: '2B2F34',
      text: 'F7F8FA',
      mutedText: 'BCC3CE',
      accent: '13DAEC',
      accentSoft: '13363A',
      divider: '3A4047',
    },
    typography: {
      titleFont: 'Bahnschrift SemiBold',
      bodyFont: 'Calibri',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-sky',
    name: 'Skylight',
    description: 'Soft blue template for informative narratives.',
    backgroundStyle: 'cool-gradient',
    source: {
      project: 'reveal.js',
      themeName: 'sky',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/sky.scss',
      license: 'MIT',
    },
    palette: {
      background: 'F7FBFC',
      surface: 'EAF3F6',
      text: '333333',
      mutedText: '5D697A',
      accent: '3B759E',
      accentSoft: 'D5E8F2',
      divider: 'CDDCE3',
    },
    typography: {
      titleFont: 'Aptos Display',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-solarized',
    name: 'Solarized Light',
    description: 'Warm neutral template optimized for readability.',
    backgroundStyle: 'warm-paper',
    source: {
      project: 'reveal.js',
      themeName: 'solarized',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/solarized.scss',
      license: 'MIT',
    },
    palette: {
      background: 'FDF6E3',
      surface: 'F4EEDC',
      text: '657B83',
      mutedText: '839496',
      accent: '268BD2',
      accentSoft: 'E7EEF0',
      divider: 'E5DDC8',
    },
    typography: {
      titleFont: 'Aptos Display',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-dracula',
    name: 'Dracula Neon',
    description: 'Dark purple neon theme with strong contrast and energy.',
    backgroundStyle: 'neon-glow',
    source: {
      project: 'reveal.js',
      themeName: 'dracula',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/dracula.scss',
      license: 'MIT',
    },
    palette: {
      background: '282A36',
      surface: '343746',
      text: 'F8F8F2',
      mutedText: 'B7BED6',
      accent: 'FF79C6',
      accentSoft: '3D3558',
      divider: '4A506B',
    },
    typography: {
      titleFont: 'Bahnschrift SemiBold',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-blood',
    name: 'Blood Red',
    description: 'Cinematic dark red theme for high-impact storytelling.',
    backgroundStyle: 'dark-radial',
    source: {
      project: 'reveal.js',
      themeName: 'blood',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/blood.scss',
      license: 'MIT',
    },
    palette: {
      background: '222222',
      surface: '2B2B2B',
      text: 'EEEEEE',
      mutedText: 'C8BFC2',
      accent: 'AA2233',
      accentSoft: '3B272A',
      divider: '4B3439',
    },
    typography: {
      titleFont: 'Bahnschrift SemiBold',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-beige',
    name: 'Beige Editorial',
    description: 'Warm paper-like editorial theme with subtle vintage tone.',
    backgroundStyle: 'warm-paper',
    source: {
      project: 'reveal.js',
      themeName: 'beige',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/beige.scss',
      license: 'MIT',
    },
    palette: {
      background: 'F7F3DE',
      surface: 'F3EED2',
      text: '333333',
      mutedText: '7E735A',
      accent: '8B743D',
      accentSoft: 'EEE3BF',
      divider: 'D9CFB0',
    },
    typography: {
      titleFont: 'Cambria',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
  {
    id: 'reveal-moon',
    name: 'Moon Dark Blue',
    description: 'Deep navy solarized-dark look for analytical decks.',
    backgroundStyle: 'dark-radial',
    source: {
      project: 'reveal.js',
      themeName: 'moon',
      url: 'https://github.com/hakimel/reveal.js/blob/master/css/theme/source/moon.scss',
      license: 'MIT',
    },
    palette: {
      background: '002B36',
      surface: '073642',
      text: 'EEE8D5',
      mutedText: '93A1A1',
      accent: '268BD2',
      accentSoft: '123A49',
      divider: '2A5564',
    },
    typography: {
      titleFont: 'Aptos Display',
      bodyFont: 'Aptos',
      monoFont: 'JetBrains Mono',
    },
  },
];

export function listDeckTemplates(): DeckTemplate[] {
  return TEMPLATE_LIBRARY;
}

export function getDeckTemplateById(templateId: DeckTemplateId): DeckTemplate | null {
  return TEMPLATE_LIBRARY.find((template) => template.id === templateId) ?? null;
}

export function getDefaultDeckTemplate(): DeckTemplate {
  return TEMPLATE_LIBRARY[0];
}

export interface ThemeConfig {
  id: string;
  name_ar: string;
  name_en: string;
  mode: 'dark' | 'light';
  primaryColor: string; // e.g. #f59e0b (Amber Gold)
  secondaryColor: string; // e.g. #06b6d4 (Cyan)
  backgroundColor: string; // e.g. #050505
  fontFamily: 'Inter' | 'Outfit' | 'Cairo' | 'Tajawal' | 'Playfair Display';
  borderRadius: '0px' | '8px' | '16px' | '24px';
  glassOpacity: number; // 0.1 to 0.9
}

export const DEFAULT_THEME: ThemeConfig = {
  id: 'baher-royal-gold',
  name_ar: 'النمط الذهبي الملكي (Royal Gold)',
  name_en: 'Royal Gold Theme',
  mode: 'dark',
  primaryColor: '#f59e0b',
  secondaryColor: '#06b6d4',
  backgroundColor: '#050505',
  fontFamily: 'Cairo',
  borderRadius: '16px',
  glassOpacity: 0.4,
};

export const PRESET_THEMES: ThemeConfig[] = [
  DEFAULT_THEME,
  {
    id: 'emerald-luxury',
    name_ar: 'الزمرد الأخضر الأنيق (Emerald Luxe)',
    name_en: 'Emerald Luxury Theme',
    mode: 'dark',
    primaryColor: '#10b981',
    secondaryColor: '#f59e0b',
    backgroundColor: '#021810',
    fontFamily: 'Tajawal',
    borderRadius: '16px',
    glassOpacity: 0.5,
  },
  {
    id: 'platinum-silver',
    name_ar: 'الفضي البلاتيني (Platinum Silver)',
    name_en: 'Platinum Silver Theme',
    mode: 'dark',
    primaryColor: '#e2e8f0',
    secondaryColor: '#38bdf8',
    backgroundColor: '#0f172a',
    fontFamily: 'Inter',
    borderRadius: '8px',
    glassOpacity: 0.3,
  },
];

class ThemeEngine {
  private activeTheme: ThemeConfig = DEFAULT_THEME;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('baher_silver_active_theme');
        if (saved) {
          this.activeTheme = JSON.parse(saved);
        }
      } catch {
        // Ignored
      }
    }
  }

  getTheme(): ThemeConfig {
    return this.activeTheme;
  }

  applyTheme(theme: ThemeConfig): void {
    this.activeTheme = theme;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('baher_silver_active_theme', JSON.stringify(theme));
        const root = document.documentElement;
        root.style.setProperty('--color-primary', theme.primaryColor);
        root.style.setProperty('--color-secondary', theme.secondaryColor);
        root.style.setProperty('--color-background', theme.backgroundColor);
        root.style.setProperty('--border-radius-custom', theme.borderRadius);
        root.style.fontFamily = `${theme.fontFamily}, sans-serif`;
      } catch {
        // Ignored
      }
    }
  }
}

export const themeEngine = new ThemeEngine();

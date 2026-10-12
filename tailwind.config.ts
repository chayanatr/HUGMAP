import type { Config } from 'tailwindcss';

// HUGMAP v2 tokens — ดู design/HUGMAP Design System.dc.html
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    screens: { md: '640px', lg: '1024px' },
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2F8466', hover: '#246B52', deep: '#1F3A32', mint: '#8ED3B5',
          ring: '#D3EBDF', soft: '#E5F2EC', onrail: '#E1F0EA',
        },
        dark: { DEFAULT: '#1F3A32', field: '#2B4B42', line: '#46685E', muted: '#A9CBBE', soft: '#D3E6DE' },
        bg: '#F5F6FA', panel: '#F7F8FC', surface: '#FFFFFF', map: '#ECEEF3',
        line: { DEFAULT: '#EEF0F5', border: '#E3E5EF', dash: '#C4C7D6', dashsoft: '#D5D8E5' },
        label: '#A3A6BC', placeholder: '#9A9DB4', muted: '#5B5F7B', ink: '#1C1D3B',
        success: { DEFAULT: '#1E9466', soft: '#E3F6EE' },
        warning: { DEFAULT: '#B7791F', soft: '#FFF3DE' },
        danger: { DEFAULT: '#E5484D', text: '#C93A3F', soft: '#FDECEC' },
        avatar: '#FF8E6E',
      },
      fontFamily: { sans: ['var(--font-anuphan)', 'sans-serif'] },
      fontSize: {
        label: ['11px', { lineHeight: '1.4' }],
        value: ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        title: ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '1.35', fontWeight: '700' }],
        stat: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        display: ['40px', { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.01em' }],
      },
      borderRadius: { pill: '6px', input: '10px', item: '12px', card: '16px', section: '20px' },
      boxShadow: {
        card: '0 6px 20px rgba(28,29,59,.06)',
        stop: '0 4px 14px rgba(28,29,59,.05)',
        overlay: '0 6px 20px rgba(28,29,59,.10)',
        dropdown: '0 16px 40px rgba(28,29,59,.16)',
        dark: '0 20px 50px rgba(28,29,59,.35)',
        selected: '0 0 0 2px #2F8466, 0 10px 24px rgba(47,132,102,.15)',
        focus: '0 0 0 3px #D3EBDF',
      },
      width: { rail: '72px', 'rail-tab': '64px', panel: '400px', 'panel-tab': '340px', form: '440px', 'form-tab': '360px' },
    },
  },
  plugins: [],
} satisfies Config;

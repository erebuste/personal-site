import type { ProfileConfig } from '../types';

// Default profile. The server seeds data/profile.json from this on first start;
// after that, edit everything from /admin. Also used by `npm run dev` when the API isn't running.
export const defaultProfile: ProfileConfig = {
  user: {
    username: 'tagged',
    avatarUrl: '/media/avatar.png',
    avatarRadius: 50,
    bannerUrl: null,
    description: '[hr-theme]',
    location: '',
  },

  links: [
    { platform: 'steam', title: 'Steam', action: { type: 'url', href: 'https://steamcommunity.com/id/tagged' } },
    { platform: 'youtube', title: 'YouTube', action: { type: 'url', href: 'https://youtube.com/@tagged' } },
  ],

  showcases: [],

  audio: { src: null, title: 'When I Die', cover: null, volume: 40, showPlayer: true },

  theme: {
    accent: '#FFFFFF',
    primaryText: '#FFFFFF',
    secondaryText: '#A8A29E',
    iconGlow: true,
    sparkles: { enabled: true, color: '#000000' },
    usernameEffect: 'none',
  },

  box: {
    width: 750,
    padding: 35,
    color: '#141417',
    opacity: 50,
    blur: 40,
    radius: 10,
    shadowColor: '#090909',
    shadowOpacity: 50,
    borderWidth: 1,
    borderColor: '#78726D',
    borderOpacity: 20,
    borderStyle: 'solid',
  },

  background: { src: null, color: '#090909', blur: 0, opacity: 100, size: 'cover' },

  page: {
    title: 'tagged',
    favicon: null,
    titleAnimation: 'typing',
    titleSpeedMs: 300,
    enterAnimation: 'slide-up',
    enterAnimationMs: 350,
    overlay: 'glitch',
    cursorTrail: 'fairy-dust',
    cursorEmoji: '✨',
    showViews: false,
    reveal: { enabled: true, text: 'Click to reveal', blur: 15 },
  },

  embed: {
    siteUrl: 'http://localhost:3000',
    siteName: '',
    title: 'tagged',
    description: '',
    color: '#F97316',
    image: null,
  },

  discordPresence: { enabled: true, userId: '' },
};

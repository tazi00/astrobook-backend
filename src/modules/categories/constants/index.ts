// Astrobook Explore ki category taxonomy — single source of truth.
// Frontend (Explore tab) yeh yahi se fetch karta hai, aur consultation
// services + posts ke "tags" field mein bhi yehi ids use hote hain.

export const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'numerology', label: 'Numerology' },
  { id: 'vastu', label: 'Vastu' },
  { id: 'vedic', label: 'Vedic' },
  { id: 'tarot', label: 'Tarot' },
  { id: 'palmistry', label: 'Palmistry' },
  { id: 'reiki', label: 'Reiki' },
  { id: 'meditation', label: 'Meditation' },
] as const

export const ALL_CATEGORIES = [
  { id: 'numerology', label: 'Numerology', emoji: '🔢', color: '#1E40AF', filter: 'numerology' },
  { id: 'vastu', label: 'Vastu', emoji: '🏠', color: '#1E3A5F', filter: 'vastu' },
  {
    id: 'vedic-astrology',
    label: 'Vedic Astrology',
    emoji: '⭐',
    color: '#4C1D95',
    filter: 'vedic',
  },
  { id: 'kundli', label: 'Kundli', emoji: '🔮', color: '#6B21A8', filter: 'vedic' },
  { id: 'tarot', label: 'Tarot', emoji: '🃏', color: '#92400E', filter: 'tarot' },
  { id: 'tarot-love', label: 'Tarot Love', emoji: '💕', color: '#9D174D', filter: 'tarot' },
  { id: 'palmistry', label: 'Palmistry', emoji: '✋', color: '#065F46', filter: 'palmistry' },
  { id: 'face-reading', label: 'Face Reading', emoji: '👁️', color: '#7C2D12', filter: 'palmistry' },
  { id: 'reiki', label: 'Reiki', emoji: '✨', color: '#065F46', filter: 'reiki' },
  { id: 'past-life', label: 'Past Life', emoji: '🌀', color: '#134E4A', filter: 'reiki' },
  { id: 'meditation', label: 'Meditation', emoji: '🧘', color: '#1E40AF', filter: 'meditation' },
  { id: 'gemstones', label: 'Gemstones', emoji: '💎', color: '#6B21A8', filter: 'meditation' },
  {
    id: 'numerology-name',
    label: 'Name Analysis',
    emoji: '📛',
    color: '#1E3A5F',
    filter: 'numerology',
  },
  { id: 'vastu-home', label: 'Home Vastu', emoji: '🏡', color: '#065F46', filter: 'vastu' },
] as const

export type CategoryId = (typeof ALL_CATEGORIES)[number]['id']

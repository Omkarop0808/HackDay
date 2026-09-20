export const LIFESTYLE_CONFIG_VERSION = 1;

export const LIFESTYLE_MODES = {
  PRESET: 'preset',
  CUSTOM: 'custom',
};

export const LIFESTYLE_MULTIPLIERS = {
  essential: 0.40,
  comfortable: 0.60,
  premium: 0.80,
};

export const LIFESTYLE_CATEGORY_BLUEPRINT = [
  { id: 'housing', name: 'Housing & Utilities', defaultShare: 35, color: '#8B5CF6', tooltipKey: 'categoryHousing' },
  { id: 'food', name: 'Food & Dining', defaultShare: 20, color: '#F472B6', tooltipKey: 'categoryFood' },
  { id: 'healthcare', name: 'Healthcare', defaultShare: 15, color: '#EF4444', tooltipKey: 'categoryHealthcare' },
  { id: 'travel', name: 'Travel & Leisure', defaultShare: 15, color: '#FBBF24', tooltipKey: 'categoryTravel' },
  { id: 'family', name: 'Family & Misc', defaultShare: 10, color: '#34D399', tooltipKey: 'categoryFamily' },
  { id: 'buffer', name: 'Emergency Buffer', defaultShare: 5, color: '#3B82F6', tooltipKey: 'categoryEmergency' },
];

const PRESET_KEYS = Object.keys(LIFESTYLE_MULTIPLIERS);
const CATEGORY_IDS = LIFESTYLE_CATEGORY_BLUEPRINT.map((item) => item.id);

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

export function normalizeLifestylePreset(value, fallback = 'comfortable') {
  const normalized = String(value || '').trim().toLowerCase();
  if (PRESET_KEYS.includes(normalized)) return normalized;
  return PRESET_KEYS.includes(fallback) ? fallback : 'comfortable';
}

export function normalizeLifestyleMode(value) {
  return value === LIFESTYLE_MODES.CUSTOM ? LIFESTYLE_MODES.CUSTOM : LIFESTYLE_MODES.PRESET;
}

export function normalizeCategoryMix(rawMix = {}) {
  const seed = CATEGORY_IDS.reduce((acc, id, index) => {
    const fallbackShare = LIFESTYLE_CATEGORY_BLUEPRINT[index].defaultShare;
    const rawValue = Number(rawMix?.[id]);
    acc[id] = Number.isFinite(rawValue) ? clamp(rawValue, 0, 100) : fallbackShare;
    return acc;
  }, {});

  const total = Object.values(seed).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return CATEGORY_IDS.reduce((acc, id, index) => {
      acc[id] = LIFESTYLE_CATEGORY_BLUEPRINT[index].defaultShare;
      return acc;
    }, {});
  }

  const normalized = CATEGORY_IDS.reduce((acc, id) => {
    acc[id] = roundOne((seed[id] / total) * 100);
    return acc;
  }, {});

  const normalizedTotal = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  const drift = roundOne(100 - normalizedTotal);
  if (Math.abs(drift) > 0) {
    normalized[CATEGORY_IDS[0]] = roundOne(normalized[CATEGORY_IDS[0]] + drift);
  }

  return normalized;
}

export function createDefaultLifestyleConfig(lifestyle = 'comfortable') {
  return {
    version: LIFESTYLE_CONFIG_VERSION,
    mode: LIFESTYLE_MODES.PRESET,
    preset: normalizeLifestylePreset(lifestyle),
    customMonthlySpend: 0,
    categories: normalizeCategoryMix(),
  };
}

export function normalizeLifestyleConfig(config, fallbackLifestyle = 'comfortable') {
  const defaults = createDefaultLifestyleConfig(fallbackLifestyle);

  if (!config || typeof config !== 'object') {
    return defaults;
  }

  return {
    version: LIFESTYLE_CONFIG_VERSION,
    mode: normalizeLifestyleMode(config.mode),
    preset: normalizeLifestylePreset(config.preset, defaults.preset),
    customMonthlySpend: Math.max(0, Number(config.customMonthlySpend) || 0),
    categories: normalizeCategoryMix(config.categories),
  };
}

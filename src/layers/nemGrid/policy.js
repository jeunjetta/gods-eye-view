/**
 * NEM Grid layer policy and constants.
 */

export const NEM_LAYER_ID = 'nem-grid';
export const NEM_LAYER_NAME = 'NEM Grid';
export const NEM_LAYER_ICON = '⚡';
export const NEM_LAYER_SOURCE = 'Geoscience Australia';

// Voltage-based line colors (HSL for easy reading)
// Higher voltages = warmer/brighter colors
export const VOLTAGE_COLORS = {
  500: '#ff3333', // Red - EHV interconnectors
  400: '#ff5533',
  330: '#ff8800', // Orange - Major transmission
  275: '#ffaa00',
  220: '#ffcc00', // Yellow
  132: '#88cc00', // Yellow-green - Sub-transmission
  110: '#44bb44', // Green
  66: '#2299aa',  // Teal - Distribution
  33: '#4488cc',  // Blue
  default: '#6666aa', // Purple - Unknown
};

// Get color for a given voltage
export function voltageColor(kv) {
  if (!kv) return VOLTAGE_COLORS.default;
  // Find closest voltage level
  const levels = Object.keys(VOLTAGE_COLORS)
    .filter(k => k !== 'default')
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const level of levels) {
    if (kv >= level) return VOLTAGE_COLORS[level];
  }
  return VOLTAGE_COLORS.default;
}

// Line width based on voltage (higher voltage = thicker)
export function voltageLineWidth(kv) {
  if (!kv) return 2;
  if (kv >= 500) return 5;
  if (kv >= 330) return 4;
  if (kv >= 220) return 3.5;
  if (kv >= 132) return 3;
  if (kv >= 66) return 2.5;
  return 2;
}

// Substation marker size based on voltage
export function substationMarkerSize(kv) {
  if (!kv) return 8;
  if (kv >= 330) return 14;
  if (kv >= 220) return 12;
  if (kv >= 132) return 10;
  return 8;
}

// Visibility settings
export const LINE_ALTITUDE_OFFSET = 50; // Meters above ground
export const SUBSTATION_ALTITUDE_OFFSET = 100;
export const LABEL_DISTANCE_DISPLAY_THRESHOLD = 500000; // Show labels within 500km

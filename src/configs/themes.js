/**
 * Centralized Theme Configuration
 * Mengelola semua tema yang tersedia di aplikasi
 * Format: underscore untuk internal, dash untuk API compatibility
 */

const VALID_THEMES = [
  'kesehatan',
  'pengelolaan_sampah', 
  'smart_city',
  'transportasi_ramah_lingkungan'
];

// Map underscore format to dash format for API compatibility
const THEME_MAPPING = {
  'kesehatan': 'kesehatan',
  'pengelolaan_sampah': 'pengelolaan-sampah',
  'smart_city': 'smart-city', 
  'transportasi_ramah_lingkungan': 'transportasi-ramah-lingkungan'
};

// Reverse mapping for converting dash to underscore
const REVERSE_THEME_MAPPING = {
  'kesehatan': 'kesehatan',
  'pengelolaan-sampah': 'pengelolaan_sampah',
  'smart-city': 'smart_city',
  'transportasi-ramah-lingkungan': 'transportasi_ramah_lingkungan'
};

/**
 * Get all valid themes in underscore format
 * @returns {Array} Array of themes with underscore format
 */
function getValidThemes() {
  return [...VALID_THEMES];
}

/**
 * Get all valid themes in dash format for API compatibility
 * @returns {Array} Array of themes with dash format
 */
function getValidThemesDash() {
  return VALID_THEMES.map(theme => THEME_MAPPING[theme]);
}

/**
 * Convert theme from underscore to dash format
 * @param {String} theme - Theme in underscore format
 * @returns {String} Theme in dash format
 */
function convertToDash(theme) {
  return THEME_MAPPING[theme] || theme;
}

/**
 * Convert theme from dash to underscore format
 * @param {String} theme - Theme in dash format
 * @returns {String} Theme in underscore format
 */
function convertToUnderscore(theme) {
  return REVERSE_THEME_MAPPING[theme] || theme;
}

/**
 * Check if theme is valid (accepts both formats)
 * @param {String} theme - Theme to validate
 * @returns {Boolean} Whether theme is valid
 */
function isValidTheme(theme) {
  return VALID_THEMES.includes(theme) || getValidThemesDash().includes(theme);
}

/**
 * Get themes formatted as categories with labels
 * @returns {Array} Array of objects with value and label
 */
function getThemeCategories() {
  const labelMapping = {
    'kesehatan': 'Kesehatan',
    'pengelolaan_sampah': 'Pengelolaan Sampah', 
    'smart_city': 'Smart City',
    'transportasi_ramah_lingkungan': 'Transportasi Ramah Lingkungan'
  };
  
  return VALID_THEMES.map(theme => ({
    value: theme,
    label: labelMapping[theme] || theme
  }));
}

module.exports = {
  VALID_THEMES,
  getValidThemes,
  getValidThemesDash,
  convertToDash,
  convertToUnderscore,
  isValidTheme,
  getThemeCategories
};
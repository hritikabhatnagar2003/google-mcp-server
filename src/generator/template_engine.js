/**
 * Template Engine for GrowwPulse
 * Handles simple string interpolation by replacing {{KEY}} with corresponding values.
 */

/**
 * Replaces placeholders in the format {{KEY}} with values from the provided object.
 * @param {string} template The template string
 * @param {Object} values The object containing replacement values
 * @returns {string} The interpolated string
 */
function interpolate(template, values = {}) {
  if (!template) return '';
  
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const value = values[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

module.exports = {
  interpolate
};

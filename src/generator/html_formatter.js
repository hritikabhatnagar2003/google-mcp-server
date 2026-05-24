/**
 * HTML Formatter for GrowwPulse
 * Populates HTML email template and cleans up empty sections/items.
 */

const { interpolate } = require('./template_engine');

/**
 * Renders HTML page from template, replacing placeholders and cleaning up empty nodes.
 * @param {string} template HTML template string
 * @param {Object} values Placeholders mapping object
 * @returns {string} Fully rendered and cleaned HTML string
 */
function renderHTML(template, values = {}) {
  let rendered = interpolate(template, values);
  
  // Clean up empty theme list items: e.g. "<strong></strong> &mdash;  mentions, avg ★"
  rendered = rendered.replace(/<li[^>]*>\s*<strong>\s*<\/strong>\s*&mdash;\s*mentions,\s*avg\s*★?\s*<\/li>/gi, '');
  
  // Clean up empty action items: e.g. "<li></li>"
  rendered = rendered.replace(/<li[^>]*>\s*<\/li>/gi, '');
  
  // Clean up empty quote table rows: check for empty double quotes in the span
  rendered = rendered.replace(/<tr>\s*<td[^>]*>\s*<span[^>]*>""<\/span>[\s\S]*?<\/td>\s*<\/tr>/gi, '');
  
  // Clean up any remaining spacer rows that are consecutive or orphaned
  // e.g. clean up if Quote 3 is removed, but we left the spacer row between 2 and 3
  // Wait, let's keep it simple. The table has:
  // <tr><td>Quote 1</td></tr>
  // <tr><td style="height: 12px;"></td></tr>
  // <tr><td>Quote 2</td></tr>
  // <tr><td style="height: 12px;"></td></tr>
  // <tr><td>Quote 3</td></tr>
  // If Quote 3 is removed, we have:
  // <tr><td>Quote 2</td></tr>
  // <tr><td style="height: 12px;"></td></tr>
  // [empty space where Quote 3 was]
  // Let's remove any spacer row that is followed by the end of the table or another spacer
  rendered = rendered.replace(/<tr>\s*<td[^>]*style="height:\s*12px;"[^>]*>\s*<\/td>\s*<\/tr>(?=\s*<\/table>)/gi, '');
  
  return rendered;
}

module.exports = {
  renderHTML
};

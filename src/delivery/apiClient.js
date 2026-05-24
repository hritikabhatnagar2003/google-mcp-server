/**
 * API Client for hosted Google MCP Server (REST interface)
 * Communicates with https://google-mcp-server-production-5589.up.railway.app/
 */

require('dotenv').config();

const DEFAULT_SERVER_URL = 'https://google-mcp-server-production-5589.up.railway.app';

/**
 * Helper to sleep for a given duration.
 * @param {number} ms Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch helper with exponential backoff retry logic.
 * Retries on network errors or transient HTTP status codes (429, 500, 502, 503, 504).
 * @param {string} url Request URL
 * @param {Object} options Fetch options
 * @param {number} retries Number of remaining retry attempts (default 3)
 * @param {number} delay Current backoff delay in ms (default 1000)
 * @returns {Promise<Response>} Fetch Response object
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url, options);
    
    // Check if the request succeeded
    if (response.ok) {
      return response;
    }
    
    // Check if the failure is transient (Rate limit 429 or Server errors 5xx)
    const isTransient = response.status === 429 || (response.status >= 500 && response.status <= 599);
    
    if (isTransient && retries > 0) {
      console.warn(`⚠️ Warning: Request to ${url} failed with status ${response.status}. Retrying in ${delay}ms... (${retries} attempts left)`);
      await sleep(delay);
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    
    // For non-transient status codes (like 400, 401, 403, 404, 422), or when retries are exhausted
    const errorText = await response.text();
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  } catch (error) {
    // Catch network errors (like DNS lookup failure, connection timeout)
    const isNetworkError = error.name === 'TypeError' || error.message.includes('fetch');
    
    if (isNetworkError && retries > 0) {
      console.warn(`⚠️ Warning: Network error connecting to ${url}: ${error.message}. Retrying in ${delay}ms... (${retries} attempts left)`);
      await sleep(delay);
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    
    throw error;
  }
}

/**
 * Call the create_email_draft endpoint on the hosted MCP server.
 * @param {string} to Recipient email
 * @param {string} subject Subject line
 * @param {string} body Plain text body content
 * @param {Object} options Configuration overrides
 * @returns {Promise<Object>} Response JSON result
 */
async function createEmailDraft(to, subject, body, options = {}) {
  const baseUrl = options.serverUrl || process.env.GOOGLE_MCP_SERVER_URL || DEFAULT_SERVER_URL;
  const url = `${baseUrl}/create_email_draft`;
  
  console.log(`📤 Sending request to create email draft to: ${to}...`);
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, subject, body })
  });
  
  return response.json();
}

/**
 * Call the append_to_doc endpoint on the hosted MCP server.
 * @param {string} docId Target Google Doc ID
 * @param {string} content Text content to append
 * @param {Object} options Configuration overrides
 * @returns {Promise<Object>} Response JSON result
 */
async function appendToDoc(docId, content, options = {}) {
  const baseUrl = options.serverUrl || process.env.GOOGLE_MCP_SERVER_URL || DEFAULT_SERVER_URL;
  const url = `${baseUrl}/append_to_doc`;
  
  console.log(`📝 Sending request to append text to Google Doc: ${docId}...`);
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ doc_id: docId, content })
  });
  
  return response.json();
}

module.exports = {
  createEmailDraft,
  appendToDoc,
  fetchWithRetry
};

/**
 * LLM Classifier for GrowwPulse
 * Integrates with Groq, Gemini, or OpenAI to classify reviews.
 * Includes rate-limiting, stratified sampling, batching, and error fallbacks.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Allowed exact themes
const ALLOWED_THEMES = [
  "App Stability & Performance",
  "Customer Support",
  "UX / Interface",
  "Transactions & Orders",
  "Onboarding & KYC"
];

/**
 * Stratified sampling of reviews to fit under LLM budget.
 * Groups by rating (1-3) and samples proportionally.
 * @param {Array} reviews Reviews to sample
 * @param {number} maxCount Maximum sample count (default 150)
 * @returns {Array} Sampled reviews
 */
function getStratifiedSample(reviews, maxCount = 150) {
  if (reviews.length <= maxCount) {
    return reviews;
  }

  // Group by rating (1, 2, 3)
  const groups = { 1: [], 2: [], 3: [] };
  reviews.forEach(r => {
    const rating = r.rating;
    if (groups[rating]) {
      groups[rating].push(r);
    } else {
      // Fallback for any other rating
      groups[1].push(r);
    }
  });

  const totalReviews = reviews.length;
  const sampled = [];

  // Sort each group by date (descending) to prioritize newer reviews
  Object.keys(groups).forEach(rating => {
    groups[rating].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  // Sample proportionally
  Object.keys(groups).forEach(rating => {
    const group = groups[rating];
    const groupSampleCount = Math.round((group.length / totalReviews) * maxCount);
    const taken = group.slice(0, groupSampleCount);
    sampled.push(...taken);
  });

  // If we ended up with slightly more or fewer than maxCount due to rounding, adjust
  if (sampled.length > maxCount) {
    return sampled.slice(0, maxCount);
  } else if (sampled.length < maxCount && reviews.length > sampled.length) {
    // Fill the rest with unsampled reviews
    const sampledIds = new Set(sampled.map(r => r.id));
    for (const r of reviews) {
      if (sampled.length >= maxCount) break;
      if (!sampledIds.has(r.id)) {
        sampled.push(r);
      }
    }
  }

  return sampled;
}

/**
 * Helper to clean and parse JSON from LLM output.
 * Strips markdown code blocks.
 */
function cleanAndParseJSON(responseText) {
  let cleanText = responseText.trim();
  
  // Remove markdown code blocks if present
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "");
  }
  
  cleanText = cleanText.trim();
  return JSON.parse(cleanText);
}

/**
 * Call the configured LLM API.
 * Detects Groq, Gemini, or OpenAI API keys.
 */
async function callLLMAPI(prompt) {
  const isGroq = !!process.env.GROQ_API_KEY;
  const isGemini = !!process.env.GEMINI_API_KEY;
  const isOpenAI = !!process.env.OPENAI_API_KEY;

  if (!isGroq && !isGemini && !isOpenAI) {
    throw new Error("No LLM API keys found in environment (GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY).");
  }

  // 1. Groq Integration
  if (isGroq) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a professional classification system. Your response must be a single JSON object."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 2. Gemini Integration
  if (isGemini) {
    const modelName = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // 3. OpenAI Integration
  if (isOpenAI) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional classification system. Your response must be a single JSON object."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

/**
 * Classify a batch of reviews via LLM.
 * @param {Array} batch Array of review objects
 * @returns {Promise<Array>} Array of classified objects: { id, theme, reason }
 */
async function classifyBatch(batch) {
  const prompt = `Classify the following customer reviews into exactly one of these five themes:
1. "App Stability & Performance" (for crashes, lag, freezes, app not opening, charts stuck)
2. "Customer Support" (for support responses, chatbot complaints, unhelpful agents)
3. "UX / Interface" (for interface confusion, clutter, popups, bad UI/UX update)
4. "Transactions & Orders" (for payment stuck, order execution delay/failure, withdrawal issues)
5. "Onboarding & KYC" (for KYC pending, document verification, NRI sign up problems)

If a review does not fit any of the above, use "UX / Interface" as a fallback.

Output ONLY a valid JSON object with a single root key "classifications" containing an array of objects.
Each object must have exactly these keys: "id" (string), "theme" (string matching one of the 5 exact names above), and "reason" (string, brief explanation of 5-15 words).

Do NOT include any markdown block markers or surrounding text.

Reviews:
${JSON.stringify(batch.map(r => ({ id: r.id, text: r.text, rating: r.rating })), null, 2)}`;

  try {
    const rawResult = await callLLMAPI(prompt);
    const parsed = cleanAndParseJSON(rawResult);
    
    if (parsed && Array.isArray(parsed.classifications)) {
      return parsed.classifications;
    }
    
    console.warn("⚠️ Invalid classifications format returned by LLM. Returning empty array.");
    return [];
  } catch (err) {
    console.error(`❌ Batch classification API error: ${err.message}`);
    return [];
  }
}

/**
 * Classifies reviews using the LLM in batches with a cooldown between batches.
 * @param {Array} reviews Unclassified critical reviews (1-3★)
 * @param {number} batchSize Batch size for requests (default 25)
 * @returns {Promise<Map>} Map of review ID -> { theme, reason }
 */
async function classifyWithLLM(reviews, batchSize = 50) {
  const classificationsMap = new Map();
  if (reviews.length === 0) return classificationsMap;

  // 1. Apply budget cap of 50 reviews for fast generation
  const sampledReviews = getStratifiedSample(reviews, 50);
  console.log(`🧠 LLM Classifier: Sampling and classifying ${sampledReviews.length} reviews in batches of ${batchSize}...`);

  for (let i = 0; i < sampledReviews.length; i += batchSize) {
    const batch = sampledReviews.slice(i, i + batchSize);
    
    // Minimal 1-second cooldown (no 5-second delay to keep generation fast)
    if (i > 0) {
      console.log("⏱️ Cooldown delay for 1 second to respect rate limits...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📦 Classifying batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(sampledReviews.length / batchSize)} (size: ${batch.length})...`);
    const results = await classifyBatch(batch);
    
    results.forEach(res => {
      // Validate theme returned is in allowed set, fallback to "UX / Interface"
      let theme = res.theme;
      if (!ALLOWED_THEMES.includes(theme)) {
        theme = "UX / Interface";
      }
      classificationsMap.set(res.id, {
        theme: theme,
        reason: res.reason || "Classified by LLM"
      });
    });
  }

  return classificationsMap;
}

module.exports = {
  classifyWithLLM,
  getStratifiedSample,
  cleanAndParseJSON
};

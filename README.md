# 📊 GrowwPulse

Weekly App Store and Play Store review pulse generator for the [Groww](https://groww.in) investment platform. Ingests reviews, groups them into core themes, generates a scannable weekly pulse note (≤250 words), and drafts a Gmail digest / appends to a Google Doc archive using Model Context Protocol (MCP) servers.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (version 18 or higher)
- Google Workspace account (for Gmail and Docs integration)
- Google Cloud project

### Step 1: Install Dependencies
From the project root directory, run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and fill in the values:
```ini
# Gmail & Google Workspace credentials (managed by Railway backend for hosted API)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Target email to send the weekly pulse note to
TARGET_EMAIL=recipient-email@gmail.com

# Google Doc Archive ID
GOOGLE_DOC_ID=1gGe28j6X5Vd-y7X1Fnz9GLgtyUdwmv-lFr7cYvsuLnQ

# LLM API keys for theme classification
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

### Step 3: Configure Settings
Customize the pipeline settings in `config/settings.json`:
```json
{
  "email": {
    "recipients": ["recipient-email@gmail.com"],
    "autoSend": false,
    "subjectPrefix": "📊 GrowwPulse"
  },
  "ingestion": {
    "reviewWindowWeeks": 8,
    "appStoreId": "1404871703",
    "playStoreAppId": "com.nextbillion.groww",
    "maxReviewsPerSource": 500
  },
  "classification": {
    "maxThemes": 5,
    "topThemesInPulse": 3,
    "classifierMode": "hybrid",
    "llmBatchSize": 25
  },
  "generator": {
    "maxWords": 250,
    "quotesCount": 3,
    "actionIdeasCount": 3
  },
  "delivery": {
    "gmail": true,
    "googleDocs": true,
    "serverUrl": "https://google-mcp-server-production-5589.up.railway.app"
  }
}
```

---

## 🏃 Running the Pipeline

You can run the full sequential end-to-end pipeline with a single command:

```bash
# Run full live pipeline
npm run pulse
```

### Command-Line Arguments
The orchestrator supports several CLI options to override default settings:

```bash
# Skip delivery to Gmail and Google Docs (generates files locally only)
npm run pulse -- --dry-run

# Run with offline mock review dataset (skips live store scrapers)
npm run pulse -- --mock-data

# Override review window to 12 weeks
npm run pulse -- --weeks 12

# Enable detailed verbose logging
npm run pulse -- --verbose

# Combine options (highly recommended for offline/local testing)
npm run pulse -- --mock-data --dry-run --verbose
```

---

## 📂 Output Files

All outputs are written to `data/outputs/`:

- **Theme Analysis Reports**:
  - `theme_analysis_[WEEK_ISO].json`: Weekly theme ranking metrics and selected quotes.
  - `theme_analysis_current.json`: Symbolic link pointing to the latest run.
- **Weekly Pulse Notes**:
  - `pulse_[WEEK_ISO].md` / `pulse_current.md`: The formatted Markdown pulse note (enforced ≤ 250 words, zero PII).
  - `pulse_[WEEK_ISO].html` / `pulse_current.html`: The styled HTML pulse note containing clean inline CSS formatting.
  - `pulse_meta_[WEEK_ISO].json` / `pulse_meta_current.json`: Execution audit metadata containing exact word counts and element coverage.

---

## 🧪 Testing

The codebase includes a fully-featured native test runner. To run all 62 unit and integration tests:

```bash
npm test
```

### Run Specific Tests
To run individual test files:
```bash
# Run ingestion tests
node --test tests/ingestion.test.js

# Run classification tests
node --test tests/classification.test.js

# Run generator tests
node --test tests/generator.test.js

# Run delivery tests
node --test tests/delivery.test.js

# Run orchestrator integration tests
node --test tests/integration.test.js
```

### Phase Verification Scripts
Verify that specific gates and exit criteria are fully satisfied:
```bash
# Validate Phase 4 Exit Criteria (word counts, layout cleanup)
node tests/phase4-verify.js

# Validate Phase 5 Exit Criteria (retries, client status codes)
node tests/phase5-verify.js

# Validate Phase 6 Exit Criteria (E2E full pipeline execution logs)
node tests/phase6-verify.js
```

---

## 📂 Related Documentation
- [Problem Statement](./Docs/Problem.Statment.md) — Detailed requirements & bounds.
- [Architecture Plan](./Docs/architecture.md) — Structural diagrams, security gates, and MCP JSON-RPC schemas.
- [Implementation Timeline](./Docs/implementation_plan.md) — Detailed task breakdowns.
- [Evaluation Matrix](./Docs/eval.md) — Phase-by-phase criteria and 68 verification test cases.
- [Decision Log](./Docs/decision.md) — Architecture Decision Records (ADRs) logs.

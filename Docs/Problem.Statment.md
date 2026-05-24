# GrowwPulse — Weekly App Review Pulse Generator

## 1. Product Context

**Selected Product:** [Groww](https://groww.in) — India's leading investment platform for stocks, mutual funds, F&O, ETFs, and digital gold. Available on both the **Google Play Store** and **Apple App Store**, Groww serves millions of retail investors and is known for its beginner-friendly interface.

**Project Name:** GrowwPulse

**Objective:** Build an automated pipeline that transforms recent App Store and Play Store reviews of the Groww app into a concise, scannable **one-page weekly pulse report** — then delivers it as a draft email via Gmail using **MCP (Model Context Protocol) servers** for Google Workspace integration.

---

## 2. Problem Statement

Product, Growth, Support, and Leadership teams at Groww (or any similar fintech) need a fast, recurring way to understand *what users are saying this week* without manually trawling through hundreds of app store reviews.

### Pain Points Addressed

| Stakeholder | Pain Point |
|:---|:---|
| **Product / Growth Teams** | No structured weekly view of top user complaints and feature requests → slows prioritization |
| **Support Teams** | Unaware of trending negative sentiment until tickets spike → reactive instead of proactive |
| **Leadership** | Lack of a quick "health pulse" of app perception → blind spots in executive reviews |

### Desired Outcome

A **≤ 250-word weekly note** delivered as a Gmail draft every week containing:

1. **Top 3–5 Themes** distilled from recent reviews (max 5 themes)
2. **3 Real User Quotes** (anonymized — no PII)
3. **3 Actionable Ideas** the team can act on immediately

---

## 3. Scope of Work

### 3.1 Review Data Ingestion

- **Source:** Public App Store and Play Store reviews for the Groww app
- **Time Window:** Last **8–12 weeks** of reviews
- **Fields to Capture:**

| Field | Description |
|:---|:---|
| `rating` | Star rating (1–5) |
| `title` | Review title / headline |
| `text` | Full review body text |
| `date` | Date the review was posted |
| `source` | `app_store` or `play_store` |

- **Method:** Use **public review export feeds / RSS** only. **No scraping behind logins.** Acceptable approaches include:
  - Apple RSS review feeds (`https://itunes.apple.com/rss/customerreviews/...`)
  - Google Play public review data via open-source tools or CSV exports
  - Pre-collected CSV/JSON datasets of public reviews

### 3.2 Theme Classification

- Group all ingested reviews into **a maximum of 5 themes**
- Themes are derived from recurring patterns in the Groww review corpus. Based on current public review analysis (2025–2026), the expected theme buckets include:

| # | Theme | Description |
|:--|:---|:---|
| 1 | **App Stability & Performance** | Crashes, lags, server downtime during market hours, display errors |
| 2 | **Customer Support** | Difficulty reaching support, slow resolution, automated responses |
| 3 | **UX / Interface Clutter** | Feature overload, navigation confusion, calls for segmented UI |
| 4 | **Transaction & Order Execution** | Delayed payments, failed exits, wrong fund redemptions |
| 5 | **Onboarding & KYC** | NRI eligibility confusion, data deletion issues, unclear onboarding flows |

> **Note:** These themes are illustrative. The system should dynamically derive themes from actual review data each week, not hardcode them.

### 3.3 Weekly Pulse Note Generation

Generate a one-page markdown note with the following structure:

```
📊 GrowwPulse — Weekly Review Digest
Week of [DATE_RANGE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 TOP THEMES THIS WEEK
1. [Theme Name] — [X mentions, avg rating Y★]
2. [Theme Name] — [X mentions, avg rating Y★]
3. [Theme Name] — [X mentions, avg rating Y★]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 USER VOICES (Anonymized)
• "[Exact quote from review]" — ★X, [Source]
• "[Exact quote from review]" — ★X, [Source]
• "[Exact quote from review]" — ★X, [Source]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 ACTION IDEAS
1. [Actionable recommendation based on Theme 1]
2. [Actionable recommendation based on Theme 2]
3. [Actionable recommendation based on Theme 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reviews analyzed: [N] | Period: [DATE_RANGE] | Sources: App Store, Play Store
```

**Constraints:**
- **≤ 250 words** total
- **Max 5 themes** (top 3 highlighted)
- **No PII** — no usernames, emails, user IDs, or any personally identifiable information
- Quotes must be **real** (sourced from actual reviews), not fabricated

### 3.4 Email Delivery via MCP Server

Draft and send the weekly pulse note as an email using **MCP (Model Context Protocol) servers** for Google Workspace — specifically for **Gmail** and optionally **Google Docs** integration.

#### Why MCP Servers Instead of Direct APIs?

| Aspect | Direct Google APIs | MCP Server Approach |
|:---|:---|:---|
| **Authentication** | Complex OAuth2 flow, token refresh logic, service accounts | Handled once during MCP server setup; agent uses tools naturally |
| **Code Complexity** | Requires SDK installation, API client boilerplate, error handling | Zero API code — agent calls MCP tools like `gmail_send_draft` |
| **Maintenance** | Must track API version changes, quota management | MCP server maintainers handle updates |
| **Security** | Credentials scattered in code / env vars | Centralized credential management in MCP config |
| **Extensibility** | Each new Google service = new API integration | Add services by enabling tools on the same MCP server |

#### MCP Server Setup

##### Option A: `@anthropic/google-workspace-mcp` (Recommended)

Use the official or well-maintained community MCP server for Google Workspace:

**1. Google Cloud Project Setup**
```
1. Go to https://console.cloud.google.com/
2. Create a new project (e.g., "GrowwPulse")
3. Enable APIs:
   - Gmail API
   - Google Docs API
   - Google Drive API
4. Configure OAuth Consent Screen:
   - App type: External (for personal/testing)
   - Add your email as a test user
5. Create OAuth 2.0 Client ID:
   - Application type: Desktop app
   - Download credentials.json
```

**2. Install MCP Server**
```bash
npm install -g @alanxchen/google-workspace-mcp
```
Or clone a community server:
```bash
git clone https://github.com/j3k0/mcp-google-workspace.git
cd mcp-google-workspace
npm install
```

**3. Authenticate**
```bash
# Place credentials.json in the config directory
# Run the auth flow
npm run get-token
# This opens a browser for OAuth consent — approve access
```

**4. Configure MCP Client**

Add to your MCP client configuration (e.g., `claude_desktop_config.json` or Gemini CLI `settings.json`):

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "npx",
      "args": ["-y", "@anthropic/google-workspace-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "<your-client-id>",
        "GOOGLE_CLIENT_SECRET": "<your-client-secret>",
        "GOOGLE_REFRESH_TOKEN": "<your-refresh-token>"
      }
    }
  }
}
```

##### Option B: Separate Gmail + Google Docs MCP Servers

If a unified server is unavailable, use separate servers:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["-y", "@anthropic/gmail-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "<your-client-id>",
        "GOOGLE_CLIENT_SECRET": "<your-client-secret>",
        "GOOGLE_REFRESH_TOKEN": "<your-refresh-token>"
      }
    },
    "google-docs": {
      "command": "npx",
      "args": ["-y", "@anthropic/google-docs-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "<your-client-id>",
        "GOOGLE_CLIENT_SECRET": "<your-client-secret>",
        "GOOGLE_REFRESH_TOKEN": "<your-refresh-token>"
      }
    }
  }
}
```

#### MCP Tools Used in This Project

| MCP Tool | Purpose |
|:---|:---|
| `gmail_create_draft` | Create a draft email with the weekly pulse note |
| `gmail_send_email` | Send the pulse email to self/alias |
| `gmail_list_messages` | (Optional) Check if previous pulse was sent |
| `docs_create` | (Optional) Create a Google Doc version of the pulse |
| `docs_append_text` | (Optional) Append weekly pulse to a running Google Doc |
| `drive_search` | (Optional) Find existing pulse documents |

#### Email Draft Specification

```
To:       <your-email@gmail.com> (self / team alias)
Subject:  📊 GrowwPulse — Weekly Review Digest (Week of [DATE])
Body:     [The generated weekly pulse note — formatted as HTML]
Format:   HTML email with clean formatting
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GrowwPulse Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  App Store   │    │  Play Store  │    │  CSV / JSON      │  │
│  │  RSS Feed    │    │  Public Data │    │  Exports         │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                   │                     │             │
│         └───────────────────┼─────────────────────┘             │
│                             ▼                                   │
│                  ┌─────────────────────┐                        │
│                  │  Review Ingestion   │                        │
│                  │  & Normalization    │                        │
│                  └──────────┬──────────┘                        │
│                             ▼                                   │
│                  ┌─────────────────────┐                        │
│                  │  Theme Clustering   │                        │
│                  │  (Max 5 Themes)     │                        │
│                  └──────────┬──────────┘                        │
│                             ▼                                   │
│                  ┌─────────────────────┐                        │
│                  │  Pulse Note Gen     │                        │
│                  │  (≤250 words)       │                        │
│                  └──────────┬──────────┘                        │
│                             ▼                                   │
│              ┌──────────────┴──────────────┐                    │
│              ▼                             ▼                    │
│   ┌──────────────────┐          ┌──────────────────┐           │
│   │  Gmail MCP       │          │  Google Docs MCP │           │
│   │  (Draft/Send)    │          │  (Optional)      │           │
│   └──────────────────┘          └──────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Key Constraints

| Constraint | Detail |
|:---|:---|
| **Data Source** | Public review exports only — no scraping behind logins or authenticated APIs |
| **Theme Limit** | Maximum 5 themes per weekly pulse |
| **Word Limit** | Pulse note must be ≤ 250 words to remain scannable |
| **No PII** | No usernames, email addresses, user IDs, or any personally identifiable information in any artifact |
| **Integration** | Use MCP servers for Gmail/Google Docs — not direct Google API client libraries |
| **Review Window** | Import reviews from the last 8–12 weeks |
| **Email Target** | Draft email sent to self or a designated team alias |

---

## 6. Deliverables

| # | Deliverable | Format |
|:--|:---|:---|
| 1 | **Review Dataset** | CSV/JSON file with rating, title, text, date, source fields |
| 2 | **Theme Analysis** | Markdown summary of 5 themes with review counts and avg ratings |
| 3 | **Weekly Pulse Note** | One-page markdown document (≤ 250 words) |
| 4 | **Email Draft** | Gmail draft created via MCP server containing the pulse note |
| 5 | **Problem Statement** | This document (`Problem.Statment.md`) |
| 6 | **Codebase** | Scripts/tools for ingestion, classification, generation, and email delivery |

---

## 7. MCP Server Quick Reference

### What is MCP?

**Model Context Protocol (MCP)** is an open standard that acts as a "USB-C for AI" — it provides a universal interface for AI agents to securely connect to external tools and data sources (like Gmail, Google Docs, databases, etc.) without writing bespoke API integration code.

### Why MCP for This Project?

1. **No API Boilerplate** — The agent calls tools like `gmail_create_draft(to, subject, body)` directly. No OAuth token management, no SDK setup.
2. **Secure by Design** — Credentials are stored in the MCP server configuration, not scattered across application code.
3. **Composable** — Adding Google Sheets export or Calendar reminders later requires only enabling additional MCP tools, not building new integrations.
4. **Portable** — The same pipeline works across different AI clients (Gemini CLI, Claude Desktop, etc.) that support MCP.

### Available MCP Servers for Google Workspace

| Server | Maintainer | Services | Link |
|:---|:---|:---|:---|
| `@alanxchen/google-workspace-mcp` | Community | Gmail, Docs, Drive, Calendar, Sheets | [npm](https://www.npmjs.com/package/@alanxchen/google-workspace-mcp) |
| `j3k0/mcp-google-workspace` | Community | Gmail, Calendar | [GitHub](https://github.com/j3k0/mcp-google-workspace) |
| `bobmatnyc/gworkspace-mcp` | Community | Gmail, Docs, Drive, Tasks | [GitHub](https://github.com/bobmatnyc/gworkspace-mcp) |
| Google Official Remote MCP | Google | Full Workspace suite | [Google Cloud](https://cloud.google.com/) |

### OAuth Scopes Required

```
https://www.googleapis.com/auth/gmail.compose     # Create and send drafts
https://www.googleapis.com/auth/gmail.readonly     # Read sent pulse emails
https://www.googleapis.com/auth/documents          # Create/edit Google Docs
https://www.googleapis.com/auth/drive.file         # Access Docs via Drive
```

---

## 8. Success Criteria

- [ ] Reviews from the last 8–12 weeks are imported and normalized
- [ ] Reviews are grouped into ≤ 5 meaningful themes
- [ ] A weekly pulse note is generated with top 3 themes, 3 quotes, and 3 action ideas
- [ ] The pulse note is ≤ 250 words and contains zero PII
- [ ] A draft email is created in Gmail via MCP server
- [ ] The email is sent to self/alias with the pulse note as the body
- [ ] The entire pipeline can be re-run weekly to produce fresh reports

---

## 9. Out of Scope

- Real-time review monitoring or alerting
- Sentiment analysis with ML model training
- Multi-product support (only Groww for this milestone)
- Integration with Slack, Teams, or other messaging platforms
- Historical trend analysis across quarters
- Paid review analytics platforms (e.g., AppFollow, data.ai)

---

## 10. References

- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Groww on Google Play Store](https://play.google.com/store/apps/details?id=com.nextbillion.groww)
- [Groww on Apple App Store](https://apps.apple.com/in/app/groww-stocks-mutual-funds/id1404871703)
- [Apple RSS Customer Reviews Feed](https://itunes.apple.com/rss/customerreviews/page=1/id=1404871703/sortby=mostrecent/json)

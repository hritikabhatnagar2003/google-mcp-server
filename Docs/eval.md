# Evaluation Framework — GrowwPulse

> **Version:** 1.0  
> **Last Updated:** 2026-05-21  
> **Status:** Draft  
> **Maintainer:** GrowwPulse Engineering Team

---

## Overview

This document defines the **evaluation framework** for the GrowwPulse project — an AI agent pipeline that ingests public App Store and Play Store reviews for the Groww investment app, classifies them into themes, generates a weekly pulse note, and delivers it via Gmail and Google Docs using MCP (Model Context Protocol) servers.

**Evaluation Approach:** Each of the 6 implementation phases has specific **exit criteria**, **test cases**, **quality gates**, and **evaluation methods** that must be fully satisfied before proceeding to the next phase. A phase is considered **complete** only when all Critical and High priority test cases pass and all quality gates are met.

### How to Use This Document

1. **Before starting a phase** — review exit criteria and test cases to understand what "done" means.
2. **During development** — use test cases as a checklist; run evaluation methods as you build.
3. **At phase completion** — verify all quality gates, document results in the Evaluation Matrix, and obtain sign-off.
4. **For defects** — use the Defect Tracking Template (Section 9) to log and triage issues.

---

## Table of Contents

- [1. Evaluation Summary Matrix](#1-evaluation-summary-matrix)
- [2. Severity Definitions](#2-severity-definitions)
- [3. Phase 1 — Project Foundation & MCP Server Setup](#3-phase-1--project-foundation--mcp-server-setup)
- [4. Phase 2 — Review Data Ingestion Pipeline](#4-phase-2--review-data-ingestion-pipeline)
- [5. Phase 3 — Theme Classification Engine](#5-phase-3--theme-classification-engine)
- [6. Phase 4 — Weekly Pulse Note Generator](#6-phase-4--weekly-pulse-note-generator)
- [7. Phase 5 — MCP Email & Docs Delivery](#7-phase-5--mcp-email--docs-delivery)
- [8. Phase 6 — End-to-End Integration & Polish](#8-phase-6--end-to-end-integration--polish)
- [9. Defect Tracking Template](#9-defect-tracking-template)
- [10. Regression Testing Checklist](#10-regression-testing-checklist)
- [11. Final Sign-Off](#11-final-sign-off)

---

## 1. Evaluation Summary Matrix

Track the overall status of each phase against its evaluation dimensions. Update this matrix as phases are completed.

| Phase | Exit Criteria | Test Cases (Pass/Total) | Quality Gates | Evaluation Status | Sign-Off Date |
|:------|:-------------|:-----------------------|:-------------|:-----------------|:-------------|
| **Phase 1** — Foundation & MCP Setup | ☑ Met | 8 / 8 | ☑ Met | 🟢 Passed | 2026-05-21 |
| **Phase 2** — Review Data Ingestion | ☑ Met | 12 / 12 | ☑ Met | 🟢 Passed | 2026-05-21 |
| **Phase 3** — Theme Classification | ☐ Not Met | 0 / 11 | ☐ Not Met | 🔴 Not Started | — |
| **Phase 4** — Pulse Note Generator | ☐ Not Met | 0 / 12 | ☐ Not Met | 🔴 Not Started | — |
| **Phase 5** — MCP Email & Docs Delivery | ☐ Not Met | 0 / 11 | ☐ Not Met | 🔴 Not Started | — |
| **Phase 6** — End-to-End Integration | ☐ Not Met | 0 / 14 | ☐ Not Met | 🔴 Not Started | — |

**Status Legend:**

| Icon | Meaning |
|:-----|:--------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Passed |
| 🔵 | Passed with Minor Issues |
| ⚫ | Blocked |

---

## 2. Severity Definitions

All test cases and defects are classified by severity. These definitions govern prioritization, blocking behavior, and release readiness.

| Severity | Definition | Impact | Phase Gate Behavior |
|:---------|:-----------|:-------|:-------------------|
| **🔴 Critical** | System is non-functional; core pipeline is broken; data loss or security breach | Pipeline cannot execute; output is corrupt or missing entirely | **Blocks phase completion.** Must be resolved before proceeding. |
| **🟠 High** | Major feature is broken or produces incorrect results; significant deviation from spec | Output is generated but materially wrong (e.g., PII leak, wrong theme count, word count exceeded) | **Blocks phase completion.** Must be resolved before proceeding. |
| **🟡 Medium** | Feature works but with noticeable quality issues; workaround exists | Output is usable but has quality gaps (e.g., formatting issues, suboptimal quote selection) | **Does not block** phase completion. Must be tracked and resolved before Phase 6 sign-off. |
| **🟢 Low** | Cosmetic issue, minor improvement, or enhancement request | No functional impact; polish or UX improvement | **Does not block** any gate. Addressed as time permits. |

### Severity–Priority Matrix

| | Immediate Fix | Next Sprint | Backlog |
|:---|:---|:---|:---|
| **Critical** | ✅ Fix Now | — | — |
| **High** | ✅ Fix Now | ✅ If capacity | — |
| **Medium** | — | ✅ Fix Next | ✅ Track |
| **Low** | — | — | ✅ Track |

---

## 3. Phase 1 — Project Foundation & MCP Server Setup

**Objective:** Establish the project scaffold, install all dependencies, configure Google Cloud and OAuth, set up MCP servers, and verify bidirectional connectivity with Gmail and Google Docs.

### 3.1 Exit Criteria

- [ ] Project directory structure exists and matches specification (see test P1-T01)
- [ ] `package.json` initialized with all required dependencies and correct metadata
- [ ] `.gitignore` properly excludes `credentials.json`, `token.json`, `node_modules/`, `.env`
- [ ] Google Cloud project created with Gmail API, Google Docs API, and Google Drive API enabled
- [ ] OAuth 2.0 consent screen configured with test user(s) added
- [ ] OAuth 2.0 Desktop Client credentials generated and `credentials.json` stored securely
- [ ] MCP server installed, configured, and authenticated (token generated)
- [ ] Test email draft successfully created in Gmail via MCP `gmail_create_draft`
- [ ] Test Google Doc successfully created via MCP `docs_create` (if using Docs delivery)
- [ ] README.md contains setup instructions sufficient for another developer to reproduce

### 3.2 Test Cases

| Test ID | Test Name | Steps | Expected Result | Pass/Fail Criteria | Severity |
|:--------|:----------|:------|:----------------|:-------------------|:---------|
| P1-T01 | Directory Structure Validation | 1. List all top-level directories. 2. Verify against spec: `src/`, `config/`, `data/`, `output/`, `Docs/`, `tests/`. | All required directories exist with correct nesting. | **Pass:** All dirs present. **Fail:** Any dir missing. | 🔴 Critical |
| P1-T02 | Package Initialization | 1. Run `npm install`. 2. Verify `node_modules/` is populated. 3. Check `package.json` has name, version, scripts. | Clean install, no errors, all deps resolved. | **Pass:** Exit code 0, lock file generated. **Fail:** Any install error or unresolved peer dep. | 🔴 Critical |
| P1-T03 | OAuth Flow Execution | 1. Run `npm run get-token` (or equivalent auth script). 2. Complete browser consent flow. 3. Check `token.json` is created. | OAuth token saved locally. Browser consent completes without error. | **Pass:** `token.json` exists with valid `access_token` and `refresh_token` fields. **Fail:** Auth error, missing token fields. | 🔴 Critical |
| P1-T04 | Credential Security Audit | 1. Run `git status` after adding all files. 2. Verify `credentials.json`, `token.json`, `.env` are NOT listed. 3. Check `.gitignore` entries. | Sensitive files excluded from version control. | **Pass:** No sensitive files in `git status`. **Fail:** Any credential file tracked. | 🔴 Critical |
| P1-T05 | MCP Server Connectivity — Gmail | 1. Start MCP server. 2. Call `gmail_create_draft` with subject "GrowwPulse Test" and body "Test draft". 3. Open Gmail and verify draft exists. | Draft email appears in Gmail Drafts folder with correct subject and body. | **Pass:** Draft visible in Gmail within 10s. **Fail:** No draft, error response, or timeout. | 🔴 Critical |
| P1-T06 | MCP Server Connectivity — Docs | 1. Call `docs_create` with title "GrowwPulse Test Doc" and body content. 2. Verify doc appears in Google Drive. | Google Doc created and accessible. | **Pass:** Doc visible in Drive with correct title. **Fail:** No doc created or error returned. | 🟡 Medium |
| P1-T07 | MCP Server Response Time | 1. Time the `gmail_create_draft` call from invocation to confirmation. 2. Repeat 3 times. 3. Calculate average. | Average response time ≤ 5 seconds. | **Pass:** Average ≤ 5s. **Fail:** Average > 5s. | 🟠 High |
| P1-T08 | Dependency Audit | 1. Run `npm audit`. 2. Review results for critical/high vulnerabilities. | No critical vulnerabilities. High vulns documented with justification if present. | **Pass:** 0 critical vulns. **Fail:** Any critical vuln unaddressed. | 🟡 Medium |

### 3.3 Quality Gates

| Gate ID | Quality Gate | Threshold | Measurement Method |
|:--------|:------------|:----------|:-------------------|
| P1-QG01 | MCP server responds within acceptable latency | Response time ≤ **5 seconds** (averaged over 3 calls) | Timed invocation of `gmail_create_draft` |
| P1-QG02 | Zero credentials in version control | **0** sensitive files tracked by git | `git ls-files` + manual `.gitignore` review |
| P1-QG03 | All dependencies install cleanly | `npm install` exits with code **0**, zero unresolved deps | CI/manual `npm install` run |
| P1-QG04 | OAuth token is valid and refreshable | Token contains `access_token` and `refresh_token` | JSON schema validation of `token.json` |

### 3.4 Evaluation Method

- **Manual Verification:** Walk through directory structure against specification document.
- **Automated Script:** Create `tests/phase1-verify.js` that programmatically checks directory existence, `.gitignore` contents, and `package.json` schema.
- **MCP Connectivity Test:** Execute `gmail_create_draft` and `docs_create` via the configured MCP client; verify output in Gmail/Drive.
- **Gmail Inbox Verification:** Manually confirm test draft appears in Gmail Drafts.

---

## 4. Phase 2 — Review Data Ingestion Pipeline

**Objective:** Build a pipeline that fetches public App Store and Play Store reviews for the Groww app (last 8–12 weeks), normalizes them to a common schema, scrubs PII, deduplicates, and stores the clean dataset.

### 4.1 Exit Criteria

- [ ] Reviews fetched from **both** App Store (RSS feed) and Play Store (public data)
- [ ] All reviews normalized to standard schema: `rating`, `title`, `text`, `date`, `source`
- [ ] PII scrubbing removes all email addresses, phone numbers, usernames, and user IDs
- [ ] Date range filtering correctly limits to last 8–12 weeks
- [ ] Duplicate reviews detected and removed (same `text` + `source` + `date`)
- [ ] Mock data fallback works when live sources are unavailable
- [ ] Clean dataset saved to `data/reviews.json` (or equivalent)
- [ ] Ingestion script is re-runnable without duplicating existing data
- [ ] Ingestion log captures source counts, dates, scrubbed PII count, and duplicates removed
- [ ] ≥ 50 total reviews ingested across both sources

### 4.2 Test Cases

| Test ID | Test Name | Steps | Expected Result | Pass/Fail Criteria | Severity |
|:--------|:----------|:------|:----------------|:-------------------|:---------|
| P2-T01 | App Store Fetch | 1. Run ingestion for App Store source only. 2. Verify reviews are returned. 3. Check `source` field = `app_store`. | Reviews fetched from Apple RSS feed. All entries have `source: "app_store"`. | **Pass:** ≥ 1 review with correct source. **Fail:** 0 reviews or wrong source value. | 🔴 Critical |
| P2-T02 | Play Store Fetch | 1. Run ingestion for Play Store source only. 2. Verify reviews are returned. 3. Check `source` field = `play_store`. | Reviews fetched from Play Store public data. All entries have `source: "play_store"`. | **Pass:** ≥ 1 review with correct source. **Fail:** 0 reviews or wrong source value. | 🔴 Critical |
| P2-T03 | Schema Normalization | 1. Fetch reviews from both sources. 2. Validate every review object against schema: `{ rating: number, title: string, text: string, date: string, source: string }`. | All reviews conform to the normalized schema. No extra or missing fields. | **Pass:** 100% schema compliance. **Fail:** Any review missing a required field or having wrong type. | 🔴 Critical |
| P2-T04 | PII Scrubbing — Email Injection | 1. Inject a review with known email `test@example.com` embedded in text. 2. Run PII scrubber. 3. Verify the email is removed or replaced with `[REDACTED]`. | Email address is not present in the output text. | **Pass:** Email string fully absent from output. **Fail:** Email partially or fully present. | 🔴 Critical |
| P2-T05 | PII Scrubbing — Phone Injection | 1. Inject a review with phone number `+91-9876543210` in text. 2. Run PII scrubber. 3. Verify. | Phone number is redacted. | **Pass:** Phone string absent. **Fail:** Phone present. | 🔴 Critical |
| P2-T06 | PII Scrubbing — Username Injection | 1. Inject a review with pattern `@username123` in text. 2. Run PII scrubber. 3. Verify. | Username handle is redacted. | **Pass:** `@username123` absent. **Fail:** Handle present. | 🟠 High |
| P2-T07 | Date Range Filtering | 1. Inject reviews with dates: today, 6 weeks ago, 10 weeks ago, 14 weeks ago. 2. Run date filter (8–12 week window). 3. Verify only the 10-week-old review passes. | Only reviews within the 8–12 week window are retained. Today and 6-week-old are included (within 12 weeks). 14-week-old is excluded. | **Pass:** Correct reviews retained per window. **Fail:** Any review incorrectly included/excluded. | 🟠 High |
| P2-T08 | Deduplication — Exact Match | 1. Insert two identical reviews (same `text`, `source`, `date`). 2. Run dedup logic. 3. Count output reviews. | Only one copy retained. | **Pass:** Duplicate removed; count decremented by 1. **Fail:** Both copies present. | 🟠 High |
| P2-T09 | Deduplication — Near Match | 1. Insert two reviews with same `text` but different `date` values. 2. Run dedup. | Both reviews retained (different dates = not duplicates). | **Pass:** Both reviews present. **Fail:** One incorrectly removed. | 🟡 Medium |
| P2-T10 | Mock Data Fallback | 1. Disable network access or point to invalid URL. 2. Run ingestion. 3. Verify mock data is loaded from `data/mock-reviews.json`. | Pipeline gracefully falls back to mock data. No crash. Console logs indicate fallback. | **Pass:** Mock data loaded, ≥ 50 reviews, no error thrown. **Fail:** Crash, empty dataset, or silent failure. | 🟠 High |
| P2-T11 | Minimum Review Count | 1. Run full ingestion pipeline (live or mock). 2. Count total reviews in output dataset. | Total reviews ≥ 50. | **Pass:** Count ≥ 50. **Fail:** Count < 50. | 🟠 High |
| P2-T12 | Idempotent Re-Run | 1. Run ingestion pipeline. Record count. 2. Run ingestion pipeline again. Record count. | Count is identical between runs. No duplicated records. | **Pass:** Same count both runs. **Fail:** Count increases on re-run. | 🟡 Medium |

### 4.3 Quality Gates

| Gate ID | Quality Gate | Threshold | Measurement Method |
|:--------|:------------|:----------|:-------------------|
| P2-QG01 | Total review count | ≥ **50** reviews ingested | `wc -l data/reviews.json` or programmatic count |
| P2-QG02 | Field completeness | **100%** of reviews have all 5 required fields populated (non-null, non-empty) | Schema validation script |
| P2-QG03 | Zero PII leaks | **0** PII patterns detected in final output | Regex scan for emails, phones, @-handles, and known PII patterns |
| P2-QG04 | Dual-source coverage | Reviews present from **both** `app_store` and `play_store` | Group-by on `source` field |
| P2-QG05 | Date range compliance | **100%** of reviews fall within the configured 8–12 week window | Min/max date validation |
| P2-QG06 | Deduplication effectiveness | **0** exact-duplicate review pairs in output | Hash-based duplicate scan |

### 4.4 Evaluation Method

- **Automated Test Suite:** `tests/phase2-ingestion.test.js` — unit tests for each fetcher, PII scrubber, dedup module, and date filter.
- **PII Audit Script:** `tests/pii-scanner.js` — scans output dataset with regex patterns for emails (`/\S+@\S+\.\S+/`), phones (`/\+?\d[\d\s\-]{8,}/`), and @-handles (`/@\w+/`).
- **Data Validation:** JSON schema validation on every record in the output file.
- **Manual Spot-Check:** Randomly sample 10 reviews and verify correctness of fields, PII removal, and source attribution.

---

## 5. Phase 3 — Theme Classification Engine

**Objective:** Classify all ingested reviews into a maximum of 5 meaningful themes, score themes by frequency and sentiment, and select 3 representative user quotes.

### 5.1 Exit Criteria

- [ ] Every review in the dataset is assigned to exactly one theme
- [ ] Total number of distinct themes is ≤ 5
- [ ] Each theme has a descriptive name (2–5 words) and a summary
- [ ] Themes are scored by: review count, average star rating, and sentiment tendency
- [ ] Top 3 themes are ranked and selectable for the pulse note
- [ ] 3 representative user quotes selected (diverse themes, no PII, compelling text)
- [ ] Keyword classifier works independently as a fallback if LLM is unavailable
- [ ] Theme classification results saved to `data/themes.json` (or equivalent)
- [ ] Classification is deterministic given the same input (or within acceptable variance)

### 5.2 Test Cases

| Test ID | Test Name | Steps | Expected Result | Pass/Fail Criteria | Severity |
|:--------|:----------|:------|:----------------|:-------------------|:---------|
| P3-T01 | Full Review Coverage | 1. Run classification on entire dataset. 2. Count classified vs. total reviews. | Every review is assigned to a theme. No "unclassified" bucket. | **Pass:** Classified count = total count. **Fail:** Any unclassified review. | 🔴 Critical |
| P3-T02 | Theme Count Limit | 1. Run classification. 2. Count distinct themes. | Number of distinct themes ≤ 5. | **Pass:** Theme count ≤ 5. **Fail:** Theme count > 5. | 🔴 Critical |
| P3-T03 | Theme Naming Quality | 1. Inspect theme names. 2. Verify each name is 2–5 words and descriptive. | Theme names are human-readable and descriptive (e.g., "App Stability & Performance", not "cluster_0"). | **Pass:** All names are descriptive, ≤ 5 words. **Fail:** Any generic or machine-generated name. | 🟠 High |
| P3-T04 | Theme Scoring — Review Count | 1. For each theme, count assigned reviews. 2. Verify count matches theme metadata. | Theme `reviewCount` field matches actual assigned reviews. | **Pass:** Counts match exactly. **Fail:** Any mismatch. | 🟠 High |
| P3-T05 | Theme Scoring — Average Rating | 1. For each theme, calculate average rating from assigned reviews. 2. Compare to theme metadata. | Theme `avgRating` matches calculated average (±0.1 tolerance). | **Pass:** Within tolerance. **Fail:** Deviation > 0.1. | 🟡 Medium |
| P3-T06 | Top 3 Theme Ranking | 1. Sort themes by review count (descending). 2. Verify the top 3 themes are correctly identified. | Top 3 themes ranked by frequency match manual sort. | **Pass:** Ranking matches. **Fail:** Incorrect order. | 🟠 High |
| P3-T07 | Quote Selection — Count | 1. Run quote selection. 2. Count selected quotes. | Exactly 3 quotes selected. | **Pass:** 3 quotes. **Fail:** ≠ 3 quotes. | 🔴 Critical |
| P3-T08 | Quote Selection — PII Free | 1. Run PII scanner on all 3 selected quotes. | No PII detected in any quote. | **Pass:** 0 PII matches. **Fail:** Any PII found. | 🔴 Critical |
| P3-T09 | Quote Selection — Diversity | 1. Check the theme assignment of each selected quote. 2. Count distinct themes among quotes. | Quotes come from ≥ 2 distinct themes (ideally 3). | **Pass:** ≥ 2 distinct themes represented. **Fail:** All 3 quotes from the same theme. | 🟠 High |
| P3-T10 | Keyword Classifier Fallback | 1. Disable LLM/API access. 2. Run classification with keyword-only classifier. 3. Verify themes are produced. | Keyword classifier produces valid themes independently. No crash. | **Pass:** Themes produced, reviews classified, no errors. **Fail:** Crash or empty output. | 🟠 High |
| P3-T11 | Classification Consistency | 1. Run classification on same input dataset twice. 2. Compare theme assignments. | ≥ 90% of reviews assigned to the same theme across runs (allows minor variance for LLM-based classification). | **Pass:** ≥ 90% match rate. **Fail:** < 90% match rate. | 🟡 Medium |

### 5.3 Quality Gates

| Gate ID | Quality Gate | Threshold | Measurement Method |
|:--------|:------------|:----------|:-------------------|
| P3-QG01 | Review coverage | **100%** of reviews assigned to a theme | Classified count / total count |
| P3-QG02 | Theme count | ≤ **5** distinct themes | Count of unique theme IDs |
| P3-QG03 | Quote PII compliance | **0** PII patterns in selected quotes | PII scanner on quote text |
| P3-QG04 | Quote diversity score | Quotes from ≥ **2** distinct themes | Unique theme count among 3 quotes |
| P3-QG05 | Classification consistency | ≥ **90%** same-assignment rate across 2 runs | Diff comparison of theme assignments |
| P3-QG06 | Theme name quality | **100%** of themes have human-readable names (2–5 words) | Manual review + length check |

### 5.4 Evaluation Method

- **Automated Test Suite:** `tests/phase3-classification.test.js` — unit tests for classifier, scorer, and quote selector modules.
- **PII Scan on Quotes:** Run `tests/pii-scanner.js` specifically on the 3 selected quotes.
- **Manual Theme Review:** A human reviewer validates that theme names and groupings are semantically meaningful and not arbitrary.
- **Consistency Test:** Run classification twice with identical input; compute assignment match rate.
- **Keyword Classifier Isolation Test:** Run classification with `--classifier=keyword` flag (or equivalent) to verify fallback works independently.

---

## 6. Phase 4 — Weekly Pulse Note Generator

**Objective:** Generate a ≤ 250-word weekly pulse note in Markdown and HTML, following the prescribed template, with top 3 themes, 3 user quotes, and 3 action ideas.

### 6.1 Exit Criteria

- [ ] Pulse note generated from theme classification output
- [ ] Note follows the specified template structure exactly (Themes → Quotes → Actions → Footer)
- [ ] Word count is ≤ 250 words
- [ ] Contains exactly 3 top themes with mention count and average rating
- [ ] Contains exactly 3 user quotes with star rating and source attribution
- [ ] Contains exactly 3 action ideas linked to top themes
- [ ] Footer includes review count, date range, and sources
- [ ] Markdown version saved to `output/pulse.md`
- [ ] HTML version generated and saved to `output/pulse.html`
- [ ] HTML is valid and renders correctly in email clients

### 6.2 Test Cases

| Test ID | Test Name | Steps | Expected Result | Pass/Fail Criteria | Severity |
|:--------|:----------|:------|:----------------|:-------------------|:---------|
| P4-T01 | Standard Generation | 1. Run pulse generator with valid theme data (5 themes, 50+ reviews). 2. Verify output file is created. | `output/pulse.md` created with content. | **Pass:** File exists and is non-empty. **Fail:** File missing or empty. | 🔴 Critical |
| P4-T02 | Word Count Enforcement | 1. Generate pulse note. 2. Count words in the output (excluding template decoration characters like ━, 📊, etc.). | Word count ≤ 250. | **Pass:** Word count ≤ 250. **Fail:** Word count > 250. | 🔴 Critical |
| P4-T03 | Template Structure — Themes Section | 1. Parse output. 2. Verify "TOP THEMES THIS WEEK" section exists. 3. Count listed themes. | Exactly 3 themes listed with format: `[Theme Name] — [X mentions, avg rating Y★]`. | **Pass:** 3 themes, correct format. **Fail:** Missing section, wrong count, or wrong format. | 🔴 Critical |
| P4-T04 | Template Structure — Quotes Section | 1. Parse output. 2. Verify "USER VOICES" section exists. 3. Count listed quotes. | Exactly 3 quotes with format: `"[quote]" — ★X, [Source]`. | **Pass:** 3 quotes, correct format. **Fail:** Missing section, wrong count, or wrong format. | 🔴 Critical |
| P4-T05 | Template Structure — Actions Section | 1. Parse output. 2. Verify "ACTION IDEAS" section exists. 3. Count listed actions. | Exactly 3 action items, each linked to a theme. | **Pass:** 3 actions present. **Fail:** Missing section or wrong count. | 🔴 Critical |
| P4-T06 | Template Structure — Footer | 1. Parse output. 2. Verify footer line exists. | Footer contains: reviews analyzed count, date range, and "App Store, Play Store". | **Pass:** All 3 footer elements present. **Fail:** Any element missing. | 🟠 High |
| P4-T07 | HTML Conversion | 1. Generate pulse HTML. 2. Validate HTML structure. 3. Open in browser. | Valid HTML that renders with proper formatting, headings, and styling. | **Pass:** HTML validates, renders cleanly in browser. **Fail:** Invalid HTML or broken rendering. | 🟠 High |
| P4-T08 | Edge Case — Zero Reviews | 1. Run generator with empty review dataset. 2. Check behavior. | Generator produces graceful error message or a minimal "no data" pulse note. No crash. | **Pass:** Graceful handling, no crash. **Fail:** Unhandled exception or corrupt output. | 🟠 High |
| P4-T09 | Edge Case — Single Theme | 1. Run generator with data producing only 1 theme. 2. Verify output. | Pulse note adjusts: shows 1 theme (not 3), adjusts quotes and actions accordingly. Clear indication of limited data. | **Pass:** Valid output with appropriate content. **Fail:** Crash, template errors, or 3 identical themes. | 🟡 Medium |
| P4-T10 | Edge Case — Very Long Quotes | 1. Inject quotes > 100 words each. 2. Generate pulse note. 3. Check word count. | Quotes are truncated or shorter quotes are selected to stay within 250-word limit. | **Pass:** Total word count ≤ 250. **Fail:** Word count > 250 due to long quotes. | 🟠 High |
| P4-T11 | Date Range Display | 1. Generate pulse note. 2. Verify the "Week of [DATE_RANGE]" header. | Date range matches the actual review date range in the input dataset. Format: `Week of May 12 – May 18, 2026`. | **Pass:** Correct, human-readable date range. **Fail:** Wrong dates or bad format. | 🟡 Medium |
| P4-T12 | PII in Output | 1. Run PII scanner on the entire generated pulse note. | Zero PII patterns detected. | **Pass:** 0 PII matches. **Fail:** Any PII found. | 🔴 Critical |

### 6.3 Quality Gates

| Gate ID | Quality Gate | Threshold | Measurement Method |
|:--------|:------------|:----------|:-------------------|
| P4-QG01 | Word count | ≤ **250** words | Automated word counter (excludes emoji/decoration) |
| P4-QG02 | Section completeness | **All 4 sections** present (Header, Themes, Quotes, Actions + Footer) | Template parser / regex validation |
| P4-QG03 | HTML validity | **0** HTML validation errors | W3C HTML validator or `htmlhint` |
| P4-QG04 | PII compliance | **0** PII patterns in generated output | PII scanner on full output |
| P4-QG05 | Content accuracy | Theme names, counts, and ratings in pulse match `data/themes.json` | Cross-reference script |

### 6.4 Evaluation Method

- **Automated Test Suite:** `tests/phase4-generator.test.js` — tests for template rendering, word count, section parsing, edge cases.
- **Word Count Script:** `tests/word-count.js` — counts words in output excluding template decoration characters.
- **HTML Validation:** Run `output/pulse.html` through `htmlhint` or W3C validation service.
- **PII Scan:** Run `tests/pii-scanner.js` on `output/pulse.md` and `output/pulse.html`.
- **Visual Inspection:** Open `output/pulse.html` in Gmail preview and 2+ email clients to verify rendering.

---

## 7. Phase 5 — MCP Email & Docs Delivery

**Objective:** Deliver the generated pulse note as a Gmail draft/email and optionally as a Google Doc, using MCP servers. Handle errors gracefully with local fallback.

### 7.1 Exit Criteria

- [ ] Gmail draft created with correct subject, recipient, and HTML body
- [ ] Email can be sent (not just drafted) via MCP `gmail_send_email`
- [ ] Email subject follows format: `📊 GrowwPulse — Weekly Review Digest (Week of [DATE])`
- [ ] Email body is properly formatted HTML (not raw Markdown)
- [ ] Google Doc created with pulse content (optional feature)
- [ ] Error handling covers: network failure, auth token expiry, API quota exceeded
- [ ] Local fallback saves output to `output/` directory when MCP delivery fails
- [ ] Delivery status logged with timestamps and confirmation IDs
- [ ] Email delivered within 30 seconds of invocation

### 7.2 Test Cases

| Test ID | Test Name | Steps | Expected Result | Pass/Fail Criteria | Severity |
|:--------|:----------|:------|:----------------|:-------------------|:---------|
| P5-T01 | Gmail Draft Creation | 1. Run delivery module with valid pulse HTML. 2. Call `gmail_create_draft`. 3. Check Gmail Drafts. | Draft appears in Gmail with correct subject, recipient, and formatted body. | **Pass:** Draft present, subject and body match. **Fail:** No draft, wrong content, or error. | 🔴 Critical |
| P5-T02 | Email Subject Format | 1. Create draft. 2. Inspect subject line. | Subject matches: `📊 GrowwPulse — Weekly Review Digest (Week of [DATE])` where [DATE] is the correct week. | **Pass:** Exact format match with correct date. **Fail:** Wrong format or wrong date. | 🟠 High |
| P5-T03 | Email Body — HTML Rendering | 1. Open draft in Gmail. 2. Verify HTML renders (headings, bullets, emoji, formatting). | Email body displays as formatted HTML, not raw tags or Markdown. | **Pass:** Clean HTML rendering. **Fail:** Raw HTML tags visible or Markdown syntax shown. | 🟠 High |
| P5-T04 | Email Send | 1. Call `gmail_send_email` with the pulse content. 2. Check Sent folder. 3. Check Inbox (if sent to self). | Email appears in Sent folder. If sent to self, appears in Inbox. | **Pass:** Email in Sent folder, received in target inbox. **Fail:** Email not sent or not received. | 🔴 Critical |
| P5-T05 | Google Docs Creation | 1. Call `docs_create` with pulse content. 2. Check Google Drive. | Google Doc created with title `GrowwPulse — Week of [DATE]` and correct content. | **Pass:** Doc exists in Drive with correct title and content. **Fail:** No doc or wrong content. | 🟡 Medium |
| P5-T06 | Error — Network Failure | 1. Disconnect network / block MCP server endpoint. 2. Run delivery. 3. Verify error handling. | Graceful error message logged. Local fallback activated (output saved to `output/` dir). No crash. | **Pass:** Error logged, local file saved, no crash. **Fail:** Unhandled exception or silent failure. | 🟠 High |
| P5-T07 | Error — Auth Token Expiry | 1. Invalidate or expire the OAuth token. 2. Run delivery. 3. Verify behavior. | System detects auth failure. Attempts token refresh. If refresh fails, logs clear error and falls back to local save. | **Pass:** Token refresh attempted; graceful fallback. **Fail:** Crash, hung process, or no error message. | 🟠 High |
| P5-T08 | Error — API Quota Exceeded | 1. Simulate quota exceeded response (mock or exhaust quota). 2. Run delivery. 3. Verify behavior. | System detects rate limiting. Logs quota error with retry guidance. Falls back to local save. | **Pass:** Quota error logged, local fallback works. **Fail:** Crash or infinite retry loop. | 🟡 Medium |
| P5-T09 | Local Fallback Save | 1. Force delivery failure. 2. Verify local files saved. | Pulse note saved as `output/pulse-[DATE].md` and `output/pulse-[DATE].html` locally. | **Pass:** Both files saved with correct naming and content. **Fail:** Files missing or corrupt. | 🟠 High |
| P5-T10 | Delivery Timing | 1. Time the full delivery cycle (draft creation + confirmation). 2. Repeat 3 times. | Average delivery time ≤ 30 seconds. | **Pass:** Average ≤ 30s. **Fail:** Average > 30s. | 🟡 Medium |
| P5-T11 | Delivery Logging | 1. Run delivery successfully. 2. Check logs. | Log contains: timestamp, delivery method (email/docs), status (success/fail), confirmation ID or error details. | **Pass:** All log fields present. **Fail:** Missing fields or no log entry. | 🟡 Medium |

### 7.3 Quality Gates

| Gate ID | Quality Gate | Threshold | Measurement Method |
|:--------|:------------|:----------|:-------------------|
| P5-QG01 | Email delivery time | ≤ **30 seconds** from invocation to confirmation | Timed delivery execution |
| P5-QG02 | HTML formatting fidelity | Email renders correctly in **Gmail web** and **Gmail mobile** | Visual inspection in both clients |
| P5-QG03 | Error handling coverage | **3/3** error scenarios handled (network, auth, quota) | Execute each error test case |
| P5-QG04 | Local fallback reliability | Fallback produces valid output in **100%** of failure scenarios | Force failures, verify local files |
| P5-QG05 | Delivery logging completeness | **100%** of deliveries (success and failure) are logged | Log audit after test runs |

### 7.4 Evaluation Method

- **Automated Test Suite:** `tests/phase5-delivery.test.js` — tests for draft creation, email send, error handling, and fallback.
- **Gmail Verification:** Manual inspection of Drafts and Sent folders after each test.
- **Google Docs Verification:** Manual check of Google Drive for created documents.
- **Error Simulation:** Use network mocking, token invalidation, and quota simulation to trigger each error path.
- **Timing Measurements:** Script that runs delivery 3 times and reports average duration.

---

## 8. Phase 6 — End-to-End Integration & Polish

**Objective:** Validate the complete GrowwPulse pipeline from review ingestion to email delivery. Verify CLI interface, configuration, performance, and output spec compliance.

### 8.1 Exit Criteria

- [ ] Full pipeline executes end-to-end with **live data** (both sources)
- [ ] Full pipeline executes end-to-end with **mock data** (fallback scenario)
- [ ] CLI accepts and validates all required arguments
- [ ] Configuration file validated at startup (malformed config = clear error)
- [ ] Full pipeline completes in < 2 minutes (wall clock)
- [ ] Final output matches the specification in `Problem.Statment.md` exactly
- [ ] No regressions from Phases 1–5 (all previous tests still pass)
- [ ] Error messages are user-friendly and actionable
- [ ] Documentation is complete (README, eval.md, inline comments)
- [ ] Code is clean, linted, and follows consistent style

### 8.2 Test Cases

| Test ID | Test Name | Steps | Expected Result | Pass/Fail Criteria | Severity |
|:--------|:----------|:------|:----------------|:-------------------|:---------|
| P6-T01 | E2E — Live Data Full Run | 1. Run `node src/index.js` (or equivalent) with live config. 2. Wait for completion. 3. Verify Gmail draft created. | Pipeline completes: reviews fetched → themes classified → pulse generated → email drafted. | **Pass:** Draft in Gmail with correct pulse content. **Fail:** Pipeline error at any stage. | 🔴 Critical |
| P6-T02 | E2E — Mock Data Full Run | 1. Run pipeline with `--mock` flag or disable network. 2. Wait for completion. 3. Verify output. | Pipeline completes using mock data. Same quality output (themes, pulse, email). | **Pass:** End-to-end success with mock data. **Fail:** Pipeline fails or output quality drops. | 🔴 Critical |
| P6-T03 | E2E — Output Spec Compliance | 1. Run pipeline. 2. Compare output against spec in `Problem.Statment.md`. 3. Check: ≤ 5 themes, ≤ 250 words, 3 quotes, 3 actions, 0 PII. | Output matches every constraint in the specification. | **Pass:** All spec constraints met. **Fail:** Any spec violation. | 🔴 Critical |
| P6-T04 | CLI — Help Flag | 1. Run `node src/index.js --help`. 2. Verify help output. | Displays usage information with available flags, arguments, and descriptions. | **Pass:** Help text displayed, exit code 0. **Fail:** Error or no help text. | 🟡 Medium |
| P6-T05 | CLI — Invalid Arguments | 1. Run with invalid flag: `node src/index.js --invalid-flag`. 2. Verify error. | Clear error message indicating unknown flag. Non-zero exit code. | **Pass:** Error message shown, exit code ≠ 0. **Fail:** Silent ignore or crash. | 🟡 Medium |
| P6-T06 | CLI — Mock Flag | 1. Run `node src/index.js --mock`. 2. Verify mock data is used. | Console log confirms mock data mode. Output generated from mock data. | **Pass:** Mock mode confirmed in logs, valid output. **Fail:** Live data used or crash. | 🟠 High |
| P6-T07 | Config Validation — Valid Config | 1. Provide a well-formed config file. 2. Run pipeline. | Pipeline starts successfully. Config values applied correctly. | **Pass:** Pipeline executes with correct config values. **Fail:** Config ignored or error. | 🟠 High |
| P6-T08 | Config Validation — Malformed Config | 1. Provide a config file with invalid JSON or missing required fields. 2. Run pipeline. | Clear error message indicating config issue. Pipeline does not proceed with bad config. | **Pass:** Error message with specific field/line info. **Fail:** Crash, silent use of defaults, or no error. | 🟠 High |
| P6-T09 | Config Validation — Missing Config | 1. Delete or rename config file. 2. Run pipeline. | Pipeline uses defaults or prompts for config. Clear log message about using defaults. | **Pass:** Graceful fallback to defaults with log message. **Fail:** Crash or silent behavior. | 🟡 Medium |
| P6-T10 | Performance — Full Pipeline Timing | 1. Run full pipeline with mock data. 2. Measure wall-clock time from start to email draft confirmation. 3. Repeat 3 times. | Average execution time < 2 minutes. | **Pass:** Average < 120 seconds. **Fail:** Average ≥ 120 seconds. | 🟠 High |
| P6-T11 | Performance — Memory Usage | 1. Monitor memory usage during pipeline execution. 2. Check peak RSS. | Peak memory < 512 MB. | **Pass:** Peak RSS < 512 MB. **Fail:** Peak RSS ≥ 512 MB. | 🟡 Medium |
| P6-T12 | Regression — Phase 1–5 Tests | 1. Run all test suites from Phases 1–5. 2. Verify all pass. | Zero regressions. All previously passing tests still pass. | **Pass:** 100% pass rate on all prior tests. **Fail:** Any previously passing test now fails. | 🔴 Critical |
| P6-T13 | Code Quality — Lint Check | 1. Run linter (ESLint / project linter). 2. Review results. | Zero lint errors. Warnings documented if present. | **Pass:** 0 errors, ≤ 10 warnings. **Fail:** Any lint error. | 🟡 Medium |
| P6-T14 | Documentation Completeness | 1. Verify README.md has: setup instructions, usage, architecture overview, and troubleshooting. 2. Verify eval.md exists and is current. 3. Verify inline code comments on complex functions. | All documentation artifacts are present and accurate. | **Pass:** All docs present and accurate. **Fail:** Any missing or outdated doc. | 🟡 Medium |

### 8.3 Quality Gates

| Gate ID | Quality Gate | Threshold | Measurement Method |
|:--------|:------------|:----------|:-------------------|
| P6-QG01 | Full pipeline execution time | < **2 minutes** (120 seconds) | Wall-clock timing, averaged over 3 runs |
| P6-QG02 | End-to-end success rate | **100%** success on both live and mock data runs | Execute E2E tests |
| P6-QG03 | Specification compliance | **100%** of spec constraints met (themes ≤ 5, words ≤ 250, quotes = 3, actions = 3, PII = 0) | Automated spec checker |
| P6-QG04 | Regression test pass rate | **100%** of Phase 1–5 tests pass | Run full test suite |
| P6-QG05 | Code quality | **0** lint errors | Run `npm run lint` |
| P6-QG06 | Peak memory usage | < **512 MB** RSS | Process memory monitoring |

### 8.4 Evaluation Method

- **Full E2E Test:** Run `tests/phase6-e2e.test.js` — orchestrates the complete pipeline and validates output.
- **Performance Benchmarking:** `tests/benchmark.js` — runs pipeline 3 times, reports min/avg/max time and peak memory.
- **Spec Compliance Checker:** `tests/spec-check.js` — parses pulse output and validates against every constraint in `Problem.Statment.md`.
- **Regression Suite:** `npm test` — runs all tests from all phases.
- **Manual Review:** Final walkthrough of output in Gmail, source code, and documentation.

---

## 9. Defect Tracking Template

Use this template to log all defects found during evaluation. Track defects in a dedicated file (`Docs/defects.md`) or project issue tracker.

### Defect Record Template

```markdown
### Defect [DXX-NNN]

| Field           | Value                                      |
|:----------------|:-------------------------------------------|
| **Defect ID**   | DXX-NNN (XX = phase, NNN = sequence)       |
| **Title**       | [Short descriptive title]                  |
| **Phase**       | Phase X                                    |
| **Test Case**   | PX-TNN                                     |
| **Severity**    | 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low |
| **Status**      | Open / In Progress / Fixed / Verified / Won't Fix |
| **Found By**    | [Name]                                     |
| **Found Date**  | YYYY-MM-DD                                 |
| **Description** | [Detailed description of the defect]       |
| **Steps to Reproduce** | 1. ... 2. ... 3. ...               |
| **Expected Result**    | [What should happen]               |
| **Actual Result**      | [What actually happened]           |
| **Root Cause**  | [If known]                                 |
| **Fix**         | [Description of the fix applied]           |
| **Fixed Date**  | YYYY-MM-DD                                 |
| **Verified By** | [Name]                                     |
| **Verified Date** | YYYY-MM-DD                               |
```

### Defect ID Convention

| Phase | Prefix | Example |
|:------|:-------|:--------|
| Phase 1 — Foundation | D01-XXX | D01-001 |
| Phase 2 — Ingestion | D02-XXX | D02-001 |
| Phase 3 — Classification | D03-XXX | D03-001 |
| Phase 4 — Generator | D04-XXX | D04-001 |
| Phase 5 — Delivery | D05-XXX | D05-001 |
| Phase 6 — Integration | D06-XXX | D06-001 |

### Defect Summary Dashboard

| Phase | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | Total | Open | Closed |
|:------|:-----------|:--------|:---------|:------|:------|:-----|:-------|
| Phase 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Phase 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Phase 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Phase 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Phase 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Phase 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

---

## 10. Regression Testing Checklist

Run this full checklist before declaring any phase complete (starting from Phase 2 onward). All items from previous phases must still pass.

### After Phase 2 Completion

- [ ] **P1-T01** Directory structure intact
- [ ] **P1-T02** `npm install` clean
- [ ] **P1-T04** Credential security audit passes
- [ ] **P1-T05** MCP Gmail connectivity works
- [ ] **P2-T01** through **P2-T12** all pass

### After Phase 3 Completion

- [ ] All Phase 1 regression items pass
- [ ] **P2-T01** through **P2-T12** all pass (ingestion not broken)
- [ ] **P2-QG01** through **P2-QG06** all met
- [ ] **P3-T01** through **P3-T11** all pass

### After Phase 4 Completion

- [ ] All Phase 1–2 regression items pass
- [ ] **P3-T01** through **P3-T11** all pass (classification not broken)
- [ ] **P3-QG01** through **P3-QG06** all met
- [ ] **P4-T01** through **P4-T12** all pass

### After Phase 5 Completion

- [ ] All Phase 1–3 regression items pass
- [ ] **P4-T01** through **P4-T12** all pass (generator not broken)
- [ ] **P4-QG01** through **P4-QG05** all met
- [ ] **P5-T01** through **P5-T11** all pass

### After Phase 6 Completion (Final Gate)

- [ ] All Phase 1–5 regression items pass
- [ ] **P5-T01** through **P5-T11** all pass (delivery not broken)
- [ ] **P5-QG01** through **P5-QG05** all met
- [ ] **P6-T01** through **P6-T14** all pass
- [ ] **P6-T12** (regression meta-test) confirms 100% prior test pass rate
- [ ] Zero open Critical or High defects
- [ ] All Medium defects documented with disposition (fixed or deferred with justification)

---

## 11. Final Sign-Off

This section is completed when all 6 phases pass evaluation and the project is ready for release.

### Release Readiness Criteria

| # | Criterion | Status | Evidence |
|:--|:----------|:-------|:---------|
| 1 | All 68 test cases pass (P1-T01 through P6-T14) | ☐ Not Met | — |
| 2 | All quality gates across all 6 phases met | ☐ Not Met | — |
| 3 | Zero open Critical defects | ☐ Not Met | — |
| 4 | Zero open High defects | ☐ Not Met | — |
| 5 | All Medium defects documented with disposition | ☐ Not Met | — |
| 6 | Full E2E test with live data passes | ☐ Not Met | — |
| 7 | Full E2E test with mock data passes | ☐ Not Met | — |
| 8 | Pipeline execution < 2 minutes | ☐ Not Met | — |
| 9 | Output matches Problem Statement spec exactly | ☐ Not Met | — |
| 10 | Documentation complete (README, eval.md, inline) | ☐ Not Met | — |

### Test Execution Summary

| Metric | Value |
|:-------|:------|
| **Total Test Cases** | 68 |
| **Passed** | — |
| **Failed** | — |
| **Blocked** | — |
| **Pass Rate** | — % |
| **Total Defects Found** | — |
| **Critical/High Defects Open** | — |
| **Execution Date** | — |

### Approval

| Role | Name | Date | Signature |
|:-----|:-----|:-----|:----------|
| **Developer** | | | ☐ Approved |
| **Reviewer** | | | ☐ Approved |
| **Project Lead** | | | ☐ Approved |

### Notes

_Record any final observations, known limitations, or deferred items here._

---

> **Document End**  
> GrowwPulse Evaluation Framework v1.0

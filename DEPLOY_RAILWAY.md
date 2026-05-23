# Deployment to Railway

This document explains how to deploy the `google-mcp-server` to Railway.

## Overview
- The app uses Google OAuth to access Google Docs and Gmail APIs.
- For production, set secrets in Railway environment variables rather than committing credentials.

## Recommended env vars (set in Railway project settings -> Variables)
- `GOOGLE_CLIENT_SECRETS` — contents of your `credentials.json` (JSON string)
- `GOOGLE_TOKEN_JSON` — contents of `token.json` produced after running OAuth locally (JSON string). Alternatively pre-generate a refreshable token locally and paste it here.
- `AUTO_APPROVE` — set to `false` (recommended). Set to `true` only for automated workflows.

Railway provides `PORT` automatically.

## Deployment methods

### 1) Deploy from GitHub
1. Push your repo to GitHub.
2. Create a new Railway project and connect the GitHub repo.
3. Set environment variables listed above in Railway project settings.
4. Deploy. Railway will build using the `Dockerfile` or detect Python and run the Procfile.

### 2) Deploy using Docker
1. Build locally: `docker build -t google-mcp-server .`
2. Push the image to a registry and deploy on Railway with that image.

## Generating `token.json` (recommended locally)
1. Run locally with `python auth.py` and complete the OAuth flow as described in the README.
2. Copy the generated `token.json` contents and add to `GOOGLE_TOKEN_JSON` in Railway.

## Notes and security
- Do NOT commit `credentials.json` or `token.json` to public repositories. Use Railway environment variables.
- Consider using a Google service account with domain-wide delegation for production server workloads.
- If you need the server to execute actions without human approval, set `AUTO_APPROVE=true` in Railway; otherwise keep it disabled.


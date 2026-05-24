const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

/**
 * Creates and initializes an MCP Client connected to the Google Workspace MCP server.
 * @returns {Promise<Client>} Initialized MCP client
 */
async function getMcpClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("⚠️ Warning: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN is missing in .env.");
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@alanxchen/google-workspace-mcp"],
    env: {
      ...process.env,
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
      GOOGLE_REFRESH_TOKEN: refreshToken,
      PATH: process.env.PATH
    }
  });

  const client = new Client(
    {
      name: "GrowwPulse-Orchestrator-Phase1",
      version: "1.0.0"
    },
    {
      capabilities: {}
    }
  );

  console.log("🔌 Connecting to Google Workspace MCP Server via stdio...");
  await client.connect(transport);
  console.log("✅ MCP connection established successfully.");

  return client;
}

module.exports = { getMcpClient };

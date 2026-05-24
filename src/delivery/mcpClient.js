const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

/**
 * Creates and initializes an MCP Client connected to the Google Workspace MCP server.
 * @returns {Promise<Client>} Initialized MCP client
 */
async function getMcpClient() {
  const mcpUrl = process.env.GOOGLE_MCP_SERVER_URL || "https://google-mcp-server-production-5589.up.railway.app";
  const sseUrl = mcpUrl.endsWith("/sse") ? mcpUrl : `${mcpUrl}/sse`;

  console.log(`🔌 Connecting to Google Workspace MCP Server at ${sseUrl}...`);
  
  // Use SSE for remote MCP servers
  const transport = new SSEClientTransport(new URL(sseUrl));

  const client = new Client(
    {
      name: "GrowwPulse-Orchestrator",
      version: "1.0.0"
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);
  console.log("✅ MCP connection established successfully via SSE.");

  return client;
}

module.exports = { getMcpClient };

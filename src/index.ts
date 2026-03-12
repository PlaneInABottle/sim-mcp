#!/usr/bin/env node
/**
 * sim-mcp - MCP Server Entry Point
 *
 * CLI entry point for the sim MCP server.
 * Handles command-line arguments and starts the MCP server.
 */

import { startServer } from './server.js';

/**
 * Display usage information
 */
function showUsage(): void {
  console.log(`
sim-mcp - MCP stdio server for Sim

USAGE:
  sim-mcp --server
  sim-mcp --help
  sim-mcp --version

OPTIONS:
  --server, -s    Start MCP server on stdio
  --help, -h      Show this help message
  --version, -v   Show version information

SETUP:
  Provide SIM_API_BASE_URL and SIM_API_KEY from your shell or MCP client config.
  See README.md for quick start and .env.example for reference values.
  See AGENTS.md for operational guidance.
`);
}

/**
 * Display version information
 */
function showVersion(): void {
  // Read version from package.json would require additional setup
  // For now, use a constant
  console.log('sim-mcp version 0.0.1');
}

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): { server: boolean; help: boolean; version: boolean } {
  return {
    server: args.includes('--server') || args.includes('-s'),
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
  };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { server, help, version } = parseArgs(args);

  if (help) {
    showUsage();
    process.exit(0);
  }

  if (version) {
    showVersion();
    process.exit(0);
  }

  if (server) {
    try {
      await startServer();
    } catch (error) {
      // Output to stderr for errors
      const message = error instanceof Error ? error.message : 'Unknown error';
      process.stderr.write(`Failed to start server: ${message}\n`);
      process.exit(1);
    }
  } else {
    // No valid option provided
    showUsage();
    process.exit(0);
  }
}

// Run main function
main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});

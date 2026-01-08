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
sim-mcp - MCP server for sim AI workflow platform

USAGE:
  sim-mcp [OPTIONS]

OPTIONS:
  --server, -s    Start MCP server on stdio
  --help, -h      Show this help message
  --version, -v   Show version information

ENVIRONMENT VARIABLES:
  SIM_API_BASE_URL    Base URL of the sim backend API (required)
  SIM_API_KEY         API key for authentication (required)
  SIM_TIMEOUT         Request timeout in milliseconds (default: 30000)
  SIM_RETRIES         Number of retry attempts (default: 3)
  LOG_LEVEL           Logging level: debug, info, warn, error (default: info)

EXAMPLES:
  # Start MCP server
  sim-mcp --server

  # Or using npm script
  npm run start

For more information, see: https://github.com/your-org/sim-mcp
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

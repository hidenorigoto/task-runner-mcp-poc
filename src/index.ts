/**
 * Task Runner MCP Server
 * Entry point for the MCP server
 */

export function main(): void {
  // TODO: Implement MCP server initialization
  // Temporarily using process.stdout.write to avoid console.log warning
  process.stdout.write('Task Runner MCP Server starting...\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
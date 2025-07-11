/**
 * Task Runner MCP Server
 * Entry point for the MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger, LogLevel } from './logger/index.js';
import { taskTools } from './tools/index.js';
import { WorkflowTools } from './workflow/tools.js';

class TaskRunnerMCPServer {
  private server: Server;
  private logger: Logger;
  private workflowTools: WorkflowTools;
  private allTools: any[];

  constructor() {
    this.logger = new Logger({
      logLevel: LogLevel.INFO,
      consoleOutput: false, // Must be false for MCP stdio protocol
      fileOutput: true,
    });
    
    // Initialize workflow tools
    this.workflowTools = new WorkflowTools(this.logger);
    
    // Combine task tools and workflow tools
    this.allTools = [...taskTools, ...this.workflowTools.getTools()];
    
    this.server = new Server(
      {
        name: 'task-runner-mcp-poc',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.logProtocol({
        type: 'request',
        method: 'tools/list',
      });

      return {
        tools: this.allTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.logProtocol({
        type: 'request',
        method: 'tools/call',
        params: { name, arguments: args },
      });

      const tool = this.allTools.find(t => t.name === name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        const result = await tool.handler(args || {});
        
        this.logger.logProtocol({
          type: 'response',
          method: 'tools/call',
          result,
        });

        return {
          content: result.content,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.logProtocol({
          type: 'response',
          method: 'tools/call',
          error: {
            code: ErrorCode.InternalError,
            message: errorMessage,
          },
        });
        
        throw new McpError(ErrorCode.InternalError, errorMessage);
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      this.logger.error('MCP Server error', error);
    };

    // Handle process signals for graceful shutdown
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection', reason);
      this.shutdown();
    });
  }

  private shutdown(): void {
    this.logger.info('MCP Server shutting down...');
    this.logger.close();
    process.exit(0);
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    this.logger.info('Starting Task Runner MCP Server...', {
      metadata: {
        serverName: 'task-runner-mcp-poc',
        version: '0.1.0',
        transport: 'stdio',
      },
    });

    try {
      await this.server.connect(transport);
      this.logger.info('MCP Server connected and ready for requests');
      
      // The MCP server will now run until the connection is closed
      // No need for process.stdin.resume() as the transport handles the connection
    } catch (error) {
      this.logger.error('Failed to start MCP Server', error);
      throw error;
    }
  }
}

export async function main(): Promise<void> {
  const server = new TaskRunnerMCPServer();
  await server.start();
  
  // Keep the process running
  // The server will exit when the stdio connection is closed
  await new Promise(() => {
    // This promise never resolves, keeping the process alive
  });
}

// Auto-start server when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    // For MCP servers, we must not output to stdout as it's used for JSON-RPC
    // Only use stderr for error messages
    process.stderr.write(`Failed to start server: ${error}\n`);
    process.exit(1);
  });
}
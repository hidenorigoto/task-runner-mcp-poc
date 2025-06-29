# Task Runner MCP PoC

A Model Context Protocol (MCP) server for managing AI agent task workflows with structured 6-phase development processes.

**MCP Protocol Version**: 2025-06-18 | **SDK**: TypeScript

## Overview

This MCP server provides Claude Code with structured workflow management capabilities, ensuring consistent and high-quality development processes. It implements a comprehensive 6-phase workflow system that guides development from issue start to completion with built-in quality checks and progress tracking.

### Core Features

- **6-Phase Structured Workflow**: Issue Start → Implementation → Quality Check → PR Creation → Fix (if needed) → Completion
- **Comprehensive State Management**: Track working files, completed tasks, and phase history
- **Rich Tool Interface**: 4 MCP tools for complete workflow control
- **Production-Ready Logging**: Complete JSONL logging of all operations
- **Type-Safe Implementation**: Full TypeScript with Zod validation
- **Extensive Testing**: 130+ tests covering all scenarios
- **Secure Transport**: Uses stdio transport with proper error handling
- **Protocol Compliance**: Follows MCP specification with JSON-RPC 2.0

## Quick Start

### Prerequisites

- Node.js 22.x LTS or higher
- Claude Code (for MCP integration)
- Git (for workflow management)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hidenorigoto/task-runner-mcp-poc.git
   cd task-runner-mcp-poc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Verify installation**
   ```bash
   npm test
   ```

## Claude Code Integration

### MCP Configuration

To use this server with Claude Code, you need to configure it as an MCP server.

#### Method 1: Environment Variable (Recommended)

Set the environment variable to enable MCP in Claude Code:

```bash
export CLAUDE_CODE_MCP_ENABLED=1
```

#### Method 2: Claude Code MCP Configuration

Add to your Claude Code MCP configuration file:

```json
{
  "mcpServers": {
    "task-runner": {
      "command": "node",
      "args": ["/path/to/task-runner-mcp-poc/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Configuration file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`

**Note**: The exact configuration file name may vary. Check your Claude Code installation for:
- `claude_desktop_config.json`
- `config.json`
- `mcp.json`

### Building the Server

Before using with Claude Code, build the server:

```bash
npm run build
```

**Note**: Claude Code will automatically start the MCP server when configured. You don't need to run it manually.

#### Manual Testing (Optional)
For development or testing outside of Claude Code:
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

### Verification

Once configured, Claude Code should have access to these tools:
- `start_issue_workflow`
- `complete_phase`
- `get_current_phase`
- `get_workflow_status`

You can verify by asking Claude Code: "What workflow tools are available?"

## Usage Guide

### Workflow Overview

The Task Runner MCP implements a structured 6-phase workflow:

```
1. Issue Start     → Analyze issue, plan implementation
2. Implementation  → Write code, make changes
3. Quality Check   → Run tests, lint, type check
4. PR Creation     → Create pull request, monitor CI
5. Fix            → Address CI failures (if needed)
6. Completion     → Merge PR, retrospective
```

### Available Tools

#### 1. `start_issue_workflow`
**Purpose**: Initialize a new workflow for a GitHub issue

**Parameters**:
- `issueNumber` (string): GitHub issue number to work on

**Example Usage**:
```javascript
// Claude Code will call:
start_issue_workflow({ issueNumber: "123" })
```

**Response**: Returns structured instructions for the Issue Start phase with preconditions, acceptance criteria, and tasks.

#### 2. `complete_phase`
**Purpose**: Mark current phase as complete and transition to next phase

**Parameters**:
- `phaseResult` (object):
  - `phaseName` (string): Current phase being completed
  - `status` (string): "completed" | "failed" | "skipped"
  - `workingFiles` (array): List of files worked on
  - `completedTasks` (array): List of completed tasks
  - `completedAt` (string): ISO 8601 timestamp
  - `notes` (string, optional): Additional notes
  - `nextPhase` (string, optional): Override default next phase

**Example Usage**:
```javascript
complete_phase({
  phaseResult: {
    phaseName: "implementation",
    status: "completed",
    workingFiles: ["src/feature.ts", "tests/feature.test.ts"],
    completedTasks: ["Implement new feature", "Add unit tests"],
    completedAt: "2025-06-29T10:30:00Z"
  }
})
```

#### 3. `get_current_phase`
**Purpose**: Get current phase instructions and required actions

**Parameters**: None

**Response**: Returns current phase details with preconditions, acceptance criteria, and tasks.

#### 4. `get_workflow_status`
**Purpose**: Get overall workflow progress and status

**Parameters**: None

**Response**: Returns progress summary, completed phases, and working files count.

### Sample Workflow

Here's a complete workflow example:

```bash
# 1. Start workflow for issue #42
start_issue_workflow({ issueNumber: "42" })

# 2. Complete issue start phase
complete_phase({
  phaseResult: {
    phaseName: "issue_start",
    status: "completed",
    workingFiles: [],
    completedTasks: ["Analyzed issue requirements", "Created implementation plan"],
    completedAt: "2025-06-29T10:00:00Z"
  }
})

# 3. Complete implementation phase
complete_phase({
  phaseResult: {
    phaseName: "implementation",
    status: "completed",
    workingFiles: ["src/new-feature.ts", "tests/new-feature.test.ts"],
    completedTasks: ["Implemented feature", "Added tests"],
    completedAt: "2025-06-29T11:30:00Z"
  }
})

# 4. Check current phase
get_current_phase() // Returns quality_check phase instructions

# 5. Get overall status
get_workflow_status() // Shows 2/6 phases completed
```

## Development

### Project Structure

```
task-runner-mcp-poc/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── workflow/             # Workflow management
│   │   ├── WorkflowManager.ts
│   │   ├── phases.ts
│   │   └── tools.ts
│   ├── tools/                # Task management tools
│   ├── logger/               # Logging system
│   └── types/                # TypeScript type definitions
├── tests/                    # Test suite
├── docs/                     # Additional documentation
└── logs/                     # Log output directory
```

### Scripts

```bash
npm run build         # Build TypeScript to JavaScript
npm run dev          # Start development server
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run typecheck    # Run TypeScript type checking
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
```

### Quality Checks

Before committing, run the full quality check sequence:

```bash
npm run build && npm run lint && npm run test:run
```

All checks must pass before creating pull requests.

## Logging

The server provides comprehensive logging in JSONL format:

### Log Files

Logs are written to the `logs/` directory with the format:
- `mcp-{sessionId}-{timestamp}.jsonl`

### Log Content

Each log entry includes:
- **Protocol Messages**: Complete MCP request/response pairs
- **Tool Calls**: Full input/output for all tool invocations
- **Workflow State**: State changes and transitions
- **Error Information**: Stack traces and error context
- **Timing Data**: Performance metrics

### Log Analysis

You can analyze logs using standard tools:

```bash
# View latest log file
tail -f logs/mcp-*.jsonl | jq '.'

# Filter tool calls
grep '"method":"tools/call"' logs/mcp-*.jsonl | jq '.'

# Extract workflow state changes
grep '"workflowState"' logs/mcp-*.jsonl | jq '.workflowState'
```

## Troubleshooting

### Common Issues

#### 1. "Connection closed" Error
**Problem**: MCP server connection fails immediately
**Solution**:
- Ensure the server is built: `npm run build`
- Check if `dist/index.js` exists
- Verify the path in MCP configuration is absolute
- Check Claude Code logs for detailed error messages
- Try running the server manually: `node dist/index.js`

#### 2. "Unknown tool" Error
**Problem**: Claude Code cannot find workflow tools
**Solution**:
- Ensure the server is built: `npm run build`
- Check Claude Code MCP configuration
- Ensure `CLAUDE_CODE_MCP_ENABLED=1` is set
- Restart Claude Code after configuration changes

#### 3. "Workflow already in progress" Error
**Problem**: Trying to start new workflow when one exists
**Solution**:
- Check current status: `get_workflow_status()`
- Complete current workflow or reset if needed
- Only one workflow can be active at a time

#### 4. "Phase mismatch" Error
**Problem**: Trying to complete wrong phase
**Solution**:
- Check current phase: `get_current_phase()`
- Ensure `phaseName` matches current phase
- Follow phase sequence: issue_start → implementation → quality_check → pr_creation → completion

#### 5. TypeScript/Build Errors
**Problem**: Compilation failures
**Solution**:
```bash
npm run typecheck  # Check for type errors
npm run lint       # Check for linting issues
npm run build      # Attempt build with error details
```

#### 6. Test Failures
**Problem**: Tests not passing
**Solution**:
```bash
npm run test:run   # Run all tests
npm test           # Run in watch mode for debugging
```

### Debug Mode

Enable verbose logging:

```bash
NODE_ENV=development npm run dev
```

This provides additional debug information in console output.

### Security Considerations

When deploying this MCP server:
- **Input Validation**: All tool inputs are validated using Zod schemas
- **Error Handling**: Comprehensive error handling prevents information leakage
- **Transport Security**: Uses stdio transport which is isolated from network
- **File Access**: Limited to project directory for workflow operations
- **No External Network Access**: Server operates locally only

### Getting Help

1. **Check the logs**: Most issues are logged with context
2. **Review this documentation**: Ensure correct usage patterns
3. **Run quality checks**: `npm run build && npm run lint && npm run test:run`
4. **Check GitHub Issues**: Known issues and solutions

## API Reference

### Types

The server uses comprehensive TypeScript types defined in `src/types/`:

```typescript
// Workflow phase types
type WorkflowPhaseType = 'issue_start' | 'implementation' | 'quality_check' | 'pr_creation' | 'fix' | 'completion';

// Workflow state
interface WorkflowState {
  issueNumber: string;
  currentPhase: WorkflowPhaseType;
  workingFiles: string[];
  phaseHistory: PhaseResult[];
  startedAt: string;
  updatedAt: string;
}

// Phase result for completion
interface PhaseResult {
  phaseName: WorkflowPhaseType;
  status: 'completed' | 'failed' | 'skipped';
  workingFiles: string[];
  completedTasks: string[];
  completedAt: string;
  notes?: string;
  nextPhase?: WorkflowPhaseType;
}
```

### Error Handling

All tools provide comprehensive error handling:
- **Validation Errors**: Zod schema validation with detailed messages
- **State Errors**: Workflow state conflicts and invalid transitions
- **System Errors**: File system, network, and runtime errors

Errors are logged with full context and returned as MCP error responses.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run quality checks: `npm run build && npm run lint && npm run test:run`
5. Commit your changes: `git commit -m "feat: your feature"`
6. Push to the branch: `git push origin feature/your-feature`
7. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## Related Resources

### Documentation
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Protocol Specification v2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### MCP SDK Support
MCP officially supports SDKs in multiple languages:
- **TypeScript** (used in this project)
- Python
- C#
- Java
- Kotlin
- Ruby
- Swift

### Transport Options
MCP supports multiple transport mechanisms:
- **stdio** (used in this project) - For local process communication
- **HTTP with SSE** - For network-based communication
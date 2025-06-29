/**
 * Tool type definitions for MCP server
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface Task {
  id: string;
  title: string;
  description?: string | undefined;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string | undefined;
  filePath?: string | undefined;
  lineNumber?: number | undefined;
}

export interface TaskFilter {
  status?: Task['status'] | undefined;
  priority?: Task['priority'] | undefined;
  tags?: string[] | undefined;
  search?: string | undefined;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  tags?: string[];
  dueDate?: string;
  filePath?: string;
  lineNumber?: number;
}
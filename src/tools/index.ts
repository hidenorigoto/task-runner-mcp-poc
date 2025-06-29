/**
 * Task management tools for MCP server
 */

import { z } from 'zod';
import type { ToolDefinition, ToolResult, Task, TaskFilter } from '../types/tools.js';

// In-memory task storage (for POC - would be replaced with persistent storage)
const tasks: Map<string, Task> = new Map();

// Zod schemas for input validation
const TaskFilterSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
  filePath: z.string().optional(),
  lineNumber: z.number().positive().optional(),
});

const TaskUpdateSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  filePath: z.string().optional(),
  lineNumber: z.number().positive().optional(),
});

const TaskIdSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

// Helper functions
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function formatTaskForDisplay(task: Task): string {
  const statusEmoji = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    cancelled: '❌',
  }[task.status];

  const priorityEmoji = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴',
  }[task.priority];

  let output = `${statusEmoji} ${priorityEmoji} **${task.title}** (${task.id})`;
  
  if (task.description) {
    output += `\n  Description: ${task.description}`;
  }
  
  if (task.tags.length > 0) {
    output += `\n  Tags: ${task.tags.map(tag => `#${tag}`).join(', ')}`;
  }
  
  if (task.dueDate) {
    output += `\n  Due: ${task.dueDate}`;
  }
  
  if (task.filePath) {
    output += `\n  File: ${task.filePath}${task.lineNumber ? `:${task.lineNumber}` : ''}`;
  }
  
  output += `\n  Created: ${task.createdAt}`;
  output += `\n  Updated: ${task.updatedAt}`;
  
  return output;
}

function filterTasks(filter: TaskFilter): Task[] {
  const allTasks = Array.from(tasks.values());
  
  return allTasks.filter(task => {
    if (filter.status && task.status !== filter.status) {
return false;
}
    if (filter.priority && task.priority !== filter.priority) {
return false;
}
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => task.tags.includes(tag));
      if (!hasMatchingTag) {
return false;
}
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower));
      if (!matchesSearch) {
return false;
}
    }
    return true;
  });
}

// Tool implementations
const listTasks: ToolDefinition = {
  name: 'list_tasks',
  description: 'List tasks with optional filtering by status, priority, tags, or search term',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        description: 'Filter by task status',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Filter by task priority',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags (tasks must have at least one matching tag)',
      },
      search: {
        type: 'string',
        description: 'Search in title, description, and tags',
      },
    },
  },
  handler: (args): Promise<ToolResult> => {
    const filter = TaskFilterSchema.parse(args);
    const filteredTasks = filterTasks(filter);
    
    if (filteredTasks.length === 0) {
      return Promise.resolve({
        content: [{
          type: 'text',
          text: 'No tasks found matching the specified criteria.',
        }],
      });
    }
    
    const taskList = filteredTasks
      .sort((a, b) => {
        // Sort by status (in_progress first), then priority, then creation date
        const statusOrder = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .map(formatTaskForDisplay)
      .join('\n\n');
    
    return Promise.resolve({
      content: [{
        type: 'text',
        text: `Found ${filteredTasks.length} task(s):\n\n${taskList}`,
      }],
    });
  },
};

const addTask: ToolDefinition = {
  name: 'add_task',
  description: 'Add a new task to the workflow',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Task title (required)',
      },
      description: {
        type: 'string',
        description: 'Task description',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Task priority (default: medium)',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Task tags',
      },
      dueDate: {
        type: 'string',
        description: 'Due date (ISO 8601 format)',
      },
      filePath: {
        type: 'string',
        description: 'Associated file path',
      },
      lineNumber: {
        type: 'number',
        description: 'Associated line number in file',
      },
    },
    required: ['title'],
  },
  handler: (args): Promise<ToolResult> => {
    try {
      const taskData = TaskCreateSchema.parse(args);
    
    const now = new Date().toISOString();
    const task: Task = {
      id: generateTaskId(),
      title: taskData.title,
      status: 'pending',
      priority: taskData.priority,
      tags: taskData.tags,
      createdAt: now,
      updatedAt: now,
      ...(taskData.description !== undefined && { description: taskData.description }),
      ...(taskData.dueDate !== undefined && { dueDate: taskData.dueDate }),
      ...(taskData.filePath !== undefined && { filePath: taskData.filePath }),
      ...(taskData.lineNumber !== undefined && { lineNumber: taskData.lineNumber }),
    };
    
    tasks.set(task.id, task);
    
      return Promise.resolve({
        content: [{
          type: 'text',
          text: `Task created successfully:\n\n${formatTaskForDisplay(task)}`,
        }],
      });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

const updateTaskStatus: ToolDefinition = {
  name: 'update_task_status',
  description: 'Update the status of an existing task',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Task ID',
      },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        description: 'New task status',
      },
    },
    required: ['id', 'status'],
  },
  handler: (args): Promise<ToolResult> => {
    try {
      const { id, status } = z.object({
        id: z.string().min(1),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
      }).parse(args);
      
      const task = tasks.get(id);
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }
      
      task.status = status;
      task.updatedAt = new Date().toISOString();
      tasks.set(id, task);
      
      return Promise.resolve({
        content: [{
          type: 'text',
          text: `Task status updated successfully:\n\n${formatTaskForDisplay(task)}`,
        }],
      });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

const updateTask: ToolDefinition = {
  name: 'update_task',
  description: 'Update task details (title, description, priority, tags, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Task ID',
      },
      title: {
        type: 'string',
        description: 'New task title',
      },
      description: {
        type: 'string',
        description: 'New task description',
      },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        description: 'New task status',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'New task priority',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'New task tags',
      },
      dueDate: {
        type: 'string',
        description: 'New due date (ISO 8601 format)',
      },
      filePath: {
        type: 'string',
        description: 'New associated file path',
      },
      lineNumber: {
        type: 'number',
        description: 'New associated line number',
      },
    },
    required: ['id'],
  },
  handler: (args): Promise<ToolResult> => {
    try {
      const updateData = TaskUpdateSchema.parse(args);
      
      const task = tasks.get(updateData.id);
      if (!task) {
        throw new Error(`Task with ID ${updateData.id} not found`);
      }
      
      // Update only provided fields
      if (updateData.title !== undefined) {
        task.title = updateData.title;
      }
      if (updateData.description !== undefined) {
        task.description = updateData.description;
      }
      if (updateData.status !== undefined) {
        task.status = updateData.status;
      }
      if (updateData.priority !== undefined) {
        task.priority = updateData.priority;
      }
      if (updateData.tags !== undefined) {
        task.tags = updateData.tags;
      }
      if (updateData.dueDate !== undefined) {
        task.dueDate = updateData.dueDate;
      }
      if (updateData.filePath !== undefined) {
        task.filePath = updateData.filePath;
      }
      if (updateData.lineNumber !== undefined) {
        task.lineNumber = updateData.lineNumber;
      }
      
      task.updatedAt = new Date().toISOString();
      tasks.set(task.id, task);
      
      return Promise.resolve({
        content: [{
          type: 'text',
          text: `Task updated successfully:\n\n${formatTaskForDisplay(task)}`,
        }],
      });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

const getTaskDetails: ToolDefinition = {
  name: 'get_task_details',
  description: 'Get detailed information about a specific task',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Task ID',
      },
    },
    required: ['id'],
  },
  handler: (args): Promise<ToolResult> => {
    try {
      const { id } = TaskIdSchema.parse(args);
      
      const task = tasks.get(id);
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }
      
      return Promise.resolve({
        content: [{
          type: 'text',
          text: formatTaskForDisplay(task),
        }],
      });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

const deleteTask: ToolDefinition = {
  name: 'delete_task',
  description: 'Delete a task from the workflow',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Task ID',
      },
    },
    required: ['id'],
  },
  handler: (args): Promise<ToolResult> => {
    try {
      const { id } = TaskIdSchema.parse(args);
      
      const task = tasks.get(id);
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }
      
      tasks.delete(id);
      
      return Promise.resolve({
        content: [{
          type: 'text',
          text: `Task "${task.title}" (${id}) has been deleted successfully.`,
        }],
      });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

// Export for testing
export function clearAllTasks(): void {
  tasks.clear();
}

export const taskTools: ToolDefinition[] = [
  listTasks,
  addTask,
  updateTaskStatus,
  updateTask,
  getTaskDetails,
  deleteTask,
];
import { describe, it, expect, beforeEach } from 'vitest';
import { taskTools, clearAllTasks } from '../../src/tools/index.js';
import type { ToolDefinition } from '../../src/types/tools.js';

describe('Task Tools', () => {
  let listTasks: ToolDefinition;
  let addTask: ToolDefinition;
  let updateTaskStatus: ToolDefinition;
  let updateTask: ToolDefinition;
  let getTaskDetails: ToolDefinition;
  let deleteTask: ToolDefinition;

  beforeEach(() => {
    // Clear tasks between tests
    clearAllTasks();
    
    // Find tools by name
    listTasks = taskTools.find(t => t.name === 'list_tasks') as ToolDefinition;
    addTask = taskTools.find(t => t.name === 'add_task') as ToolDefinition;
    updateTaskStatus = taskTools.find(t => t.name === 'update_task_status') as ToolDefinition;
    updateTask = taskTools.find(t => t.name === 'update_task') as ToolDefinition;
    getTaskDetails = taskTools.find(t => t.name === 'get_task_details') as ToolDefinition;
    deleteTask = taskTools.find(t => t.name === 'delete_task') as ToolDefinition;

    expect(listTasks).toBeDefined();
    expect(addTask).toBeDefined();
    expect(updateTaskStatus).toBeDefined();
    expect(updateTask).toBeDefined();
    expect(getTaskDetails).toBeDefined();
    expect(deleteTask).toBeDefined();
  });

  describe('Tool Structure', () => {
    it('should export all expected tools', () => {
      expect(taskTools).toHaveLength(6);
      
      const toolNames = taskTools.map(tool => tool.name);
      expect(toolNames).toContain('list_tasks');
      expect(toolNames).toContain('add_task');
      expect(toolNames).toContain('update_task_status');
      expect(toolNames).toContain('update_task');
      expect(toolNames).toContain('get_task_details');
      expect(toolNames).toContain('delete_task');
    });

    it('should have proper tool definitions', () => {
      taskTools.forEach(tool => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.handler).toBeTypeOf('function');
      });
    });
  });

  describe('add_task tool', () => {
    it('should create a task with all required fields', async () => {
      const result = await addTask.handler({
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        tags: ['test', 'important'],
        filePath: '/test/file.ts',
        lineNumber: 42,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Test Task');
      expect(result.content[0]?.text).toContain('🟠'); // high priority emoji
      expect(result.content[0]?.text).toContain('⏳'); // pending status emoji
      expect(result.content[0]?.text).toContain('#test, #important');
      expect(result.content[0]?.text).toContain('/test/file.ts:42');
    });

    it('should create a minimal task with just title', async () => {
      const result = await addTask.handler({
        title: 'Simple Task',
      });

      expect(result.content[0]?.text).toContain('Simple Task');
      expect(result.content[0]?.text).toContain('🟡'); // medium priority (default)
    });

    it('should reject task without title', async () => {
      await expect(addTask.handler({})).rejects.toThrow();
    });

    it('should reject invalid priority', async () => {
      await expect(addTask.handler({
        title: 'Test',
        priority: 'invalid',
      })).rejects.toThrow();
    });
  });

  describe('list_tasks tool', () => {
    beforeEach(async () => {
      // Create some test tasks
      await addTask.handler({
        title: 'Task 1',
        priority: 'high',
        tags: ['urgent'],
      });
      await addTask.handler({
        title: 'Task 2',
        priority: 'low',
        tags: ['later'],
      });
      await addTask.handler({
        title: 'Important Task',
        description: 'Very important work',
        priority: 'urgent',
        tags: ['critical'],
      });
    });

    it('should list all tasks when no filter provided', async () => {
      const result = await listTasks.handler({});
      
      expect(result.content[0]?.text).toContain('Found 3 task(s)');
      expect(result.content[0]?.text).toContain('Task 1');
      expect(result.content[0]?.text).toContain('Task 2');
      expect(result.content[0]?.text).toContain('Important Task');
    });

    it('should filter tasks by priority', async () => {
      const result = await listTasks.handler({ priority: 'urgent' });
      
      expect(result.content[0]?.text).toContain('Found 1 task(s)');
      expect(result.content[0]?.text).toContain('Important Task');
      expect(result.content[0]?.text).not.toContain('Task 1');
    });

    it('should filter tasks by tags', async () => {
      const result = await listTasks.handler({ tags: ['urgent'] });
      
      expect(result.content[0]?.text).toContain('Found 1 task(s)');
      expect(result.content[0]?.text).toContain('Task 1');
    });

    it('should search in title and description', async () => {
      const result = await listTasks.handler({ search: 'important' });
      
      // Should find "Important Task" (title match)
      expect(result.content[0]?.text).toContain('Found 1 task(s)');
      expect(result.content[0]?.text).toContain('Important Task');
    });

    it('should return empty message when no tasks match', async () => {
      const result = await listTasks.handler({ priority: 'medium' });
      
      expect(result.content[0]?.text).toBe('No tasks found matching the specified criteria.');
    });
  });

  describe('update_task_status tool', () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await addTask.handler({
        title: 'Task to Update',
      });
      
      // Extract task ID from response
      const match = result.content[0]?.text.match(/\(([^)]+)\)/);
      taskId = match?.[1] || '';
      expect(taskId).toBeTruthy();
    });

    it('should update task status successfully', async () => {
      const result = await updateTaskStatus.handler({
        id: taskId,
        status: 'in_progress',
      });

      expect(result.content[0]?.text).toContain('🔄'); // in_progress emoji
      expect(result.content[0]?.text).toContain('Task to Update');
    });

    it('should reject invalid task ID', async () => {
      await expect(updateTaskStatus.handler({
        id: 'nonexistent',
        status: 'completed',
      })).rejects.toThrow('not found');
    });

    it('should reject invalid status', async () => {
      await expect(updateTaskStatus.handler({
        id: taskId,
        status: 'invalid',
      })).rejects.toThrow();
    });
  });

  describe('update_task tool', () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await addTask.handler({
        title: 'Original Title',
        description: 'Original description',
        priority: 'low',
      });
      
      const match = result.content[0]?.text.match(/\(([^)]+)\)/);
      taskId = match?.[1] || '';
    });

    it('should update multiple task fields', async () => {
      const result = await updateTask.handler({
        id: taskId,
        title: 'Updated Title',
        priority: 'urgent',
        tags: ['updated'],
      });

      expect(result.content[0]?.text).toContain('Updated Title');
      expect(result.content[0]?.text).toContain('🔴'); // urgent priority
      expect(result.content[0]?.text).toContain('#updated');
    });

    it('should update only specified fields', async () => {
      const result = await updateTask.handler({
        id: taskId,
        description: 'New description only',
      });

      expect(result.content[0]?.text).toContain('Original Title'); // unchanged
      expect(result.content[0]?.text).toContain('New description only');
    });
  });

  describe('get_task_details tool', () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await addTask.handler({
        title: 'Detailed Task',
        description: 'Task with details',
        priority: 'high',
        tags: ['detailed'],
      });
      
      const match = result.content[0]?.text.match(/\(([^)]+)\)/);
      taskId = match?.[1] || '';
    });

    it('should return task details', async () => {
      const result = await getTaskDetails.handler({ id: taskId });

      expect(result.content[0]?.text).toContain('Detailed Task');
      expect(result.content[0]?.text).toContain('Task with details');
      expect(result.content[0]?.text).toContain('#detailed');
    });

    it('should reject invalid task ID', async () => {
      await expect(getTaskDetails.handler({
        id: 'nonexistent',
      })).rejects.toThrow('not found');
    });
  });

  describe('delete_task tool', () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await addTask.handler({
        title: 'Task to Delete',
      });
      
      const match = result.content[0]?.text.match(/\(([^)]+)\)/);
      taskId = match?.[1] || '';
    });

    it('should delete task successfully', async () => {
      const result = await deleteTask.handler({ id: taskId });

      expect(result.content[0]?.text).toContain('Task to Delete');
      expect(result.content[0]?.text).toContain('deleted successfully');

      // Verify task is deleted
      await expect(getTaskDetails.handler({ id: taskId })).rejects.toThrow('not found');
    });

    it('should reject invalid task ID', async () => {
      await expect(deleteTask.handler({
        id: 'nonexistent',
      })).rejects.toThrow('not found');
    });
  });

  describe('Task workflow integration', () => {
    it('should support complete task lifecycle', async () => {
      // Create task
      const createResult = await addTask.handler({
        title: 'Lifecycle Test',
        description: 'Testing complete workflow',
        priority: 'medium',
        tags: ['test'],
      });
      
      const match = createResult.content[0]?.text.match(/\(([^)]+)\)/);
      const taskId = match?.[1] || '';

      // Update status to in_progress
      await updateTaskStatus.handler({
        id: taskId,
        status: 'in_progress',
      });

      // Update task details
      await updateTask.handler({
        id: taskId,
        description: 'Updated during progress',
        priority: 'high',
      });

      // Get details
      const detailsResult = await getTaskDetails.handler({ id: taskId });
      expect(detailsResult.content[0]?.text).toContain('🔄'); // in_progress
      expect(detailsResult.content[0]?.text).toContain('🟠'); // high priority
      expect(detailsResult.content[0]?.text).toContain('Updated during progress');

      // Complete task
      await updateTaskStatus.handler({
        id: taskId,
        status: 'completed',
      });

      // Verify completion
      const finalResult = await getTaskDetails.handler({ id: taskId });
      expect(finalResult.content[0]?.text).toContain('✅'); // completed
    });
  });
});
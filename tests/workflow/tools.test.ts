/**
 * Workflow tools test suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowTools } from '../../src/workflow/tools.js';
import { WorkflowPhase } from '../../src/types/workflow.js';
import type { Logger } from '../../src/logger/index.js';
import type { PhaseResult } from '../../src/types/workflow.js';

// Mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  logProtocol: vi.fn(),
  close: vi.fn(),
  generateSessionId: vi.fn().mockReturnValue('test-session'),
} as any;

describe('WorkflowTools', () => {
  let workflowTools: WorkflowTools;

  beforeEach(() => {
    workflowTools = new WorkflowTools(mockLogger);
    vi.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all 4 workflow tools', () => {
      const tools = workflowTools.getTools();
      
      expect(tools).toHaveLength(4);
      expect(tools.map(t => t.name)).toEqual([
        'start_issue_workflow',
        'complete_phase',
        'get_current_phase',
        'get_workflow_status',
      ]);
    });

    it('should have proper tool definitions', () => {
      const tools = workflowTools.getTools();
      
      tools.forEach(tool => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeTruthy();
        expect(typeof tool.handler).toBe('function');
      });
    });
  });

  describe('start_issue_workflow tool', () => {
    let startWorkflowTool: any;

    beforeEach(() => {
      const tools = workflowTools.getTools();
      startWorkflowTool = tools.find(t => t.name === 'start_issue_workflow');
    });

    it('should start workflow successfully', async () => {
      const result = await startWorkflowTool.handler({ issueNumber: '123' });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Current Phase: issue_start');
      expect(result.content[0].text).toContain('Issue**: #123');
    });

    it('should validate input schema', async () => {
      await expect(startWorkflowTool.handler({})).rejects.toThrow();
      await expect(startWorkflowTool.handler({ issueNumber: '' })).rejects.toThrow();
    });

    it('should reject starting workflow when one already exists', async () => {
      await startWorkflowTool.handler({ issueNumber: '123' });
      await expect(startWorkflowTool.handler({ issueNumber: '456' })).rejects.toThrow(
        'Workflow already in progress'
      );
    });
  });

  describe('complete_phase tool', () => {
    let completePhraseTool: any;
    let startWorkflowTool: any;

    beforeEach(() => {
      const tools = workflowTools.getTools();
      completePhraseTool = tools.find(t => t.name === 'complete_phase');
      startWorkflowTool = tools.find(t => t.name === 'start_issue_workflow');
    });

    it('should complete phase successfully', async () => {
      // Start workflow first
      await startWorkflowTool.handler({ issueNumber: '123' });
      
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: ['src/test.ts'],
        completedTasks: ['Task 1', 'Task 2'],
        completedAt: new Date().toISOString(),
      };

      const result = await completePhraseTool.handler({ phaseResult });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Phase Completed**: issue_start');
      expect(result.content[0].text).toContain('Now Moving to**: implementation');
    });

    it('should handle workflow completion', async () => {
      // Start workflow and progress to completion
      await startWorkflowTool.handler({ issueNumber: '123' });
      
      // Progress through phases to PR creation
      const phases = [
        WorkflowPhase.ISSUE_START,
        WorkflowPhase.IMPLEMENTATION,
        WorkflowPhase.QUALITY_CHECK,
      ];

      for (const phase of phases) {
        const phaseResult: PhaseResult = {
          phaseName: phase,
          status: 'completed',
          workingFiles: [],
          completedTasks: [],
          completedAt: new Date().toISOString(),
        };
        await completePhraseTool.handler({ phaseResult });
      }

      // Complete PR creation phase and go directly to completion
      const prResult: PhaseResult = {
        phaseName: WorkflowPhase.PR_CREATION,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        nextPhase: WorkflowPhase.COMPLETION, // Specify next phase to avoid default
        completedAt: new Date().toISOString(),
      };
      await completePhraseTool.handler({ phaseResult: prResult });

      // Complete the final completion phase
      const completionResult: PhaseResult = {
        phaseName: WorkflowPhase.COMPLETION,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        completedAt: new Date().toISOString(),
      };

      const result = await completePhraseTool.handler({ phaseResult: completionResult });
      
      expect(result.content[0].text).toContain('Workflow Completed Successfully!');
      expect(result.content[0].text).toContain('start_issue_workflow');
    });

    it('should validate phase result schema', async () => {
      await startWorkflowTool.handler({ issueNumber: '123' });
      
      // Invalid phase result
      await expect(completePhraseTool.handler({ phaseResult: {} })).rejects.toThrow();
      
      // Missing required fields
      await expect(completePhraseTool.handler({ 
        phaseResult: { phaseName: WorkflowPhase.ISSUE_START }
      })).rejects.toThrow();
    });

    it('should handle no active workflow', async () => {
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        completedAt: new Date().toISOString(),
      };

      await expect(completePhraseTool.handler({ phaseResult })).rejects.toThrow(
        'No active workflow'
      );
    });
  });

  describe('get_current_phase tool', () => {
    let getCurrentPhaseTool: any;
    let startWorkflowTool: any;

    beforeEach(() => {
      const tools = workflowTools.getTools();
      getCurrentPhaseTool = tools.find(t => t.name === 'get_current_phase');
      startWorkflowTool = tools.find(t => t.name === 'start_issue_workflow');
    });

    it('should return no workflow message when no active workflow', async () => {
      const result = await getCurrentPhaseTool.handler({});
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('No active workflow');
      expect(result.content[0].text).toContain('start_issue_workflow');
    });

    it('should return current phase instruction when workflow active', async () => {
      await startWorkflowTool.handler({ issueNumber: '123' });
      
      const result = await getCurrentPhaseTool.handler({});
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Current Phase: issue_start');
      expect(result.content[0].text).toContain('Issue**: #123');
      expect(result.content[0].text).toContain('Preconditions');
      expect(result.content[0].text).toContain('Acceptance Criteria');
      expect(result.content[0].text).toContain('Tasks to Complete');
    });
  });

  describe('get_workflow_status tool', () => {
    let getStatusTool: any;
    let startWorkflowTool: any;
    let completePhraseTool: any;

    beforeEach(() => {
      const tools = workflowTools.getTools();
      getStatusTool = tools.find(t => t.name === 'get_workflow_status');
      startWorkflowTool = tools.find(t => t.name === 'start_issue_workflow');
      completePhraseTool = tools.find(t => t.name === 'complete_phase');
    });

    it('should return no workflow status when no active workflow', async () => {
      const result = await getStatusTool.handler({});
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('No Active Workflow');
      expect(result.content[0].text).toContain('start_issue_workflow');
    });

    it('should return active workflow status', async () => {
      await startWorkflowTool.handler({ issueNumber: '123' });
      
      const result = await getStatusTool.handler({});
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Workflow Status');
      expect(result.content[0].text).toContain('Issue**: #123');
      expect(result.content[0].text).toContain('Current Phase**: issue_start');
      expect(result.content[0].text).toContain('Progress**: 0/6');
    });

    it('should show progress after completing phases', async () => {
      await startWorkflowTool.handler({ issueNumber: '123' });
      
      // Complete first phase
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: ['src/test.ts'],
        completedTasks: ['Task 1'],
        completedAt: new Date().toISOString(),
      };
      await completePhraseTool.handler({ phaseResult });
      
      const result = await getStatusTool.handler({});
      
      expect(result.content[0].text).toContain('Progress**: 1/6');
      expect(result.content[0].text).toContain('Working Files**: 1');
      expect(result.content[0].text).toContain('Completed Phases');
      expect(result.content[0].text).toContain('issue_start (completed)');
    });
  });

  describe('resetWorkflow', () => {
    it('should reset workflow state', async () => {
      const tools = workflowTools.getTools();
      const startWorkflowTool = tools.find(t => t.name === 'start_issue_workflow');
      const getStatusTool = tools.find(t => t.name === 'get_workflow_status');
      
      expect(startWorkflowTool).toBeDefined();
      expect(getStatusTool).toBeDefined();
      
      // Start workflow
      if (startWorkflowTool && getStatusTool) {
        await startWorkflowTool.handler({ issueNumber: '123' });
        let result = await getStatusTool.handler({});
        expect(result.content[0]?.text).toContain('Issue**: #123');
        
        // Reset workflow
        workflowTools.resetWorkflow();
        result = await getStatusTool.handler({});
        expect(result.content[0]?.text).toContain('No Active Workflow');
      }
    });
  });

  describe('tool input schema validation', () => {
    it('should have correct input schemas', () => {
      const tools = workflowTools.getTools();
      
      const startWorkflow = tools.find(t => t.name === 'start_issue_workflow');
      expect(startWorkflow?.inputSchema['required']).toContain('issueNumber');
      
      const completePhrase = tools.find(t => t.name === 'complete_phase');
      expect(completePhrase?.inputSchema['required']).toContain('phaseResult');
      
      const getCurrentPhase = tools.find(t => t.name === 'get_current_phase');
      expect(getCurrentPhase?.inputSchema['properties']).toEqual({});
      
      const getStatus = tools.find(t => t.name === 'get_workflow_status');
      expect(getStatus?.inputSchema['properties']).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle and log errors properly', async () => {
      const tools = workflowTools.getTools();
      const startWorkflowTool = tools.find(t => t.name === 'start_issue_workflow');
      
      expect(startWorkflowTool).toBeDefined();
      
      // Test with invalid input
      if (startWorkflowTool) {
        await expect(startWorkflowTool.handler({ issueNumber: '' })).rejects.toThrow();
      }
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start issue workflow', expect.any(Object));
    });
  });
});
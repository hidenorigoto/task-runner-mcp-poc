/**
 * WorkflowManager test suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowManager } from '../../src/workflow/WorkflowManager.js';
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

describe('WorkflowManager', () => {
  let workflowManager: WorkflowManager;

  beforeEach(() => {
    workflowManager = new WorkflowManager(mockLogger);
    vi.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('should start a new workflow successfully', () => {
      const issueNumber = '123';
      const workflow = workflowManager.startWorkflow(issueNumber);

      expect(workflow.issueNumber).toBe(issueNumber);
      expect(workflow.currentPhase).toBe(WorkflowPhase.ISSUE_START);
      expect(workflow.workingFiles).toEqual([]);
      expect(workflow.phaseHistory).toEqual([]);
      expect(workflow.startedAt).toBeTruthy();
      expect(workflow.updatedAt).toBeTruthy();
    });

    it('should throw error if workflow already exists', () => {
      workflowManager.startWorkflow('123');
      
      expect(() => workflowManager.startWorkflow('456')).toThrow(
        'Workflow already in progress for issue 123. Complete or reset current workflow first.'
      );
    });

    it('should validate issue number', () => {
      expect(() => workflowManager.startWorkflow('')).toThrow();
    });
  });

  describe('getCurrentWorkflow', () => {
    it('should return null when no workflow active', () => {
      expect(workflowManager.getCurrentWorkflow()).toBeNull();
    });

    it('should return current workflow when active', () => {
      const workflow = workflowManager.startWorkflow('123');
      expect(workflowManager.getCurrentWorkflow()).toEqual(workflow);
    });
  });

  describe('getCurrentPhaseInstruction', () => {
    it('should return null when no workflow active', () => {
      expect(workflowManager.getCurrentPhaseInstruction()).toBeNull();
    });

    it('should return phase instruction for current phase', () => {
      workflowManager.startWorkflow('123');
      const instruction = workflowManager.getCurrentPhaseInstruction();
      
      expect(instruction).toBeTruthy();
      expect(instruction?.phaseName).toBe(WorkflowPhase.ISSUE_START);
      expect(instruction?.preconditions).toBeTruthy();
      expect(instruction?.acceptanceCriteria).toBeTruthy();
      expect(instruction?.tasks).toBeTruthy();
    });
  });

  describe('completePhase', () => {
    beforeEach(() => {
      workflowManager.startWorkflow('123');
    });

    it('should complete issue start phase and move to implementation', () => {
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: ['src/test.ts'],
        completedTasks: ['Task 1', 'Task 2'],
        completedAt: new Date().toISOString(),
      };

      const updatedWorkflow = workflowManager.completePhase(phaseResult);

      expect(updatedWorkflow.currentPhase).toBe(WorkflowPhase.IMPLEMENTATION);
      expect(updatedWorkflow.workingFiles).toContain('src/test.ts');
      expect(updatedWorkflow.phaseHistory).toHaveLength(1);
      expect(updatedWorkflow.phaseHistory[0]).toEqual(phaseResult);
    });

    it('should throw error when no active workflow', () => {
      workflowManager.resetWorkflow();
      
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        completedAt: new Date().toISOString(),
      };

      expect(() => workflowManager.completePhase(phaseResult)).toThrow(
        'No active workflow to complete phase for'
      );
    });

    it('should throw error for phase mismatch', () => {
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.IMPLEMENTATION, // Wrong phase
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        completedAt: new Date().toISOString(),
      };

      expect(() => workflowManager.completePhase(phaseResult)).toThrow(
        'Phase mismatch: attempting to complete implementation but current phase is issue_start'
      );
    });

    it('should merge working files from multiple phases', () => {
      // Complete issue start phase
      const phase1Result: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: ['src/test1.ts'],
        completedTasks: ['Task 1'],
        completedAt: new Date().toISOString(),
      };
      
      workflowManager.completePhase(phase1Result);

      // Complete implementation phase
      const phase2Result: PhaseResult = {
        phaseName: WorkflowPhase.IMPLEMENTATION,
        status: 'completed',
        workingFiles: ['src/test2.ts', 'src/test1.ts'], // Duplicate should be deduplicated
        completedTasks: ['Task 2'],
        completedAt: new Date().toISOString(),
      };
      
      const updatedWorkflow = workflowManager.completePhase(phase2Result);

      expect(updatedWorkflow.workingFiles).toEqual(['src/test1.ts', 'src/test2.ts']);
      expect(updatedWorkflow.phaseHistory).toHaveLength(2);
    });

    it('should use nextPhase when provided', () => {
      // Complete all phases to reach PR creation
      const phases = [
        WorkflowPhase.ISSUE_START,
        WorkflowPhase.IMPLEMENTATION,
        WorkflowPhase.QUALITY_CHECK,
      ];

      phases.forEach(phase => {
        const result: PhaseResult = {
          phaseName: phase,
          status: 'completed',
          workingFiles: [],
          completedTasks: [],
          completedAt: new Date().toISOString(),
        };
        workflowManager.completePhase(result);
      });

      // From PR creation, specify going to fix phase
      const prResult: PhaseResult = {
        phaseName: WorkflowPhase.PR_CREATION,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        nextPhase: WorkflowPhase.FIX, // Explicit next phase
        completedAt: new Date().toISOString(),
      };

      const updatedWorkflow = workflowManager.completePhase(prResult);
      expect(updatedWorkflow.currentPhase).toBe(WorkflowPhase.FIX);
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return status for no active workflow', () => {
      const status = workflowManager.getWorkflowStatus();
      
      expect(status.hasActiveWorkflow).toBe(false);
      expect(status.totalPhases).toBe(6);
      expect(status.completedPhases).toBe(0);
      expect(status.workingFilesCount).toBe(0);
    });

    it('should return status for active workflow', () => {
      workflowManager.startWorkflow('123');
      const status = workflowManager.getWorkflowStatus();
      
      expect(status.hasActiveWorkflow).toBe(true);
      expect(status.issueNumber).toBe('123');
      expect(status.currentPhase).toBe(WorkflowPhase.ISSUE_START);
      expect(status.totalPhases).toBe(6);
      expect(status.completedPhases).toBe(0);
      expect(status.workingFilesCount).toBe(0);
    });

    it('should reflect progress after completing phases', () => {
      workflowManager.startWorkflow('123');
      
      const phaseResult: PhaseResult = {
        phaseName: WorkflowPhase.ISSUE_START,
        status: 'completed',
        workingFiles: ['src/test.ts'],
        completedTasks: ['Task 1'],
        completedAt: new Date().toISOString(),
      };
      
      workflowManager.completePhase(phaseResult);
      const status = workflowManager.getWorkflowStatus();
      
      expect(status.completedPhases).toBe(1);
      expect(status.workingFilesCount).toBe(1);
      expect(status.currentPhase).toBe(WorkflowPhase.IMPLEMENTATION);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow transition to issue_start when no workflow', () => {
      expect(workflowManager.canTransitionTo(WorkflowPhase.ISSUE_START)).toBe(true);
      expect(workflowManager.canTransitionTo(WorkflowPhase.IMPLEMENTATION)).toBe(false);
    });

    it('should validate phase transitions', () => {
      workflowManager.startWorkflow('123');
      
      expect(workflowManager.canTransitionTo(WorkflowPhase.IMPLEMENTATION)).toBe(true);
      expect(workflowManager.canTransitionTo(WorkflowPhase.QUALITY_CHECK)).toBe(false);
      expect(workflowManager.canTransitionTo(WorkflowPhase.COMPLETION)).toBe(false);
    });
  });

  describe('resetWorkflow', () => {
    it('should reset active workflow', () => {
      workflowManager.startWorkflow('123');
      expect(workflowManager.getCurrentWorkflow()).toBeTruthy();
      
      workflowManager.resetWorkflow();
      expect(workflowManager.getCurrentWorkflow()).toBeNull();
    });

    it('should handle reset when no workflow active', () => {
      expect(() => workflowManager.resetWorkflow()).not.toThrow();
    });
  });

  describe('phase progression', () => {
    it('should complete full workflow progression', () => {
      workflowManager.startWorkflow('123');
      
      const phases = [
        { from: WorkflowPhase.ISSUE_START, to: WorkflowPhase.IMPLEMENTATION },
        { from: WorkflowPhase.IMPLEMENTATION, to: WorkflowPhase.QUALITY_CHECK },
        { from: WorkflowPhase.QUALITY_CHECK, to: WorkflowPhase.PR_CREATION },
        { from: WorkflowPhase.PR_CREATION, to: WorkflowPhase.COMPLETION },
      ];

      phases.forEach(({ from, to }) => {
        const workflow = workflowManager.getCurrentWorkflow();
        expect(workflow?.currentPhase).toBe(from);
        
        const result: PhaseResult = {
          phaseName: from,
          status: 'completed',
          workingFiles: [],
          completedTasks: [],
          completedAt: new Date().toISOString(),
        };
        
        const updatedWorkflow = workflowManager.completePhase(result);
        expect(updatedWorkflow.currentPhase).toBe(to);
      });
    });

    it('should handle fix phase loop', () => {
      workflowManager.startWorkflow('123');
      
      // Progress to PR creation
      const phases = [WorkflowPhase.ISSUE_START, WorkflowPhase.IMPLEMENTATION, WorkflowPhase.QUALITY_CHECK];
      phases.forEach(phase => {
        const result: PhaseResult = {
          phaseName: phase,
          status: 'completed',
          workingFiles: [],
          completedTasks: [],
          completedAt: new Date().toISOString(),
        };
        workflowManager.completePhase(result);
      });

      // Go to fix phase
      const prResult: PhaseResult = {
        phaseName: WorkflowPhase.PR_CREATION,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        nextPhase: WorkflowPhase.FIX,
        completedAt: new Date().toISOString(),
      };
      workflowManager.completePhase(prResult);
      
      expect(workflowManager.getCurrentWorkflow()?.currentPhase).toBe(WorkflowPhase.FIX);
      
      // Fix phase should go back to quality check
      const fixResult: PhaseResult = {
        phaseName: WorkflowPhase.FIX,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        completedAt: new Date().toISOString(),
      };
      workflowManager.completePhase(fixResult);
      
      expect(workflowManager.getCurrentWorkflow()?.currentPhase).toBe(WorkflowPhase.QUALITY_CHECK);
    });

    it('should stay in completion phase when completing completion', () => {
      // This test validates that completion phase can be completed and stays in completion
      const manager = new WorkflowManager(mockLogger);
      manager.startWorkflow('123');
      
      // Force workflow to completion phase (bypassing normal progression for testing)
      const workflow = manager.getCurrentWorkflow()!;
      (workflow as any).currentPhase = WorkflowPhase.COMPLETION;
      
      const result: PhaseResult = {
        phaseName: WorkflowPhase.COMPLETION,
        status: 'completed',
        workingFiles: [],
        completedTasks: [],
        completedAt: new Date().toISOString(),
      };
      
      const updatedWorkflow = manager.completePhase(result);
      expect(updatedWorkflow.currentPhase).toBe(WorkflowPhase.COMPLETION);
    });
  });
});
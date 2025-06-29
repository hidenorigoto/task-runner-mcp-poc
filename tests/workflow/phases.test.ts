/**
 * Phase definitions test suite
 */

import { describe, it, expect } from 'vitest';
import {
  phaseDefinitions,
  phaseTransitions,
  getValidNextPhases,
  isValidPhaseTransition,
  issueStartPhase,
  implementationPhase,
  qualityCheckPhase,
  prCreationPhase,
  fixPhase,
  completionPhase,
} from '../../src/workflow/phases.js';
import { WorkflowPhase } from '../../src/types/workflow.js';

describe('Phase Definitions', () => {
  describe('individual phase definitions', () => {
    it('should have issue start phase definition', () => {
      expect(issueStartPhase.phaseName).toBe(WorkflowPhase.ISSUE_START);
      expect(issueStartPhase.preconditions).toBeInstanceOf(Array);
      expect(issueStartPhase.acceptanceCriteria).toBeInstanceOf(Array);
      expect(issueStartPhase.tasks).toBeInstanceOf(Array);
      expect(issueStartPhase.preconditions.length).toBeGreaterThan(0);
      expect(issueStartPhase.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(issueStartPhase.tasks.length).toBeGreaterThan(0);
    });

    it('should have implementation phase definition', () => {
      expect(implementationPhase.phaseName).toBe(WorkflowPhase.IMPLEMENTATION);
      expect(implementationPhase.preconditions).toBeInstanceOf(Array);
      expect(implementationPhase.acceptanceCriteria).toBeInstanceOf(Array);
      expect(implementationPhase.tasks).toBeInstanceOf(Array);
      expect(implementationPhase.preconditions.length).toBeGreaterThan(0);
      expect(implementationPhase.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(implementationPhase.tasks.length).toBeGreaterThan(0);
    });

    it('should have quality check phase definition', () => {
      expect(qualityCheckPhase.phaseName).toBe(WorkflowPhase.QUALITY_CHECK);
      expect(qualityCheckPhase.preconditions).toBeInstanceOf(Array);
      expect(qualityCheckPhase.acceptanceCriteria).toBeInstanceOf(Array);
      expect(qualityCheckPhase.tasks).toBeInstanceOf(Array);
      expect(qualityCheckPhase.tasks.join(' ')).toContain('npm run lint');
      expect(qualityCheckPhase.tasks.join(' ')).toContain('npm run typecheck');
      expect(qualityCheckPhase.tasks.join(' ')).toContain('npm test');
    });

    it('should have PR creation phase definition', () => {
      expect(prCreationPhase.phaseName).toBe(WorkflowPhase.PR_CREATION);
      expect(prCreationPhase.preconditions).toBeInstanceOf(Array);
      expect(prCreationPhase.acceptanceCriteria).toBeInstanceOf(Array);
      expect(prCreationPhase.tasks).toBeInstanceOf(Array);
      expect(prCreationPhase.tasks.join(' ')).toContain('Pull Request');
    });

    it('should have fix phase definition', () => {
      expect(fixPhase.phaseName).toBe(WorkflowPhase.FIX);
      expect(fixPhase.preconditions).toBeInstanceOf(Array);
      expect(fixPhase.acceptanceCriteria).toBeInstanceOf(Array);
      expect(fixPhase.tasks).toBeInstanceOf(Array);
      expect(fixPhase.preconditions).toContain('CI/CD pipeline has failed');
    });

    it('should have completion phase definition', () => {
      expect(completionPhase.phaseName).toBe(WorkflowPhase.COMPLETION);
      expect(completionPhase.preconditions).toBeInstanceOf(Array);
      expect(completionPhase.acceptanceCriteria).toBeInstanceOf(Array);
      expect(completionPhase.tasks).toBeInstanceOf(Array);
      expect(completionPhase.tasks.join(' ')).toContain('Merge Pull Request');
    });
  });

  describe('phaseDefinitions map', () => {
    it('should contain all 6 phases', () => {
      expect(Object.keys(phaseDefinitions)).toHaveLength(6);
      expect(phaseDefinitions[WorkflowPhase.ISSUE_START]).toBeDefined();
      expect(phaseDefinitions[WorkflowPhase.IMPLEMENTATION]).toBeDefined();
      expect(phaseDefinitions[WorkflowPhase.QUALITY_CHECK]).toBeDefined();
      expect(phaseDefinitions[WorkflowPhase.PR_CREATION]).toBeDefined();
      expect(phaseDefinitions[WorkflowPhase.FIX]).toBeDefined();
      expect(phaseDefinitions[WorkflowPhase.COMPLETION]).toBeDefined();
    });

    it('should match individual phase definitions', () => {
      expect(phaseDefinitions[WorkflowPhase.ISSUE_START]).toBe(issueStartPhase);
      expect(phaseDefinitions[WorkflowPhase.IMPLEMENTATION]).toBe(implementationPhase);
      expect(phaseDefinitions[WorkflowPhase.QUALITY_CHECK]).toBe(qualityCheckPhase);
      expect(phaseDefinitions[WorkflowPhase.PR_CREATION]).toBe(prCreationPhase);
      expect(phaseDefinitions[WorkflowPhase.FIX]).toBe(fixPhase);
      expect(phaseDefinitions[WorkflowPhase.COMPLETION]).toBe(completionPhase);
    });
  });

  describe('phase transitions', () => {
    it('should have correct transition rules', () => {
      expect(phaseTransitions[WorkflowPhase.ISSUE_START]).toEqual([WorkflowPhase.IMPLEMENTATION]);
      expect(phaseTransitions[WorkflowPhase.IMPLEMENTATION]).toEqual([WorkflowPhase.QUALITY_CHECK]);
      expect(phaseTransitions[WorkflowPhase.QUALITY_CHECK]).toEqual([WorkflowPhase.PR_CREATION]);
      expect(phaseTransitions[WorkflowPhase.PR_CREATION]).toEqual([WorkflowPhase.FIX, WorkflowPhase.COMPLETION]);
      expect(phaseTransitions[WorkflowPhase.FIX]).toEqual([WorkflowPhase.QUALITY_CHECK]);
      expect(phaseTransitions[WorkflowPhase.COMPLETION]).toEqual([]);
    });

    it('should handle linear progression', () => {
      expect(getValidNextPhases(WorkflowPhase.ISSUE_START)).toEqual([WorkflowPhase.IMPLEMENTATION]);
      expect(getValidNextPhases(WorkflowPhase.IMPLEMENTATION)).toEqual([WorkflowPhase.QUALITY_CHECK]);
      expect(getValidNextPhases(WorkflowPhase.QUALITY_CHECK)).toEqual([WorkflowPhase.PR_CREATION]);
    });

    it('should handle branching from PR creation', () => {
      const nextPhases = getValidNextPhases(WorkflowPhase.PR_CREATION);
      expect(nextPhases).toContain(WorkflowPhase.FIX);
      expect(nextPhases).toContain(WorkflowPhase.COMPLETION);
      expect(nextPhases).toHaveLength(2);
    });

    it('should handle fix phase loop back', () => {
      expect(getValidNextPhases(WorkflowPhase.FIX)).toEqual([WorkflowPhase.QUALITY_CHECK]);
    });

    it('should handle terminal completion phase', () => {
      expect(getValidNextPhases(WorkflowPhase.COMPLETION)).toEqual([]);
    });

    it('should handle unknown phases', () => {
      expect(getValidNextPhases('unknown_phase')).toEqual([]);
    });
  });

  describe('phase transition validation', () => {
    it('should validate correct transitions', () => {
      expect(isValidPhaseTransition(WorkflowPhase.ISSUE_START, WorkflowPhase.IMPLEMENTATION)).toBe(true);
      expect(isValidPhaseTransition(WorkflowPhase.IMPLEMENTATION, WorkflowPhase.QUALITY_CHECK)).toBe(true);
      expect(isValidPhaseTransition(WorkflowPhase.QUALITY_CHECK, WorkflowPhase.PR_CREATION)).toBe(true);
      expect(isValidPhaseTransition(WorkflowPhase.PR_CREATION, WorkflowPhase.FIX)).toBe(true);
      expect(isValidPhaseTransition(WorkflowPhase.PR_CREATION, WorkflowPhase.COMPLETION)).toBe(true);
      expect(isValidPhaseTransition(WorkflowPhase.FIX, WorkflowPhase.QUALITY_CHECK)).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidPhaseTransition(WorkflowPhase.ISSUE_START, WorkflowPhase.QUALITY_CHECK)).toBe(false);
      expect(isValidPhaseTransition(WorkflowPhase.IMPLEMENTATION, WorkflowPhase.PR_CREATION)).toBe(false);
      expect(isValidPhaseTransition(WorkflowPhase.QUALITY_CHECK, WorkflowPhase.COMPLETION)).toBe(false);
      expect(isValidPhaseTransition(WorkflowPhase.FIX, WorkflowPhase.IMPLEMENTATION)).toBe(false);
      expect(isValidPhaseTransition(WorkflowPhase.COMPLETION, WorkflowPhase.ISSUE_START)).toBe(false);
    });

    it('should handle unknown phases in validation', () => {
      expect(isValidPhaseTransition('unknown', WorkflowPhase.ISSUE_START)).toBe(false);
      expect(isValidPhaseTransition(WorkflowPhase.ISSUE_START, 'unknown')).toBe(false);
      expect(isValidPhaseTransition('unknown1', 'unknown2')).toBe(false);
    });
  });

  describe('phase content validation', () => {
    const phases = [
      issueStartPhase,
      implementationPhase,
      qualityCheckPhase,
      prCreationPhase,
      fixPhase,
      completionPhase,
    ];

    phases.forEach(phase => {
      describe(`${phase.phaseName} phase`, () => {
        it('should have required properties', () => {
          expect(phase.phaseName).toBeTruthy();
          expect(phase.preconditions).toBeInstanceOf(Array);
          expect(phase.acceptanceCriteria).toBeInstanceOf(Array);
          expect(phase.tasks).toBeInstanceOf(Array);
        });

        it('should have meaningful content', () => {
          expect(phase.preconditions.length).toBeGreaterThan(0);
          expect(phase.acceptanceCriteria.length).toBeGreaterThan(0);
          expect(phase.tasks.length).toBeGreaterThan(0);
          
          phase.preconditions.forEach(condition => {
            expect(typeof condition).toBe('string');
            expect(condition.length).toBeGreaterThan(0);
          });
          
          phase.acceptanceCriteria.forEach(criteria => {
            expect(typeof criteria).toBe('string');
            expect(criteria.length).toBeGreaterThan(0);
          });
          
          phase.tasks.forEach(task => {
            expect(typeof task).toBe('string');
            expect(task.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('quality check phase specifics', () => {
    it('should include required quality check commands', () => {
      const qcTasks = qualityCheckPhase.tasks.join(' ');
      expect(qcTasks).toContain('npm run lint');
      expect(qcTasks).toContain('npm run typecheck');
      expect(qcTasks).toContain('npm test');
    });

    it('should mention E2E tests conditionally', () => {
      const qcTasks = qualityCheckPhase.tasks.join(' ');
      expect(qcTasks).toContain('E2E');
      expect(qcTasks).toContain('if');
    });
  });

  describe('fix phase specifics', () => {
    it('should be conditional on CI failure', () => {
      expect(fixPhase.preconditions).toContain('CI/CD pipeline has failed');
      expect(fixPhase.tasks.join(' ')).toContain('CI/CD failure');
    });

    it('should loop back to quality checks', () => {
      expect(fixPhase.acceptanceCriteria).toContain('Quality checks pass again after fixes');
      expect(getValidNextPhases(WorkflowPhase.FIX)).toContain(WorkflowPhase.QUALITY_CHECK);
    });
  });

  describe('completion phase specifics', () => {
    it('should include retrospective tasks', () => {
      const completionTasks = completionPhase.tasks.join(' ');
      expect(completionTasks).toContain('retrospective');
      expect(completionTasks).toContain('comment');
    });

    it('should be terminal phase', () => {
      expect(getValidNextPhases(WorkflowPhase.COMPLETION)).toHaveLength(0);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { ProjectDataValidator } from './dataCache.js';

describe('ProjectDataValidator', () => {
  it('validates a list of valid projects', () => {
    const projects = [
      { id: 1, title: 'Test', description: 'Desc', status: 'active' },
      { id: 2, title: 'Another', description: 'Desc', status: 'completed' },
    ];

    const result = ProjectDataValidator.validateProjects(projects);
    expect(result.isValid).toBe(true);
    expect(result.validProjects.length).toBe(2);
    expect(result.invalidProjects.length).toBe(0);
  });

  it('flags invalid projects with missing required fields', () => {
    const projects = [
      { id: 1, title: '', description: '', status: 'unknown' },
      { id: null },
    ];

    const result = ProjectDataValidator.validateProjects(projects);
    expect(result.isValid).toBe(false);
    expect(result.validProjects.length).toBe(0);
    expect(result.invalidProjects.length).toBe(2);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
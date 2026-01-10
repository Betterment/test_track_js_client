import { indexAssignments, parseAssignment, type Assignment } from './assignment';

describe('parseAssignment', () => {
  it('parses V1 API data', () => {
    const assignment = parseAssignment({
      split_name: 'button_color',
      variant: 'red',
      context: 'homepage',
      unsynced: false
    });

    expect(assignment.splitName).toBe('button_color');
    expect(assignment.variant).toBe('red');
  });
});

describe('indexAssignments', () => {
  it('indexes assignments by splitName', () => {
    const a: Assignment = { splitName: 'a', variant: 'true', context: null, isUnsynced: false };
    const b: Assignment = { splitName: 'b', variant: 'true', context: null, isUnsynced: false };

    expect(indexAssignments([a, b])).toEqual({ a, b });
  });
});

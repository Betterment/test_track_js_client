import { Assignment } from './assignment';

describe('Assignment', () => {
  it('exposes properties', () => {
    const assignment = new Assignment({
      splitName: 'button_color',
      variant: 'blue',
      context: 'homepage',
      isUnsynced: true
    });

    expect(assignment.splitName).toBe('button_color');
    expect(assignment.variant).toBe('blue');
    expect(assignment.context).toBe('homepage');
  });

  it('converts context undefined to null', () => {
    const assignment = new Assignment({
      splitName: 'button_color',
      variant: 'blue',
      isUnsynced: false
    });

    expect(assignment.context).toBeNull();
  });

  it('creates from V1 API data', () => {
    const assignment = Assignment.fromV1Assignment({
      split_name: 'button_color',
      variant: 'red',
      context: 'homepage',
      unsynced: false
    });

    expect(assignment.splitName).toBe('button_color');
    expect(assignment.variant).toBe('red');
  });
});

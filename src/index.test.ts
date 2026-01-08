import { initialize } from './index';

describe('TestTrack', () => {
  it('should export initialize function', () => {
    expect(typeof initialize).toBe('function');
  });
});

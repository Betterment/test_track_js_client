import TestTrack from './testTrack';

jest.mock('./configParser', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getConfig: () => {
        return {
          url: 'http://testtrack.dev',
          cookieDomain: '.example.com',
          cookieName: 'test',
          splits: {
            jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
            wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
          },
          assignments: {
            jabba: 'puppet',
            wine: 'rose'
          },
          experienceSamplingWeight: 1
        };
      }
    };
  });
});

describe('TestTrack', () => {
  it('should be an object', () => {
    expect(typeof TestTrack).toBe('object');
  });
});

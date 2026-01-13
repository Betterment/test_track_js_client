import * as TestTrack from './index';

describe('TestTrack', () => {
  it('should export initialize function', () => {
    expect(TestTrack).toMatchObject({
      load: expect.any(Function),
      create: expect.any(Function),
      createCookieStorage: expect.any(Function)
    });
  });
});

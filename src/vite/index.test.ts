/// <reference types="vite/client" />

describe('testTrackPlugin', () => {
  it('defines TT_BUILD_TIMESTAMP as ISO8601', () => {
    expect(import.meta.env.TT_BUILD_TIMESTAMP).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

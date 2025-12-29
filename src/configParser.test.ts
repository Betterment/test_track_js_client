import ConfigParser from './configParser';

describe('ConfigParser', () => {
  let configParser: ConfigParser;

  beforeEach(() => {
    configParser = new ConfigParser();
    window.TT = 'eyJhIjoiYiIsImMiOnsiZCI6ImUifSwiZiI6WyJnIiwiaCJdfQ==';
  });

  describe('#getConfig()', () => {
    it('parses the window.TT variable', () => {
      expect(configParser.getConfig()).toEqual({
        a: 'b',
        c: { d: 'e' },
        f: ['g', 'h']
      });
    });

    describe('window.TT is not decodable', () => {
      beforeEach(() => {
        window.TT = 'someNonesense';
      });

      it('raises an error', () => {
        expect(configParser.getConfig).toThrow('Unable to parse configuration');
      });
    });

    describe('atob is not available', () => {
      const originalAtob = window.atob;

      beforeEach(() => {
        // @ts-expect-error window.atob is always available
        window.atob = undefined;
      });

      afterEach(() => {
        window.atob = originalAtob;
      });

      it('parses the window.TT variable', () => {
        expect(configParser.getConfig()).toEqual({
          a: 'b',
          c: { d: 'e' },
          f: ['g', 'h']
        });
      });
    });
  });
});

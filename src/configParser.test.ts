import ConfigParser from './configParser';

describe('ConfigParser', () => {
  let testContext: { configParser?: ConfigParser; originalAtob?: typeof atob };

  beforeEach(() => {
    testContext = {};
    testContext.configParser = new ConfigParser();
    window.TT = 'eyJhIjoiYiIsImMiOnsiZCI6ImUifSwiZiI6WyJnIiwiaCJdfQ==';
  });

  describe('#getConfig()', () => {
    it('parses the window.TT variable', () => {
      expect(testContext.configParser.getConfig()).toEqual({
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
        expect(testContext.configParser.getConfig).toThrow('Unable to parse configuration');
      });
    });

    describe('atob is not available', () => {
      beforeEach(() => {
        testContext.originalAtob = window.atob;
        window.atob = undefined;
      });

      afterEach(() => {
        window.atob = testContext.originalAtob;
      });

      it('parses the window.TT variable', () => {
        expect(testContext.configParser.getConfig()).toEqual({
          a: 'b',
          c: { d: 'e' },
          f: ['g', 'h']
        });
      });
    });
  });
});

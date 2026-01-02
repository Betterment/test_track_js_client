import ConfigParser from './configParser';

describe('ConfigParser', () => {
  beforeEach(() => {
    window.TT = 'eyJhIjoiYiIsImMiOnsiZCI6ImUifSwiZiI6WyJnIiwiaCJdfQ==';
  });

  describe('#getConfig()', () => {
    it('parses the window.TT variable', () => {
      const configParser = new ConfigParser();
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
        const configParser = new ConfigParser();
        expect(configParser.getConfig).toThrow('The string to be decoded is not correctly encoded');
      });
    });
  });
});

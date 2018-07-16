import ConfigParser from '../../src/configParser';

describe('ConfigParser', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
        testContext.configParser = new ConfigParser();
        window.TT = 'eyJhIjoiYiIsImMiOnsiZCI6ImUifSwiZiI6WyJnIiwiaCJdfQ==';
    });

    describe('#getConfig()', () => {
        test('parses the window.TT variable', () => {
            expect(testContext.configParser.getConfig()).toEqual({
                a: "b", c: { d: "e", }, f: ["g", "h"]
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

            test('parses the window.TT variable', () => {
                expect(testContext.configParser.getConfig()).toEqual({
                    a: "b", c: { d: "e", }, f: ["g", "h"]
                });
            });
        });
    });
});

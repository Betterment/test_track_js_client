import ConfigParser from '../../src/configParser';

describe('ConfigParser', function() {
    beforeEach(function() {
        window.TT = 'eyJhIjoiYiIsImMiOnsiZCI6ImUifSwiZiI6WyJnIiwiaCJdfQ==';
        this.configParser = new ConfigParser();
    });

    describe('#getConfig()', function() {
        it('parses the window.TT variable', function() {
            expect(this.configParser.getConfig()).to.deep.equal({
                a: "b", c: { d: "e", }, f: ["g", "h"]
            });
        });

        context('atob is not available', function() {
            beforeEach(function() {
                this.originalAtob = window.atob;
                window.atob = undefined;
            });

            afterEach(function() {
                window.atob = this.originalAtob;
            });

            it('parses the window.TT variable', function() {
                expect(this.configParser.getConfig()).to.deep.equal({
                    a: "b", c: { d: "e", }, f: ["g", "h"]
                });
            });
        });
    });
});

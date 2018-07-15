import TestTrackConfig from '../../src/testTrackConfig';
import VariantCalculator from '../../src/variantCalculator';
import Visitor from '../../src/visitor';

describe('VariantCalculator', function() {
    var calculatorOptions;

    afterEach(function() {
        sinon.restore();
        TestTrackConfig._clear();
    });

    function createCalculator() {
        return new VariantCalculator(calculatorOptions);
    }

    beforeEach(function() {
        this.visitor = new Visitor({
            id: '00000000-0000-0000-0000-000000000000',
            assignments: []
        });
        this.logErrorStub = sinon.stub(this.visitor, 'logError');

        calculatorOptions = {
            visitor: this.visitor,
            splitName: 'logoSize'
        };

        this.calculator = createCalculator();

        this.splitRegistryStub = sinon.stub(TestTrackConfig, 'getSplitRegistry').returns({
            logoSize: {
                extraGiant: 0,
                giant: 80,
                huge: 1,
                leetle: 0,
                miniscule: 19,
                teeny: 0
            }
        });
    });

    it('requires a visitor', function() {
        expect(function() {
            delete calculatorOptions.visitor;
            createCalculator();
        }).to.throw('must provide visitor');
    });

    it('requires a splitName', function() {
        expect(function() {
            delete calculatorOptions.splitName;
            createCalculator();
        }).to.throw('must provide splitName');
    });

    describe('#getSplitVisitorHash()', function() {
        it('calculates MD5 of splitName and visitorId', function() {
            // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
            expect(this.calculator.getSplitVisitorHash()).to.equal('b72dca208c59ddeab8a1b9bc22f12224');
        });
    });

    describe('#getHashFixnum()', function() {
        it('converts 00000000deadbeef into 0', function() {
            sinon.stub(this.calculator, 'getSplitVisitorHash').returns('00000000deadbeef');
            expect(this.calculator.getHashFixnum()).to.equal(0);
        });

        it('converts 0000000fdeadbeef into 15', function() {
            sinon.stub(this.calculator, 'getSplitVisitorHash').returns('0000000fdeadbeef');
            expect(this.calculator.getHashFixnum()).to.equal(15);
        });

        it('converts ffffffffdeadbeef into 4294967295', function() {
            sinon.stub(this.calculator, 'getSplitVisitorHash').returns('ffffffffdeadbeef');
            expect(this.calculator.getHashFixnum()).to.equal(4294967295);
        });
    });

    describe('#getAssignmentBucket()', function() {
        it('puts 0 in bucket 0', function() {
            sinon.stub(this.calculator, 'getHashFixnum').returns(0);
            expect(this.calculator.getAssignmentBucket()).to.equal(0);
        });

        it('puts 99 in bucket 99', function() {
            sinon.stub(this.calculator, 'getHashFixnum').returns(99);
            expect(this.calculator.getAssignmentBucket()).to.equal(99);
        });

        it('puts 100 in bucket 0', function() {
            sinon.stub(this.calculator, 'getHashFixnum').returns(100);
            expect(this.calculator.getAssignmentBucket()).to.equal(0);
        });

        it('puts 4294967295 in bucket 95', function() {
            sinon.stub(this.calculator, 'getHashFixnum').returns(4294967295);
            expect(this.calculator.getAssignmentBucket()).to.equal(95);
        });
    });

    describe('#getSortedVariants()', function() {
        it('sorts variants alphabetically', function() {
            expect(this.calculator.getSortedVariants()).to.deep.equal([
                'extraGiant',
                'giant',
                'huge',
                'leetle',
                'miniscule',
                'teeny'
            ]);
        });
    });

    describe('#getWeighting()', function() {
        it('throws when given an unknown splitName', function() {
            calculatorOptions.splitName = 'nonExistentSplit';
            var calculator = createCalculator();

            expect(function() {
                calculator.getVariant();
            }).to.throw('Unknown split: "nonExistentSplit"');
        });

        it('logs an error when given an unknown splitName', function() {
            calculatorOptions.splitName = 'nonExistentSplit';
            var calculator = createCalculator();

            try {
                calculator.getVariant();
            } catch (e) {
            }

            expect(this.logErrorStub).to.be.calledOnce;
            expect(this.logErrorStub).to.be.calledWithExactly('Unknown split: "nonExistentSplit"');
        });

        it('returns the weighting for a split', function() {
            expect(this.calculator.getWeighting()).to.deep.equal({
                extraGiant: 0,
                giant: 80,
                huge: 1,
                leetle: 0,
                miniscule: 19,
                teeny: 0
            });
        });
    });

    describe('#getVariant()', function() {
        it('returns the first variant with non-zero weight from bucket 0', function() {
            sinon.stub(this.calculator, 'getAssignmentBucket').returns(0);
            expect(this.calculator.getVariant()).to.equal('giant');
        });

        it('returns the last variant with non-zero weight from bucket 99', function() {
            sinon.stub(this.calculator, 'getAssignmentBucket').returns(99);
            expect(this.calculator.getVariant()).to.equal('miniscule');
        });

        it('returns the correct 1%-wide variant', function() {
            sinon.stub(this.calculator, 'getAssignmentBucket').returns(80);
            expect(this.calculator.getVariant()).to.equal('huge');
        });

        it('returns null if there is no split registry', function() {
            this.splitRegistryStub.returns(null);
            expect(this.calculator.getVariant()).to.be.null;
        });

        it('throws an error with an incomplete weighting', function() {
            this.splitRegistryStub.returns({
                invalidWeighting: {
                    yes: 33,
                    no: 33,
                    maybe: 33
                }
            });

            calculatorOptions.splitName = 'invalidWeighting';
            var calculator = createCalculator();
            sinon.stub(calculator, 'getAssignmentBucket').returns(99);

            expect(function() {
                calculator.getVariant();
            }).to.throw('Assignment bucket out of range. 99 unmatched in invalidWeighting: {"yes":33,"no":33,"maybe":33}');
        });
    });
});

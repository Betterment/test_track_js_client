import ABConfiguration from '../../src/abConfiguration';
import TestTrackConfig from '../../src/testTrackConfig';
import Visitor from '../../src/visitor';

jest.mock('../../src/testTrackConfig', () => {
    return {
        getSplitRegistry: jest.fn()
    };
});

describe('ABConfiguration', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
        TestTrackConfig.getSplitRegistry.mockClear();
        TestTrackConfig.getSplitRegistry.mockReturnValue({
            element: {
                earth: 25,
                wind: 25,
                fire: 25,
                water: 25
            },
            button_color: {
                red: 50,
                blue: 50
            }
        });

        testContext.visitor = new Visitor({
            id: 'visitor_id',
            assignments: []
        });
        testContext.visitor.logError = jest.fn();
    });

    test('requires a splitName', () => {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                trueVariant: 'red',
                visitor: testContext.visitor
            });
        }.bind(this)).toThrowError('must provide splitName');
    });

    test('requires an trueVariant', () => {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'button_color',
                visitor: testContext.visitor
            });
        }.bind(this)).toThrowError('must provide trueVariant');
    });

    test('requires a visitor', () => {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'button_color',
                trueVariant: 'red'
            });
        }.bind(this)).toThrowError('must provide visitor');
    });

    test('allows a null trueVariant', () => {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'button_color',
                trueVariant: null,
                visitor: testContext.visitor
            });
        }.bind(this)).not.toThrowError();
    });

    describe('#getVariants()', () => {
        test('logs an error if the split does not have exactly two variants', () => {
            var abConfiguration = new ABConfiguration({
                splitName: 'element',
                trueVariant: 'water',
                visitor: testContext.visitor
            });

            abConfiguration.getVariants();

            expect(testContext.visitor.logError).toHaveBeenCalledWith('A/B for element configures split with more than 2 variants');
        });

        test('does not log an error if the split registry is unavailable', () => {
            TestTrackConfig.getSplitRegistry.mockReturnValue(null);

            var abConfiguration = new ABConfiguration({
                splitName: 'element',
                trueVariant: 'water',
                visitor: testContext.visitor
            });

            abConfiguration.getVariants();

            expect(testContext.visitor.logError).not.toHaveBeenCalled();
        });

        describe('true variant', () => {
            test('is true if null was passed in during instantiation', () => {
                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: null,
                    visitor: testContext.visitor
                });

                expect(abConfiguration.getVariants().true).toBe(true);
            });

            test('is whatever was passed in during instantiation', () => {
                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: 'red',
                    visitor: testContext.visitor
                });

                expect(abConfiguration.getVariants().true).toBe('red');
            });
        });

        describe('false variant', () => {
            test('is the variant of the split that is not the true_variant', () => {
                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: 'red',
                    visitor: testContext.visitor
                });

                expect(abConfiguration.getVariants().false).toBe('blue');
            });

            test('is false when there is no split_registry', () => {
                TestTrackConfig.getSplitRegistry.mockReturnValue(null);

                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: 'red',
                    visitor: testContext.visitor
                });

                expect(abConfiguration.getVariants().false).toBe(false);
            });

            test('is always the same if the split has more than two variants', () => {
                var abConfiguration = new ABConfiguration({
                    splitName: 'element',
                    trueVariant: 'earth',
                    visitor: testContext.visitor
                });

                expect(abConfiguration.getVariants().false).toBe('fire');
            });
        });
    });
});

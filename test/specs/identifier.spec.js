import Assignment from '../../src/assignment';
import Identifier from '../../src/identifier';
import TestTrackConfig from '../../src/testTrackConfig';
import Visitor from '../../src/visitor';
import $ from 'jquery';

jest.mock('../../src/testTrackConfig', () => {
    return {
        getUrl: () => 'http://testtrack.dev'
    };
});

jest.mock('../../src/visitor');

describe('Identifier', () => {
    let identifierOptions;
    function createIdentifier() {
        return new Identifier(identifierOptions);
    }

    let testContext;
    beforeEach(() => {
        testContext = {};
        $.ajax = jest.fn().mockImplementation(() => $.Deferred().resolveWith(null, [{
            visitor: {
                id: 'actual_visitor_id',
                assignments: [{
                    split_name: 'jabba',
                    variant: 'puppet',
                    context: 'mos_eisley',
                    unsynced: true
                }, {
                    split_name: 'wine',
                    variant: 'red',
                    context: 'napa',
                    unsynced: false
                }]
            }
        }]));

        identifierOptions = {
            visitorId: 'transient_visitor_id',
            identifierType: 'myappdb_user_id',
            value: 444
        };

        testContext.identifier = createIdentifier();
    });

    test('requires a visitorId', () => {
        expect(function() {
            delete identifierOptions.visitorId;
            createIdentifier();
        }).toThrowError('must provide visitorId');
    });

    test('requires a identifierType', () => {
        expect(function() {
            delete identifierOptions.identifierType;
            createIdentifier();
        }).toThrowError('must provide identifierType');
    });

    test('requires a value', () => {
        expect(function() {
            delete identifierOptions.value;
            createIdentifier();
        }).toThrowError('must provide value');
    });

    describe('#save()', () => {
        test('hits the test track server with the correct parameters', (done) => {
            testContext.identifier.save().then(function() {
                expect($.ajax).toHaveBeenCalledTimes(1);
                expect($.ajax).toHaveBeenCalledWith('http://testtrack.dev/api/v1/identifier', {
                    method: 'POST',
                    dataType: 'json',
                    crossDomain: true,
                    data: {
                        identifier_type: 'myappdb_user_id',
                        value: 444,
                        visitor_id: 'transient_visitor_id'
                    }
                });

                done();
            });
        });

        test('responds with a Visitor instance with the attributes from the server', (done) => {
            var jabbaAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', context: 'mos_eisley', isUnsynced: true }),
                wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', context: 'napa', isUnsynced: false });

            testContext.identifier.save().then(function(visitor) {
                expect(Visitor).toHaveBeenCalledTimes(1);
                expect(Visitor).toHaveBeenCalledWith({
                    id: 'actual_visitor_id',
                    assignments: [jabbaAssignment, wineAssignment]
                });

                done();
            });
        });
    });
});

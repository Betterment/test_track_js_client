import Assignment from '../../src/assignment';
import ConfigParser from '../../src/configParser';
import TestTrackConfig from '../../src/testTrackConfig';

let mockCookieName;

jest.mock('../../src/configParser', () => {
    return jest.fn().mockImplementation(() => {
        return {
            getConfig: () => {
                return {
                    url: "http://testtrack.dev",
                    cookieDomain: ".example.com",
                    cookieName: mockCookieName,
                    registry: {
                        jabba: { cgi: 50, puppet: 50 },
                        wine: { red: 50, white: 25, rose: 25 }
                    },
                    assignments: {
                        jabba: 'puppet',
                        wine: 'rose'
                    }
                };
            }
        };
    });
});

describe('TestTrackConfig', () => {
    beforeEach(() => {
        ConfigParser.mockClear();
        TestTrackConfig._clear();
    });

    describe('.getUrl()', () => {
        test('grabs the correct value from the ConfigParser', () => {
            expect(TestTrackConfig.getUrl()).toBe('http://testtrack.dev');
        });
    });

    describe('.getCookieDomain()', () => {
        test('grabs the correct value from the ConfigParser', () => {
            expect(TestTrackConfig.getCookieDomain()).toBe('.example.com');
        });
    });

    describe('.getCookieName()', () => {
        describe('when there is a configured cookie name', () => {
            beforeEach(() => {
                mockCookieName = 'custom_cookie_name';
            });

            test('grabs the correct value from the ConfigParser', () => {
                expect(TestTrackConfig.getCookieName()).toBe('custom_cookie_name');
            });
        });

        describe('when there is no configured cookie name', () => {
            beforeEach(() => {
                mockCookieName = undefined;
            });

            test('uses the default cookie name', () => {
                expect(TestTrackConfig.getCookieName()).toBe('tt_visitor_id');
            });
        });
    });

    describe('.getSplitRegistry()', () => {
        test('grabs the correct value from the ConfigParser', () => {
            expect(TestTrackConfig.getSplitRegistry()).toEqual({
                jabba: { cgi: 50, puppet: 50 },
                wine: { red: 50, white: 25, rose: 25 }
            });
        });
    });

    describe('.getAssignments()', () => {
        test('grabs the correct value from the ConfigParser', () => {
            expect(TestTrackConfig.getAssignments()).toEqual([
                new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: false }),
                new Assignment({ splitName: 'wine', variant: 'rose', isUnsynced: false })
            ]);
        });
    });
});

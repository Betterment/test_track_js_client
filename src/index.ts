import { createSession } from './session';

export type { TestTrack } from './testTrack';
export type { AnalyticsProvider } from './analyticsProvider';

const session = createSession();

export const initialize = session.initialize.bind(session);

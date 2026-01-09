import { createSession } from './session';

export type { TestTrack } from './testTrack';
export type { AnalyticsProvider } from './analyticsProvider';

const session = createSession();

export const initialize = session.initialize.bind(session);

/** @deprecated `initialize()` returns `TestTrack` */
export const vary = session.vary.bind(session);
/** @deprecated `initialize()` returns `TestTrack` */
export const ab = session.ab.bind(session);
/** @deprecated `initialize()` returns `TestTrack` */
export const logIn = session.logIn.bind(session);
/** @deprecated `initialize()` returns `TestTrack` */
export const signUp = session.signUp.bind(session);
/** @deprecated `initialize()` returns `TestTrack` */
export const _crx = session._crx;

import { createSession } from './session';

export type { TestTrack } from './testTrack';
export type { AnalyticsProvider } from './analyticsProvider';

const session = createSession();

/* eslint-disable @typescript-eslint/unbound-method */
export const initialize = session.initialize;

/** @deprecated `initialize()` returns `TestTrack` */
export const vary = session.vary;
/** @deprecated `initialize()` returns `TestTrack` */
export const ab = session.ab;
/** @deprecated `initialize()` returns `TestTrack` */
export const logIn = session.logIn;
/** @deprecated `initialize()` returns `TestTrack` */
export const signUp = session.signUp;
/** @deprecated `initialize()` returns `TestTrack` */
export const _crx = session._crx;
/* eslint-enable @typescript-eslint/unbound-method */

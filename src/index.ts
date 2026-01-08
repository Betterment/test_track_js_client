import { createSession } from './session';
export type { AnalyticsProvider } from './analyticsProvider';

const session = createSession();

const notifyListener = () => {
  window.dispatchEvent(
    new CustomEvent('tt:lib:loaded', {
      detail: {
        TestTrack: session
      }
    })
  );
};
const loadTestTrack = () => {
  // Add class to body of page after body is loaded to enable chrome extension support
  document.body.classList.add('_tt');
  try {
    window.dispatchEvent(new CustomEvent('tt:class:added'));
  } catch {
    // ignore
  }
};

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTestTrack);
  } else {
    loadTestTrack();
  }

  // **** The order of these two lines is important, they support 2 different cases:
  // in the case where there is already code listening for 'tt:lib:loaded', trigger it immediately
  // in the case where there is not yet code listening for 'tt:lib:loaded', listen for 'tt:listener:ready' and then trigger 'tt:lib:loaded'
  notifyListener();
  window.addEventListener('tt:listener:ready', notifyListener);
} catch {
  // ignore
}

export type { TestTrack } from './testTrack';

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

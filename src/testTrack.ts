import Session from './session';

const TestTrack = new Session().getPublicAPI();
const notifyListener = function() {
  window.dispatchEvent(
    new CustomEvent('tt:lib:loaded', {
      detail: {
        TestTrack: TestTrack
      }
    })
  );
};
const loadTestTrack = function() {
  // Add class to body of page after body is loaded to enable chrome extension support
  document.body.classList.add('_tt');
  try {
    window.dispatchEvent(new CustomEvent('tt:class:added'));
  } catch (e) {
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
} catch (e) {
  // ignore
}

export default TestTrack;

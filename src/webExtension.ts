import type { Assignment } from './visitor';
import type { Client } from './client';
import type { SplitRegistry, V1Hash } from './splitRegistry';

type Options = {
  client: Client;
  visitorId: string;
  splitRegistry: SplitRegistry;
  assignments: Assignment[];
  errorLogger: (errorMessage: string) => void;
};

type Info = {
  visitorId: string;
  splitRegistry: V1Hash;
  assignmentRegistry: Record<string, string | null>;
};

export type WebExtension = {
  loadInfo(): Promise<Info>;
  persistAssignment(splitName: string, variant: string, username: string, password: string): Promise<void>;
};

export function createWebExtension(options: Options): WebExtension {
  const { client, visitorId, splitRegistry, assignments, errorLogger } = options;

  return {
    loadInfo() {
      return Promise.resolve({
        visitorId,
        splitRegistry: splitRegistry.asV1Hash(),
        assignmentRegistry: Object.fromEntries(
          assignments.map(assignment => [assignment.splitName, assignment.variant])
        )
      });
    },

    async persistAssignment(splitName, variant, username, password) {
      await client
        .postAssignmentOverride({
          visitor_id: visitorId,
          split_name: splitName,
          variant,
          context: 'chrome_extension',
          mixpanel_result: 'success',
          auth: { username, password }
        })
        .catch(error => {
          errorLogger(`test_track persistAssignment error: ${error}`);
        });
    }
  };
}

export function connectToWebExtension(webExtension: WebExtension): void {
  const TestTrack = {
    _crx: webExtension
  };

  const notifyListener = () => {
    window.dispatchEvent(new CustomEvent('tt:lib:loaded', { detail: { TestTrack } }));
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
}

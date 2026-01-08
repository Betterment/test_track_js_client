import type Assignment from './assignment';
import type { Client } from './client';
import type { SplitRegistry, V1Hash } from './splitRegistry';

type Options = {
  client: Client;
  visitorId: string;
  splitRegistry: SplitRegistry;
  assignments: Assignment[];
  logError: (errorMessage: string) => void;
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
  const { client, visitorId, splitRegistry, assignments, logError } = options;

  return {
    loadInfo() {
      return Promise.resolve({
        visitorId,
        splitRegistry: splitRegistry.asV1Hash(),
        assignmentRegistry: Object.fromEntries(
          assignments.map(assignment => [assignment.getSplitName(), assignment.getVariant()])
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
          logError(`test_track persistAssignment error: ${error}`);
        });
    }
  };
}

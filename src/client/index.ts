import { request, toSearchParams } from './request';
import type {
  V1Visitor,
  V1IdentifierParams,
  V1Identifier,
  V1AssignmentOverrideParams,
  V1AssignmentEventParams
} from './types';

type ClientConfig = {
  url: string;
};

export * from './types';

export type Client = ReturnType<typeof createClient>;

export function urlFor(path: `/${string}`, base: URL): URL {
  return new URL(base.pathname.replace(/\/$/, '') + path, base);
}

export function createClient(config: ClientConfig) {
  const base = new URL(config.url);

  return {
    async getVisitor(visitorId: string): Promise<V1Visitor> {
      const { data } = await request<V1Visitor>({
        method: 'GET',
        url: urlFor(`/api/v1/visitors/${visitorId}`, base),
        timeout: 5000
      });

      return data;
    },

    async postIdentifier(params: V1IdentifierParams): Promise<V1Identifier> {
      const { data } = await request<V1Identifier>({
        method: 'POST',
        url: urlFor('/api/v1/identifier', base),
        body: toSearchParams(params)
      });

      return data;
    },

    async postAssignmentOverride({ auth, ...params }: V1AssignmentOverrideParams): Promise<void> {
      await request({
        method: 'POST',
        url: urlFor('/api/v1/assignment_override', base),
        body: toSearchParams(params),
        auth
      });
    },

    async postAssignmentEvent(params: V1AssignmentEventParams): Promise<void> {
      await request({
        method: 'POST',
        url: urlFor('/api/v1/assignment_event', base),
        body: toSearchParams(params)
      });
    }
  };
}

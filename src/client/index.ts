import { request } from './request';
import type { V4VisitorConfig, V4IdentifierParams, V2AssignmentOverrideParams, V1AssignmentEventParams } from './types';

export type ClientConfig = {
  url: string;
  appName: string;
  appVersion: string;
  buildTimestamp: string;
};

export * from './types';

export type Client = ReturnType<typeof createClient>;

export function urlFor(path: `/${string}`, base: URL): URL {
  return new URL(base.pathname.replace(/\/$/, '') + path, base);
}

export function createClient(config: ClientConfig) {
  const base = new URL(config.url);
  const buildURL =
    `/api/v4/apps/${config.appName}/versions/${config.appVersion}/builds/${config.buildTimestamp}` as const;

  return {
    async getVisitorConfig(visitorId: string): Promise<V4VisitorConfig> {
      const { data } = await request<V4VisitorConfig>({
        method: 'GET',
        url: urlFor(`${buildURL}/visitors/${visitorId}/config`, base),
        timeout: 5000
      });

      return data;
    },

    async postIdentifier(params: V4IdentifierParams): Promise<V4VisitorConfig> {
      const { data } = await request<V4VisitorConfig>({
        method: 'POST',
        url: urlFor(`${buildURL}/identifier`, base),
        body: JSON.stringify(params)
      });

      return data;
    },

    async postAssignmentOverride({ auth, visitor_id, assignments }: V2AssignmentOverrideParams): Promise<void> {
      await request({
        method: 'POST',
        url: urlFor(`/api/v2/visitors/${visitor_id}/assignment_overrides`, base),
        body: JSON.stringify({ assignments }),
        auth
      });
    },

    async postAssignmentEvent(params: V1AssignmentEventParams): Promise<void> {
      await request({
        method: 'POST',
        url: urlFor('/api/v1/assignment_event', base),
        body: JSON.stringify(params)
      });
    }
  };
}

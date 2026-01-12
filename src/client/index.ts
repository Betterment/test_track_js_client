import { request } from './request';
import type {
  V4VisitorConfig,
  V4IdentifierParams,
  V1AssignmentOverrideParams,
  V1AssignmentEventParams
} from './types';

export type ClientConfig = {
  url: string;
  appName: string;
  appVersion: string;
  buildTimestamp: string;
};

export * from './types';

export type Client = ReturnType<typeof createClient>;

export function createClient(config: ClientConfig) {
  const buildURL = `/api/v4/apps/${config.appName}/versions/${config.appVersion}/builds/${config.buildTimestamp}`;

  return {
    async getVisitorConfig(visitorId: string): Promise<V4VisitorConfig> {
      const { data } = await request<V4VisitorConfig>({
        method: 'GET',
        url: new URL(`${buildURL}/visitors/${visitorId}/config`, config.url),
        timeout: 5000
      });

      return data;
    },

    async postIdentifier(params: V4IdentifierParams): Promise<V4VisitorConfig> {
      const { data } = await request<V4VisitorConfig>({
        method: 'POST',
        url: new URL(`${buildURL}/identifier`, config.url),
        body: JSON.stringify(params)
      });

      return data;
    },

    async postAssignmentOverride({ auth, ...params }: V1AssignmentOverrideParams): Promise<void> {
      await request({
        method: 'POST',
        url: new URL('/api/v1/assignment_override', config.url),
        body: JSON.stringify(params),
        auth
      });
    },

    async postAssignmentEvent(params: V1AssignmentEventParams): Promise<void> {
      await request({
        method: 'POST',
        url: new URL('/api/v1/assignment_event', config.url),
        body: JSON.stringify(params)
      });
    }
  };
}

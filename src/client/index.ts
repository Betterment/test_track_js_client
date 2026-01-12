import { request } from './request';
import type {
  V1Visitor,
  V4VisitorConfig,
  V1IdentifierParams,
  V1Identifier,
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
    async getVisitor(visitorId: string): Promise<V1Visitor> {
      const { data } = await request<V1Visitor>({
        method: 'GET',
        url: new URL(`/api/v1/visitors/${visitorId}`, config.url),
        timeout: 5000
      });

      return data;
    },

    async getVisitorConfig(visitorId: string): Promise<V4VisitorConfig> {
      const { data } = await request<V4VisitorConfig>({
        method: 'GET',
        url: new URL(`${buildURL}/visitors/${visitorId}/config`, config.url),
        timeout: 5000
      });

      return data;
    },

    async postIdentifier(params: V1IdentifierParams): Promise<V1Identifier> {
      const { data } = await request<V1Identifier>({
        method: 'POST',
        url: new URL('/api/v1/identifier', config.url),
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

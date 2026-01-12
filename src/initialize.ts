import { v4 as uuid } from 'uuid';
import { loadConfig } from './config';
import { TestTrack } from './testTrack';
import { loadVisitorConfig, parseVisitorConfig } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import { createCookieStorage } from './storageProvider';
import { createClient, type ClientConfig, type V4VisitorConfig } from './client';

type InitializeOptions = {
  client: ClientConfig;
  visitorConfig?: V4VisitorConfig;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

export async function initialize(options: InitializeOptions): Promise<TestTrack> {
  const config = loadConfig();
  const client = createClient(options.client);
  const storage = createCookieStorage({ domain: config.cookieDomain, name: config.cookieName });

  const visitorId = storage.getVisitorId() ?? uuid();
  const visitorConfig = options.visitorConfig
    ? parseVisitorConfig(options.visitorConfig)
    : await loadVisitorConfig(client, visitorId);

  const testTrack = TestTrack.create({
    client,
    storage,
    splitRegistry: visitorConfig.splitRegistry,
    visitor: visitorConfig.visitor,
    analytics: options.analytics,
    errorLogger: options.errorLogger
  });

  storage.setVisitorId(testTrack.visitorId);

  return testTrack;
}

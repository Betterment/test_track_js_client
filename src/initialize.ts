import { v4 as uuid } from 'uuid';
import { TestTrack } from './testTrack';
import { loadVisitorConfig, parseVisitorConfig } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import { type StorageProvider } from './storageProvider';
import { createClient, type ClientConfig, type V4VisitorConfig } from './client';

type InitializeOptions = {
  client: ClientConfig;
  storage: StorageProvider;
  visitorConfig?: V4VisitorConfig;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

export async function initialize(options: InitializeOptions): Promise<TestTrack> {
  const { storage, analytics, errorLogger } = options;

  const client = createClient(options.client);
  const visitorId = storage.getVisitorId() ?? uuid();
  const { visitor, splitRegistry } = options.visitorConfig
    ? parseVisitorConfig(options.visitorConfig)
    : await loadVisitorConfig(client, visitorId);

  const testTrack = TestTrack.create({
    client,
    storage,
    splitRegistry,
    visitor,
    analytics,
    errorLogger
  });

  return testTrack;
}

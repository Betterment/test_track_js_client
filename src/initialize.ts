import { v4 as uuid } from 'uuid';
import { TestTrack } from './testTrack';
import { loadVisitorConfig, parseVisitorConfig } from './visitor';
import { createClient, type ClientConfig, type V4VisitorConfig } from './client';
import type { AnalyticsProvider } from './analyticsProvider';
import type { StorageProvider } from './storageProvider';

type InitializeOptions = {
  client: ClientConfig;
  storage: StorageProvider;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

type CreateOptions = InitializeOptions & {
  visitorConfig: V4VisitorConfig;
};

export async function initialize(options: InitializeOptions): Promise<TestTrack> {
  const { storage, analytics, errorLogger } = options;

  const client = createClient(options.client);
  const visitorId = storage.getVisitorId() ?? uuid();
  const { visitor, splitRegistry } = await loadVisitorConfig(client, visitorId);

  return TestTrack.create({ client, storage, splitRegistry, visitor, analytics, errorLogger });
}

export function create(options: CreateOptions): TestTrack {
  const { storage, analytics, errorLogger } = options;

  const client = createClient(options.client);
  const { visitor, splitRegistry } = parseVisitorConfig(options.visitorConfig);

  return TestTrack.create({ client, storage, splitRegistry, visitor, analytics, errorLogger });
}

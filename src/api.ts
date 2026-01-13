import { v4 as uuid } from 'uuid';
import { TestTrack } from './testTrack';
import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import { loadVisitorConfig, parseVisitorConfig } from './visitor';
import { createClient, type ClientConfig, type V4VisitorConfig } from './client';
import { createCookieStorage, type StorageProvider } from './storageProvider';
import type { AnalyticsProvider } from './analyticsProvider';

type InitializeOptions = {
  client: Omit<ClientConfig, 'url'>;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

type LoadOptions = InitializeOptions & {
  client: ClientConfig;
  storage: StorageProvider;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

type CreateOptions = LoadOptions & {
  visitorConfig: V4VisitorConfig;
};

/**
 * Fetches visitor config from the server to create a `TestTrack` instance
 */
export async function load(options: LoadOptions): Promise<TestTrack> {
  const { storage, analytics, errorLogger } = options;

  const client = createClient(options.client);
  const visitorId = storage.getVisitorId() ?? uuid();
  const { visitor, splitRegistry } = await loadVisitorConfig(client, visitorId);

  return TestTrack.create({ client, storage, splitRegistry, visitor, analytics, errorLogger });
}

/**
 * Creates a `TestTrack` instance with preloaded data
 */
export function create(options: CreateOptions): TestTrack {
  const { storage, analytics, errorLogger } = options;

  const client = createClient(options.client);
  const { visitor, splitRegistry } = parseVisitorConfig(options.visitorConfig);

  return TestTrack.create({ client, storage, splitRegistry, visitor, analytics, errorLogger });
}

/**
 * Initialize `TestTrack` using `window.TT`
 *
 * @deprecated Use `load` or `create`
 */
export function initialize(options: InitializeOptions): TestTrack {
  const { analytics, errorLogger } = options;

  const config = loadConfig();
  const client = createClient({ ...options.client, url: config.url });
  const storage = createCookieStorage({ domain: config.cookieDomain, name: config.cookieName });

  return TestTrack.create({
    client,
    storage,
    analytics,
    errorLogger,
    splitRegistry: parseSplitRegistry(config.splits),
    visitor: {
      id: storage.getVisitorId() ?? uuid(),
      assignments: parseAssignments(config.assignments)
    }
  });
}

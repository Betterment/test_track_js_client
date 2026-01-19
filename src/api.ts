import { v4 as uuid } from 'uuid';
import { TestTrack } from './testTrack';
import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import { loadVisitorConfig, parseVisitorConfig } from './visitor';
import { createClient, type Client, type ClientConfig, type V4VisitorConfig } from './client';
import { createCookieStorage, type StorageProvider } from './storageProvider';
import type { AnalyticsProvider } from './analyticsProvider';
import type { AnySchema, Splits } from './schema';

type InitializeOptions = {
  client: Omit<ClientConfig, 'url'>;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

type LoadOptions = {
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
export async function load<S extends AnySchema>(options: LoadOptions): Promise<TestTrack<S>> {
  const { storage, analytics, errorLogger } = options;

  const client = createClient(options.client);
  const visitorId = storage.getVisitorId() ?? uuid();
  const { visitor, splitRegistry } = await loadVisitorConfig(client, visitorId);

  return TestTrack.create({ client, storage, splitRegistry, visitor, analytics, errorLogger });
}

/**
 * Creates a `TestTrack` instance with preloaded data
 */
export function create<S extends AnySchema>(options: CreateOptions): TestTrack<S> {
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
export function initialize<S extends AnySchema>(options: InitializeOptions): TestTrack<S> {
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

/**
 * Creates a client suitable for testing.
 */
export function stub<S extends AnySchema>(assignments: Partial<Splits<S>> = {}): TestTrack<S> {
  const entries = Object.entries(assignments as Record<string, string>);

  const visitorId = '00000000-0000-0000-0000-000000000000';
  const visitorConfig: V4VisitorConfig = {
    experience_sampling_weight: 0,
    visitor: {
      id: visitorId,
      assignments: entries.map(([splitName, variant]) => ({ split_name: splitName, variant }))
    },
    splits: entries.map(([splitName, variant]) => ({
      name: splitName,
      variants: [{ name: variant, weight: 100 }],
      feature_gate: splitName.endsWith('_enabled')
    }))
  };

  const client: Client = {
    getVisitorConfig: () => Promise.resolve(visitorConfig),
    postIdentifier: () => Promise.resolve(visitorConfig),
    postAssignmentEvent: () => Promise.resolve(),
    postAssignmentOverride: () => Promise.resolve()
  };

  const storage: StorageProvider = {
    getVisitorId: () => visitorId,
    setVisitorId: () => undefined
  };

  const { visitor, splitRegistry } = parseVisitorConfig(visitorConfig);
  return TestTrack.create({ visitor, splitRegistry, client, storage });
}

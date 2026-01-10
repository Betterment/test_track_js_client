import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import { TestTrack } from './testTrack';
import { connectToWebExtension } from './webExtension';
import { loadVisitor } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import { createCookieStorage } from './storageProvider';
import { createClient } from './client';

type SessionOptions = {
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

export async function initialize(options: SessionOptions = {}): Promise<TestTrack> {
  const config = loadConfig();
  const client = createClient({ url: config.url });
  const storage = createCookieStorage({ domain: config.cookieDomain, name: config.cookieName });
  const splitRegistry = parseSplitRegistry(config.splits);
  const { visitor, isOffline } = await loadVisitor({
    client,
    splitRegistry,
    id: storage.getVisitorId(),
    assignments: parseAssignments(config.assignments)
  });

  const testTrack = new TestTrack({ client, storage, splitRegistry, visitor, isOffline });
  if (options.analytics) testTrack.setAnalytics(options.analytics);
  if (options.errorLogger) testTrack.setErrorLogger(options.errorLogger);

  testTrack.notifyUnsyncedAssignments();
  connectToWebExtension(testTrack._crx);

  storage.setVisitorId(testTrack.visitorId);

  return testTrack;
}

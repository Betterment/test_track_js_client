import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import { TestTrack } from './testTrack';
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
  const client = createClient({
    url: config.url,
    appName: config.appName,
    appVersion: config.appVersion,
    buildTimestamp: config.buildTimestamp
  });

  const storage = createCookieStorage({ domain: config.cookieDomain, name: config.cookieName });
  const splitRegistry = parseSplitRegistry(config.splits);

  const visitor = await loadVisitor({
    client,
    id: storage.getVisitorId(),
    assignments: parseAssignments(config.assignments)
  });

  const testTrack = TestTrack.create({
    client,
    storage,
    splitRegistry,
    visitor,
    analytics: options.analytics,
    errorLogger: options.errorLogger
  });

  storage.setVisitorId(testTrack.visitorId);

  return testTrack;
}

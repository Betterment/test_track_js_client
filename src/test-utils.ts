import { parseConfig, type Config, type RawConfig } from './config';

export function createConfig(options: Partial<RawConfig> = {}): Config {
  return parseConfig({
    url: 'http://testtrack.dev',
    cookieDomain: '.example.org',
    experienceSamplingWeight: 1,
    ...options
  });
}

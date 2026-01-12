declare global {
  interface Window {
    TT?: string;
  }
}

export type Config = Readonly<{
  cookieDomain: string;
  cookieName?: string;
}>;

export function loadConfig(): Config {
  try {
    return JSON.parse(atob(window.TT!)) as Config;
  } catch {
    throw new Error('Unable to parse configuration');
  }
}

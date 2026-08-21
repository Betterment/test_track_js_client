import { create, initialize, load, stub } from './api';
import type { Split } from './splitRegistry';
import type { StorageProvider } from './storageProvider';
import type { ClientConfig, V4VisitorConfig } from './client';
import { v4 as uuid } from 'uuid';
import { getRequests, server } from './setupTests';
import { http, HttpResponse } from 'msw';

vi.mock('uuid');

const buildURL = 'http://testtrack.dev/api/v4/apps/test_app/versions/1.0.0/builds/2019-04-16T14:35:30Z';
const clientConfig: ClientConfig = {
  url: 'http://testtrack.dev',
  appName: 'test_app',
  appVersion: '1.0.0',
  buildTimestamp: '2019-04-16T14:35:30Z'
};

const storage: StorageProvider = {
  getVisitorId: vi.fn(),
  setVisitorId: vi.fn(),
  getAssignments: vi.fn(),
  setAssignments: vi.fn(),
  getSplitRegistry: vi.fn(),
  setSplitRegistry: vi.fn()
};

const buildVisitorConfig = (visitorId: string): V4VisitorConfig => ({
  splits: [
    {
      name: 'jabba',
      variants: [
        { name: 'cgi', weight: 50 },
        { name: 'puppet', weight: 50 }
      ],
      feature_gate: true
    },
    {
      name: 'blue_button_enabled',
      variants: [
        { name: 'true', weight: 0 },
        { name: 'false', weight: 100 }
      ],
      feature_gate: true
    }
  ],
  visitor: {
    id: visitorId,
    assignments: [{ split_name: 'jabba', variant: 'puppet' }]
  },
  experience_sampling_weight: 1
});

describe('load', () => {
  beforeEach(() => {
    server.use(
      http.get(`${buildURL}/visitors/:visitorId/config`, ({ params }) => {
        return HttpResponse.json(buildVisitorConfig(params.visitorId as string));
      })
    );
  });

  it('reads the visitor from storage and saves it back', async () => {
    vi.mocked(storage.getVisitorId).mockReturnValue('existing_visitor_id');
    vi.mocked(storage.getAssignments).mockReturnValue([]);

    const testTrack = await load({ client: clientConfig, storage });
    expect(testTrack.visitorId).toEqual('existing_visitor_id');
    expect(testTrack.assignments).toEqual([{ splitName: 'jabba', variant: 'puppet', context: null }]);

    expect(storage.getVisitorId).toHaveBeenCalledTimes(1);
    expect(storage.setVisitorId).toHaveBeenCalledWith('existing_visitor_id');
    expect(storage.setAssignments).toHaveBeenCalledWith([{ splitName: 'jabba', variant: 'puppet', context: null }]);
  });

  it('generates and saves a visitor id when none exists', async () => {
    // @ts-expect-error uuid mock return type
    vi.mocked(uuid).mockReturnValue('generated_visitor_id');
    vi.mocked(storage.getVisitorId).mockReturnValue(undefined);

    const testTrack = await load({ client: clientConfig, storage });
    expect(testTrack.visitorId).toEqual('generated_visitor_id');
    expect(testTrack.assignments).toEqual([{ splitName: 'jabba', variant: 'puppet', context: null }]);

    expect(storage.getVisitorId).toHaveBeenCalledTimes(1);
    expect(storage.setVisitorId).toHaveBeenCalledWith('generated_visitor_id');
    expect(storage.setAssignments).toHaveBeenCalledWith([{ splitName: 'jabba', variant: 'puppet', context: null }]);
  });

  describe('cached assignments', () => {
    const cachedAssignments = [{ splitName: 'jabba', variant: 'cgi', context: 'cached_context' }];

    beforeEach(() => {
      vi.mocked(storage.getVisitorId).mockReturnValue('existing_visitor_id');
      vi.mocked(storage.getAssignments).mockReturnValue(cachedAssignments);
    });

    it('keeps the cached assignments when the server is unreachable', async () => {
      server.use(http.get(`${buildURL}/visitors/:visitorId/config`, () => HttpResponse.error()));

      const testTrack = await load({ client: clientConfig, storage });
      expect(testTrack.visitorId).toEqual('existing_visitor_id');
      expect(testTrack.assignments).toEqual(cachedAssignments);
    });

    it('prefers the visitor from the server over the cache', async () => {
      const testTrack = await load({ client: clientConfig, storage });
      expect(testTrack.assignments).toEqual([{ splitName: 'jabba', variant: 'puppet', context: null }]);
    });
  });

  describe('cached split registry', () => {
    const cachedSplits: Split[] = [
      { name: 'blue_button_enabled', isFeatureGate: true, weighting: { true: 100, false: 0 } }
    ];

    beforeEach(() => {
      vi.mocked(storage.getVisitorId).mockReturnValue('existing_visitor_id');
      vi.mocked(storage.getSplitRegistry).mockReturnValue(cachedSplits);
    });

    it('falls back to the cached split registry when the server is unreachable', async () => {
      server.use(http.get(`${buildURL}/visitors/:visitorId/config`, () => HttpResponse.error()));

      const testTrack = await load({ client: clientConfig, storage });
      expect(testTrack.ab('blue_button_enabled', { context: 'test' })).toBe(true);
    });

    it('prefers the split registry from the server over the cache', async () => {
      const testTrack = await load({ client: clientConfig, storage });
      expect(testTrack.ab('blue_button_enabled', { context: 'test' })).toBe(false);
    });
  });
});

describe('create', () => {
  it('allows visitorConfig to be provided', () => {
    const visitorConfig = buildVisitorConfig('existing_visitor_id');
    const testTrack = create({ client: clientConfig, storage, visitorConfig });

    expect(testTrack.visitorId).toEqual('existing_visitor_id');
    expect(testTrack.assignments).toEqual([{ splitName: 'jabba', variant: 'puppet', context: null }]);
  });
});

describe('initialize', () => {
  it('creates TestTrack from window.TT config', () => {
    const config = {
      url: 'http://testtrack.dev',
      cookieDomain: '.example.com',
      experienceSamplingWeight: 1,
      assignments: { jabba: 'puppet' }
    };

    // @ts-expect-error uuid mock return type
    vi.mocked(uuid).mockReturnValue('generated_visitor_id');

    window.TT = btoa(JSON.stringify(config));

    const testTrack = initialize({
      client: { appName: 'test_app', appVersion: '1.0.0', buildTimestamp: '2019-04-16T14:35:30Z' }
    });

    expect(testTrack.visitorId).toEqual('generated_visitor_id');
    expect(testTrack.assignments).toEqual([{ splitName: 'jabba', variant: 'puppet', context: null }]);
  });
});

describe('stub', () => {
  it('creates a TestTrack with stubbed assignments', () => {
    const testTrack = stub({
      foo_enabled: 'true',
      bar_enabled: 'false',
      color_experiment: 'green'
    });

    expect(testTrack.visitorId).toEqual('00000000-0000-0000-0000-000000000000');
    expect(testTrack.assignments).toEqual([
      { splitName: 'foo_enabled', variant: 'true', context: null },
      { splitName: 'bar_enabled', variant: 'false', context: null },
      { splitName: 'color_experiment', variant: 'green', context: null }
    ]);

    expect(testTrack.ab('foo_enabled', { context: 'test' })).toBe(true);
    expect(testTrack.ab('bar_enabled', { context: 'test' })).toBe(false);
    expect(testTrack.vary('color_experiment', { context: 'test', defaultVariant: 'blue' })).toEqual('green');
  });

  it('does not send HTTP requests', async () => {
    const testTrack = stub();
    await testTrack.logIn('userId', '123');
    await testTrack.signUp('userId', '123');
    expect(await getRequests()).toHaveLength(0);
  });
});

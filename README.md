# TestTrack JS Client

This is the JavaScript client library for the [TestTrack](https://github.com/Betterment/test_track) system.

It provides client-side split-testing and feature-toggling through a simple, mostly declarative API.

This library intends to obscure the details of assignment and visitor session management, allowing you to focus entirely on the experience a visitor should have when she has been assigned a variant.

If you're looking to do server-side assignment and you're using Rails, then check out our [Rails client](https://github.com/Betterment/test_track_rails_client).

## Installation

You can add the test track js client to your application via npm, yarn or pnpm.

```
pnpm add @betterment-oss/test-track
```

You can find the latest version of the test track JS client [here](https://github.com/Betterment/test_track_js_client/releases).

## Setup

There are two ways to set up TestTrack:

### `load(options)`

Fetches visitor configuration from the TestTrack server and creates a TestTrack instance. This is the recommended approach for most use cases.

```javascript
import { load, createCookieStorage } from '@betterment-oss/test-track';

const testTrack = await load({
  client: {
    url: 'https://testtrack.example.com',
    appName: 'my_app',
    appVersion: '1.0.0',
    buildTimestamp: '2024-01-01T00:00:00Z'
  },
  storage: createCookieStorage({
    domain: '.example.com'
  })
});
```

**Parameters:**

- `client.url` - The URL of your TestTrack server
- `client.appName` - Your application name
- `client.appVersion` - Your application version
- `client.buildTimestamp` - The build timestamp (ISO 8601 format)
- `storage` - A storage provider for persisting visitor state (see [Storage](#storage))
- `analytics` (optional) - An analytics provider for tracking assignments (see [Advanced Configuration](#advanced-configuration))
- `errorLogger` (optional) - A function for logging errors

### `create(options)`

Creates a TestTrack instance with preloaded visitor configuration. Use this when you have visitor configuration data available (e.g., from server-side rendering or a cached response).

```javascript
import { create, createCookieStorage } from '@betterment-oss/test-track';

const testTrack = create({
  client: {
    url: 'https://testtrack.example.com',
    appName: 'my_app',
    appVersion: '1.0.0',
    buildTimestamp: '2024-01-01T00:00:00Z'
  },
  storage: createCookieStorage({
    domain: '.example.com'
  }),
  visitorConfig: {
    splits: [
      {
        name: 'button_color',
        variants: [
          { name: 'blue', weight: 50 },
          { name: 'red', weight: 50 }
        ],
        feature_gate: false
      }
    ],
    visitor: {
      id: 'visitor-uuid',
      assignments: [{ split_name: 'button_color', variant: 'blue' }]
    },
    experience_sampling_weight: 1
  }
});
```

**Parameters:**

- Same as `load()`, plus:
- `visitorConfig` - Preloaded visitor configuration data from the TestTrack API

## Storage

`load()` and `create()` both require a `storage` provider. It is the seam between TestTrack and
wherever your platform keeps data, and it determines which parts of the API actually do anything.

```ts
type StorageProvider = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
  getAssignments(): ReadonlyArray<Assignment> | undefined;
  setAssignments(assignments: ReadonlyArray<Assignment>): void;
  getSplitRegistry(): ReadonlyArray<Split> | undefined;
  setSplitRegistry(splits: ReadonlyArray<Split>): void;
  getLoginState?(): boolean | undefined;
  setLoginState?(isLoggedIn: boolean): void;
};
```

`getLoginState` and `setLoginState` are optional. When a provider omits them, TestTrack treats the
visitor as logged out: `logout()` becomes a no-op and `overrideVisitorId()` is always permitted.

### `createCookieStorage(config)`

The provider bundled with this library, intended for the browser.

- `domain` - the cookie domain, e.g. `.example.com`
- `name` (optional) - the cookie name, defaults to `tt_visitor_id`

| Data           | Where it goes                                |
| -------------- | -------------------------------------------- |
| Visitor ID     | A cookie, 365 days, scoped to `domain`       |
| Login state    | `sessionStorage`, under `<name>_login_state` |
| Assignments    | Not persisted                                |
| Split registry | Not persisted                                |

Assignments and the split registry are not persisted because they do not fit in a 4KB cookie. This
only costs you the offline fallback described below — on the web the server supplies them on each
page load.

Login state lives in `sessionStorage` rather than a cookie so that it expires with the browsing
session instead of outliving the real session by a year. Note that this makes it per-tab and
per-origin, unlike the visitor ID cookie, which spans subdomains.

### Writing your own provider

Implement the port for platforms where cookies do not exist, such as React Native. All getters are
synchronous, so use a synchronous store — `react-native-mmkv` below. With an async store you must
hydrate every value before calling `load()`.

```ts
import { MMKV } from 'react-native-mmkv';
import type { Assignment, Split, StorageProvider } from '@betterment-oss/test-track';

const store = new MMKV();

function read<T>(key: string): T | undefined {
  const value = store.getString(key);
  return value === undefined ? undefined : (JSON.parse(value) as T);
}

export const storage: StorageProvider = {
  getVisitorId: () => store.getString('visitor_id'),
  setVisitorId: id => store.set('visitor_id', id),
  getAssignments: () => read<Assignment[]>('assignments'),
  setAssignments: assignments => store.set('assignments', JSON.stringify(assignments)),
  getSplitRegistry: () => read<Split[]>('split_registry'),
  setSplitRegistry: splits => store.set('split_registry', JSON.stringify(splits)),
  getLoginState: () => store.getBoolean('login_state'),
  setLoginState: isLoggedIn => store.set('login_state', isLoggedIn)
};
```

Implementing `setAssignments` and `setSplitRegistry` is what enables the offline fallback: when
`load()` cannot reach the TestTrack server, it starts up from the cached assignments and split
registry instead of an empty registry.

## API

#### `.visitorId`

Returns the current visitor's unique identifier as a string. This ID is persisted in the storage provider and used to maintain consistent split assignments across sessions.

```js
console.log(testTrack.visitorId); // "abc123-def456-..."
```

#### `.vary(split_name, options)`

The `vary` method is used to perform a split. It takes 2 arguments and returns the assigned variant as a string.

- `split_name` -- The first argument is the name of the split. This will be a snake_case string, e.g. `"homepage_redesign_q1_2015"`.
- `options` -- The second argument is an object that contains the `context` of the assignment and a default variant (`defaultVariant`).
  - `context` -- is a string that the developer provides so that the test track server can record where an assignment was first created. If a call to `vary` is made in more than one place for a given split, you'll be able to see which codepath was hit first.

  - `defaultVariant` -- The default variant is used if the user is assigned to a variant that is not defined in the split. When this happens, Test Track will re-assign the user to the default variant. **You should not rely on this defaulting behavior, it is merely provided to ensure we don't break the customer experience.** You should instead make sure that all variants of the split are handled in your code and if variants are added to the split on the backend, update your code to reflect the new variants. Because this defaulting behavior re-assigns the user to the `defaultVariant`, no data will be recorded for the unhandled variant. This will impede our ability to collect meaningful data for the split.

Here is an example of a 3-way split where `'control'` is the default variant. Let's say `'variant_4'` was added to this split on the backend but this code did not change to handle that new variant. Any users that Test Track assigns to `'variant_4'` will be re-assigned to `'control'`.

```js
const variant = testTrack.vary('name_of_split', { context: 'homepage', defaultVariant: 'control' });

switch (variant) {
  case 'control':
    // do control stuff
    break;
  case 'variant_1':
    // do variant 1 stuff
    break;
  case 'variant_2':
    // do variant 2 stuff
    break;
}
```

#### `.ab(split_name, options)`

The `ab` method is used exclusively for two-way splits and feature toggles. It takes 2 arguments and returns a boolean.

- `split_name` -- The first argument is the name of the split. This will be a snake_case string, e.g. `"homepage_chat_bubble"`.
- `options` -- The second argument is an object that contains the `context` and an optional `trueVariant`.
  - `context` -- is a string that the developer provides so that the test track server can record where an assignment was first created. If a call to `vary` is made in more than one place for a given split, you'll be able to see which codepath was hit first.
  - `trueVariant` -- an optional parameter that specifies which variant is the "true" variant and the other variant will be used as the default. Without the true variant, `ab` will assume that the variants for the split are named `'true'` and `'false'`.

  ```js
  const hasVariantName = testTrack.ab('name_of_split', { context: 'homepage', trueVariant: 'variant_name' });

  if (hasVariantName) {
    // do something
  } else {
    // do something else
  }
  ```

  ```js
  const hasFeature = testTrack.ab('some_new_feature', { context: 'homepage' });

  if (hasFeature) {
    // do something
  }
  ```

#### `.logIn(identifier, value)`

The `logIn` method is used to ensure a consistent experience across devices. For instance, when a user logs in to your app on a new device, you should also log the user into Test Track in order to grab their existing split assignments instead of treating them like a new visitor. It takes 2 arguments.

- `identifier` -- The first argument is the name of the identifier. This will be a snake_case string, e.g. `"myapp_user_id"`.
- `value` -- The second argument is a string value, e.g. `"12345"`, `"abcd"`

```js
await testTrack.logIn('myapp_user_id', '12345');
// From this point on you have existing split assignments from a previous device.
```

#### `.signUp(identifier, value)`

Identical to `logIn`, but for a visitor who is brand new to your application rather than one
returning on a different device. It takes the same 2 arguments and differs only in the analytics
call it makes: `signUp` calls `alias`, where `logIn` calls `identify`.

```js
await testTrack.signUp('myapp_user_id', '12345');
```

#### `.logout()`

Records that the visitor is no longer logged in.

This **preserves** the visitor ID and its assignments — it does not start a new visitor. The next
`logIn` will still reconcile with the server, but until then the device keeps the assignments it
already had.

```js
testTrack.logout();
```

Requires a storage provider that implements `setLoginState`. With one that does not — including
`createCookieStorage` in a browser blocking site data — this is a no-op.

#### `.overrideVisitorId(visitorId)`

Adopts an existing visitor ID and loads its configuration from the TestTrack server. Use this when
a visitor ID was assigned on another platform before this client started, and you want that
visitor's assignments to follow the user.

```js
await testTrack.overrideVisitorId('visitor-uuid-from-elsewhere');
```

**The call is ignored while a visitor is logged in**, so that an override cannot clobber a visitor
already reconciled with the server. That guard depends on `getLoginState`; a storage provider
without it reports "logged out" and every override is permitted.

#### `.createAssignmentOverrides(options)`

Forces specific variants for the current visitor on the TestTrack server, then reloads the visitor
config so they take effect immediately. This is how internal testers pin themselves to a variant.

- `overrides` -- an array of `{ splitName, variant, context? }`. `context` defaults to `null`.
- `auth` -- `{ username, password }` TestTrack admin credentials.

```js
await testTrack.createAssignmentOverrides({
  overrides: [{ splitName: 'button_color', variant: 'blue', context: 'admin_ui' }],
  auth: { username: 'admin', password: 'secret' }
});
```

## Advanced Configuration

When you call `load()` or `create()` you can optionally pass in an analytics object and an error logger. For example:

```js
const testTrack = await load({
  client: {
    url: 'https://testtrack.example.com',
    appName: 'my_app',
    appVersion: '1.0.0',
    buildTimestamp: '2024-01-01T00:00:00Z'
  },
  storage: createCookieStorage({ domain: '.example.com' }),
  analytics: {
    trackAssignment: (visitorId, assignment) => {
      const props = {
        SplitName: assignment.splitName,
        SplitVariant: assignment.variant,
        SplitContext: assignment.context
      };

      remoteAnalyticsService.track('SplitAssigned', props);
    },
    identify: visitorId => {
      remoteAnalyticsService.identify(visitorId);
    },
    alias: visitorId => {
      remoteAnalyticsService.alias(visitorId);
    }
  },
  errorLogger: message => {
    RemoteLoggingService.log(message); // logs remotely so that you can be alerted to any misconfigured splits
  }
});
```

## Testing

Creates a TestTrack instance for testing with pre-configured assignments and no network requests.

```javascript
import { stub } from '@betterment-oss/test-track';

const testTrack = stub({
  button_color: 'blue',
  new_feature_enabled: 'true'
});

testTrack.vary('button_color', { context: 'test', defaultVariant: 'red' }); // 'blue'
testTrack.ab('new_feature_enabled', { context: 'test' }); // true
```

## TypeScript

TestTrack supports strict typechecking based on your project's schema.

```typescript
import { load } from '@betterment-oss/test-track';
import type Schema from './path/to/your/schema.json';

// Pass `Schema` as a type parameter
const testTrack = await load<Schema>({
  /* ... */
});

// Split names and variants are now type-checked
testTrack.vary('button_color', { context: 'home', defaultVariant: 'blue' });
testTrack.ab('new_feature_enabled', { context: 'home' });
```

## Vite Plugin

The `@betterment-oss/test-track` package includes a Vite plugin that automatically defines `import.meta.env.TT_BUILD_TIMESTAMP`, which can be used to configure Test Track.

```ts
import { defineConfig } from 'vite';
import { testTrackPlugin } from '@betterment-oss/test-track/vite';

export default defineConfig({
  plugins: [testTrackPlugin()]
});
```

## Using TestTrack without a build tool

The `@betterment-oss/test-track` package is distributed as an ES module. The package also provides `dist/index.iife.js`. This artifact includes all dependencies and can be used directly in the browser.

```html
<script src="/path/to/index.iife.js"></script>
<script type="module">
  const testTrack = await TestTrack.load({
    client: {
      url: 'https://testtrack.example.com',
      appName: 'my_app',
      appVersion: '1.0.0',
      buildTimestamp: '2024-01-01T00:00:00Z'
    },
    storage: TestTrack.createCookieStorage({
      domain: '.example.com'
    })
  });
  // Use testTrack.vary(), testTrack.ab(), etc.
</script>
```

## How to Contribute

We would love for you to contribute! Anything that benefits the majority of `test_track` users—from a documentation fix to an entirely new feature—is encouraged.

Before diving in, [check our issue tracker](https://github.com/Betterment/test_track_js_client/issues) and consider creating a new issue to get early feedback on your proposed change.

### Suggested Workflow

1. Fork the project and create a new branch for your contribution.
1. Write your contribution (and any applicable test coverage).
1. Make sure all tests pass.
1. Submit a pull request.

### Running tests

1. run `pnpm install` to download dependencies
1. run `pnpm test` to run the tests
1. run `pnpm build` to build the distributables

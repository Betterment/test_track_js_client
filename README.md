# TestTrack JS Client

This is the JavaScript client library for the [TestTrack](https://github.com/Betterment/test_track) system.

It provides client-side split-testing and feature-toggling through a simple, mostly declarative API.

This library intends to obscure the details of assignment and visitor session management, allowing you to focus entirely on the experience a visitor should have when she has been assigned a variant.

If you're looking to do server-side assignment and you're using Rails, then check out our [Rails client](https://github.com/Betterment/test_track_rails_client).

## Installation

You can add the test track js client to your application via npm, yarn or pnpm.

```
$ pnpm add test_track_js_client
```

You can find the latest version of the test track JS client [here](https://github.com/Betterment/test_track_js_client/releases).

```javascript
import { initialize } from 'test_track_js_client';

const testTrack = await initialize();
```

## Configuration

Before using the client you must call `initialize()`. This method also takes some optional [configuration parameters](#advanced-configuration), if you fancy.

### API

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
- `value` -- The second argument is a primitive value, e.g. `12345`, `"abcd"`

```js
await testTrack.logIn('myapp_user_id', 12345);
// From this point on you have existing split assignments from a previous device.
```

## Advanced Configuration

When you call `initialize()` you can optionally pass in an analytics object and an error logger. For example:

```js
const testTrack = await initialize({
  analytics: {
    trackAssignment: function (visitorId, assignment, callback) {
      var props = {
        SplitName: assignment.splitName,
        SplitVariant: assignment.variant,
        SplitContext: assignment.context
      };

      remoteAnalyticsService.track('SplitAssigned', props, callback);
    },
    identify: function (visitorId) {
      remoteAnalyticsService.identify(visitorId);
    },
    alias: function (visitorId) {
      remoteAnalyticsService.alias(visitorId);
    }
  },
  errorLogger: function (message) {
    RemoteLoggingService.log(message); // logs remotely so that you can be alerted to any misconfigured splits
  }
});
```

## Using TestTrack without a build tool

The `test_track_js_client` package is distributed as an ES module. The package also provides `dist/index.iffe.js`. This artifact includes all dependencies and can be used directly in the browser.

```html
<script>
  window.TT = btoa(
    JSON.stringify({
      /* Config */
    })
  );
</script>
<script src="/path/to/index.iife.js"></script>
<script type="module">
  const testTrack = await TestTrack.initialize();
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

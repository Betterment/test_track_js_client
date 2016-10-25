# Test Track JS Client

## Usage

### Installation
You can add the test track js client to your application via bower. Add the following to your bower.json's dependencies:
```
"test_track_js_client": "git+https://OAUTH_TOKEN:x-oauth-basic@github.com/Betterment/test_track_js_client.git#1.0.1"
```
You can find the latest version of the test track JS client [here](https://github.com/Betterment/test_track_js_client/releases).

The test track JS client has the following dependencies: blueimp-md5, node-uuid, jquery and jquery.cookie. All of these dependencies will be downloaded into your bower_components directory when you run `bower install`.

#### Usage in script tags
```html
<script type="text/javascript" src="path/to/bower_components/jquery/dist/jquery.js"></script>
<script type="text/javascript" src="path/to/bower_components/jquery.cookie/jquery.cookie.js"></script>
<script type="text/javascript" src="path/to/bower_components/blueimp-md5/js/md5.js"></script>
<script type="text/javascript" src="path/to/bower_components/node-uuid/uuid.js"></script>
<script type="text/javascript" src="path/to/bower_components/test_track_js_client/dist/testTrack.min.js"></script>
```

### Initialize

Before using the client you must call `TestTrack.initialize()`. When you call initialize you can optionally pass in an analytics object, an error logger, and a callback that will run after the test track visitor has loaded, but before any analytics events have fired. For example:

```js
TestTrack.initialize({
    analytics: {
        trackAssignment: function(visitorId, assignment, callback) {
            var props =  {
                SplitName: assignment.getSplitName(),
                SplitVariant: assignment.getVariant(),
                SplitContext: assignment.getContext()
            };

            remoteAnalyticsService.track('SplitAssigned', props, callback);
        },
        identify: function(visitorId) {
            remoteAnalyticsService.identify(visitorId);
        },
        alias: function(visitorId) {
            remoteAnalyticsService.alias(visitorId);
        }
    },
    errorLogger: function(message) {
        RemoteLoggingService.log(message); // logs remotely so that we can be alerted to any misconfigured splits
    },
    onVisitorLoaded: function(visitor) {
        // callback that will run after the test track visitor has loaded, but before any analytics events have fired
    }
});
```

#### Usage in RequireJS application

You must provide aliases for the test track JS client's dependencies in your RequireJS config like so:

```js
require.config({
    paths: {
        'jquery': 'path/to/bower_components/jquery/dist/jquery.js',
        'jquery.cookie': 'path/to/bower_components/jquery.cookie/jquery.cookie.js',
        'node-uuid': 'path/to/bower_components/node-uuid/uuid',
        'blueimp-md5': 'path/to/bower_components/blueimp-md5/js/md5'
    }
});
```
Then you can require the test track client anywhere you need it:
```js
var TestTrack = require('path/to/bower_components/test_track_js_client/dist/testTrack');
```
OR
```js
define([
'path/to/bower_components/test_track_js_client/dist/testTrack'
], function(TestTrack) {

});
```


### API

- The `vary` method is used to do a split. It takes 2 arguments. The first argument is the name of the split. The second argument is an object that containts the context,a variant/callback configuration (`variants`) and a default variant. The context is a string that the developer provides so that the test track server can record where an assignment was first created. This is useful if a `vary` is made in more than one place, we'll be able to see which codepath was hit first. The variant/callback configuration is an object whose keys are the variant names and whose values are function handlers for each of those variants. The default variant is used if the user is assigned to a variant that is not represented in the variants object. When this happens, Test Track will execute the handler of the default variant and re-assign the user to the default variant. You should not rely on this defaulting behavior, it is merely provided to ensure we don't break the customer experience. You should instead make sure that you represent all variants of the split and if variants are added to the split on the backend, update your code to reflect the new variants. Because this defaulting behavior re-assigns the user to the default variant, no data will be recorded for the variant that is not represented. This will impede our ability to collect meaningful data for the split.

  In this example we have a 4 way split where `'variant_4'` is the default variant. Let's say `'variant_5'` was added to this split on the backend but this code did not change to reflect that new variant. Any users that Test Track assigns to `'variant_5'` will be re-assigned to `'variant_4'`.
  ```js
  TestTrack.vary('name_of_split', {
      context: 'homepage',
      variants: {
          variant_1: function() {
              // do variant 1 stuff
          },
          variant_2: function() {
              // do variant 2 stuff
          },
          variant_3: function() {
            // do variant 3 stuff
          },
          variant_4: function() {
            // do variant 4 stuff
          }
      },
      defaultVariant: 'variant_4'  // default to variant_4 (this is required)
  });
  ```

- The `ab` method is used for two-way splits. It takes 2 arguments. The first argument is the name of the split. The second argument is an object that contains the contex, an optional true variant and a callback function. The optional true variant specifies which variant is the "true" variant and the other variant will be used as the default. Without the true variant, `ab` will assume that the variants for the split are `'true'` and `'false'`.
  ```js
  TestTrack.ab('name_of_split', {
      context: 'homepage',
      trueVariant: 'variant_name',
      callback: function(hasVariantName) {
          if (hasVariantName) {
              // do something
          } else {
              // do something else
          }
      }
  });
  ```

  ```js
  TestTrack.ab('some_new_feature', {
      context: 'homepage',
      callback: function(hasFeature) {
          if (hasFeature) {
              // do something
          }
      }
  });
  ```

- The `logIn` method is used to ensure a consistent experience across devices. For instance, when a user logs in to your app on their mobile device we can log in to Test Track in order to grab their existing split assignments instead of treating them like a new visitor.
  ```js
  TestTrack.logIn('myapp_user_id', 12345).then(function() {
      // From this point on we have existing split assignments from a previous device.
  });
  ```


## Development
### Running tests
1. Clone this repo
2. run `npm install` to download all the dependencies
3. run `grunt` to run the tests and build the distributables

### Releasing new versions
- In order to up the minor version, run: `grunt release-it`. For instance if the current version is 1.0.0, this will go to version 1.0.1.
- If you'd like to release a specific version, run `grunt release-it:1.2.3`.
- This grunt task will ask the following questions, type `y` for all of them:

  ```
  ? Show updated files? Yes
  M  bower.json
  M  dist/testTrack.js
  M  dist/testTrack.min.js
  M  package.json
  ? Commit (Release 1.2.3)? Yes
  ? Tag (1.2.3)? Yes
  ? Push? Yes
  ```

# Releasing new versions

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

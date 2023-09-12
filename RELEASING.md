# Releasing new versions

- In order to up the minor version, run: `npm run release`. For instance if the current version is 1.0.0, this will go to version 1.0.1.
- If you'd like to release a specific version, run `npm run release 1.2.3`.
- This grunt task will ask the following questions, type `y` for all of them:

Example

```
$ npm run release

> test_track_js_client@2.1.0 release
> release-it

✔ yarn build

🚀 Let's release test_track_js_client (currently at 2.1.0)


Changelog:
* chore: bump version to 2.1.0 (#63) (bb6e765)
* chore: updated build config to support the latest fixes (#62) (fb1026e)
* fix: resolve pathing bug and add test coverage (#61) (10f781d)
* chore(deps): Update to latest npm modules (#60) (fcc5749)

? Select increment (next version): patch (2.1.1)

Changeset:
 M package.json

? Publish test_track_js_client to npm? Yes
? Please enter OTP for npm: <YOUR OTP>
? Commit (Release 2.1.1)? Yes
? Tag (2.1.1)? Yes
? Push? Yes
```

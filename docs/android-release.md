# Android release packaging

Jain Community Platform uses the Android release packaging model established for the platform's other Flutter application: CI creates a signed Android App Bundle (AAB), injects Firebase configuration at build time, derives a Play-compatible version from the base application version and GitHub Actions run identity, stores the AAB as a workflow artifact, and can publish it to Google Play.

## Release versioning

The base version is maintained in `apps/flutter/pubspec.yaml` as `1.0.0`.

For a GitHub Actions run `80`, attempt `1`, CI produces:

- `versionName`: `1.0.80.01`
- `versionCode`: `10008001`

The version name is the human-readable identifier used by Google Play. The version code is the Android release identifier.

The patch component in `pubspec.yaml` is not used by the CI release formatter. GitHub Actions run number and run attempt provide CI build identity.

## Firebase configuration

`android/app/google-services.json` is deliberately not committed to the repository.

The release workflow expects the complete Firebase configuration in the GitHub Actions variable:

`GOOGLE_SERVICES_JSON`

CI writes that value to `android/app/google-services.json` and validates:

- Firebase project: `jain-community-platform`
- Android package: `com.nipun.jcp`

The JSON may contain multiple Firebase client entries; validation selects the client matching the JCP Android package rather than assuming the first client is correct.

## API configuration

The production API is not deployed yet. The release workflow expects:

`JCP_API_BASE_URL`

as a GitHub Actions variable. The value is passed to Flutter with `--dart-define=JCP_API_BASE_URL=...`.

No production URL is hard-coded into the application source.

## Android signing

The upload keystore is never committed.

GitHub Actions expects these secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEY_ALIAS`

CI reconstructs `android/app/jcp-upload.jks` and creates `android/key.properties` for the build.

The Android Gradle application module must load `android/key.properties` and use a release signing configuration. This follows Flutter's official Android release-signing model.

## Google Play publishing

Publishing is deliberately gated by:

`GOOGLE_PLAY_PUBLISH == true`

until the JCP application exists in Google Play Console and the Play service account is configured.

The future publishing secret is:

`PLAY_STORE_SERVICE_ACCOUNT_JSON`

and the package is:

`com.nipun.jcp`

Until publishing is enabled, the workflow still builds and stores the AAB as a GitHub Actions artifact.

## Required setup

1. Create the JCP Android upload keystore.
2. Add the signing secrets to GitHub.
3. Add `GOOGLE_SERVICES_JSON` as a GitHub Actions variable.
4. Add `JCP_API_BASE_URL` when the production API is deployed.
5. Create the Android app in Google Play Console using package `com.nipun.jcp`.
6. Configure a Google Play service account and add its JSON as `PLAY_STORE_SERVICE_ACCOUNT_JSON`.
7. Set `GOOGLE_PLAY_PUBLISH` to `true` when Play publishing is ready.

The Play Store app should use Play App Signing. The CI/local key is the upload key; Google manages the app-signing key.

## Local release signing

Do not commit `android/key.properties` or the upload keystore. For local release testing, create `android/key.properties` using the same four properties used by CI and keep the keystore outside source control.

# Jain Community Platform Flutter App

This is the shared Flutter frontend for the Jain Community Platform.

## Targets

- Web
- Android
- iOS

The project is intentionally small at this stage. Feature modules, shared domain contracts, authentication, tenant-aware navigation and API integration will be introduced incrementally.

## Architecture direction

The Flutter application is the shared presentation layer. Platform-specific UI should be handled through responsive/adaptive composition rather than maintaining separate Web and Mobile applications.

Business rules remain in the backend/domain layers and must not be duplicated in Flutter.

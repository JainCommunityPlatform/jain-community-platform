# MyJinalay Flutter App

This is the shared Flutter application for **MyJinalay** across Web, Android and iOS.

The Flutter package identifier remains `jain_community_platform` as an engineering identifier. The user-facing product name is **MyJinalay**.

## Targets

- Web
- Android
- iOS

The application is tenant-aware. The same codebase supports the MyJinalay mobile experience, tenant public websites and shared management experiences.

## Architecture direction

The Flutter application is the shared presentation layer. Platform-specific UI should be handled through responsive/adaptive composition rather than maintaining separate Web and Mobile applications.

Business rules remain in the backend/domain layers and must not be duplicated in Flutter.

## Authentication and API configuration

Firebase Authentication is initialized at application startup. The authenticated Firebase ID token is supplied to the API client as a Bearer token, while the backend remains authoritative for the application session, tenant membership and permissions.

The API base URL can be supplied at build/run time:

    --dart-define=JCP_API_BASE_URL=https://api.example.com

For Web, the default is the current browser origin. For local native development, Android uses `10.0.2.2:3000` and other native targets use `localhost:3000`. Production builds should provide the deployed API URL explicitly.
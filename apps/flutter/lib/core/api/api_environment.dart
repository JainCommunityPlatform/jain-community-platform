import 'package:flutter/foundation.dart';

class ApiEnvironment {
  const ApiEnvironment._();

  static Uri get baseUrl {
    const configured = String.fromEnvironment('JCP_API_BASE_URL');
    if (configured.isNotEmpty) {
      return Uri.parse(configured);
    }

    if (kIsWeb) {
      return Uri.base;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return Uri.parse('http://10.0.2.2:3000');
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        return Uri.parse('http://localhost:3000');
      case TargetPlatform.fuchsia:
        return Uri.parse('http://localhost:3000');
    }
  }
}

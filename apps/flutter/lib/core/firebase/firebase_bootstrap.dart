import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show kDebugMode, kIsWeb;

import '../../firebase_options.dart';

typedef FirebaseInitializer = Future<void> Function(
  FirebaseOptions options,
);

class FirebaseBootstrap {
  FirebaseBootstrap({FirebaseInitializer? initializer})
      : _initializer = initializer ?? _initializeFirebase;

  final FirebaseInitializer _initializer;

  Future<void> initialize() async {
    await _initializer(DefaultFirebaseOptions.currentPlatform);

    // This override is debug-only and explicitly enabled by the Android E2E
    // workflow, keeping test auth sessions out of the production Firebase app.
    const requestedE2eMode = bool.fromEnvironment('JCP_E2E_TEST_MODE');
    if (kDebugMode && !kIsWeb && requestedE2eMode) {
      await FirebaseAuth.instance.useAuthEmulator('10.0.2.2', 9099);
    }
  }

  static Future<void> _initializeFirebase(FirebaseOptions options) async {
    await Firebase.initializeApp(options: options);
  }
}

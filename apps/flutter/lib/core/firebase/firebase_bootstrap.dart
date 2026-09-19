import 'package:firebase_core/firebase_core.dart';

import '../../firebase_options.dart';

typedef FirebaseInitializer = Future<void> Function(
  FirebaseOptions options,
);

class FirebaseBootstrap {
  FirebaseBootstrap({FirebaseInitializer? initializer})
      : _initializer = initializer ?? _initializeFirebase;

  final FirebaseInitializer _initializer;

  Future<void> initialize() {
    return _initializer(DefaultFirebaseOptions.currentPlatform);
  }

  static Future<void> _initializeFirebase(FirebaseOptions options) async {
    await Firebase.initializeApp(options: options);
  }
}

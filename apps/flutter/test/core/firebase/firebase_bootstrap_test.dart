import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/core/firebase/firebase_bootstrap.dart';

void main() {
  test('passes the generated Firebase options to the initializer', () async {
    FirebaseOptions? received;

    final bootstrap = FirebaseBootstrap(
      initializer: (options) async {
        received = options;
      },
    );

    await bootstrap.initialize();

    expect(received, isNotNull);
    expect(received!.projectId, 'jain-community-platform');
    expect(received!.messagingSenderId, '817235117988');
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:jain_community_platform/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('MyJinalay launches into the public temple directory', (tester) async {
    SharedPreferences.setMockInitialValues({});

    // JCP_E2E_TEST_MODE routes Firebase Auth to the local Auth Emulator.
    // The workflow points the API client at an unavailable local port, so
    // this smoke test performs no production sign-in or backend writes.
    await app.main();
    await tester.pumpAndSettle(
      const Duration(milliseconds: 100),
      EnginePhase.sendSemanticsUpdate,
      const Duration(seconds: 30),
    );

    expect(find.text('MyJinalay'), findsOneWidget);
    expect(find.text('Temples'), findsWidgets);
    expect(find.text('Sign in'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

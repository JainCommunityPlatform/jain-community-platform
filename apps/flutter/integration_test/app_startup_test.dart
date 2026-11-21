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
    // Advance startup with bounded pumps; the live app may retain animated
    // loading indicators, so pumpAndSettle is not a reliable completion gate.
    await tester.pump(const Duration(seconds: 10));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();

    expect(find.text('MyJinalay'), findsOneWidget);
    expect(find.text('Temples'), findsWidgets);
    // The app's default locale is Hindi; assert the actual localized label.
    expect(find.text('साइन इन'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

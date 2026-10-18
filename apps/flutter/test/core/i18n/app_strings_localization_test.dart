import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/i18n/app_language.dart';
import 'package:jain_community_platform/core/i18n/app_strings.dart';
import 'package:jain_community_platform/features/profile/presentation/link_contact_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('critical shared labels are translated for every supported locale', () {
    const english = AppStrings('en');
    for (final code in ['en', 'hi', 'mr', 'gu']) {
      final strings = AppStrings(code);
      expect(strings.signIn, isNotEmpty, reason: '$code sign-in label');
      expect(strings.searchTemple, isNotEmpty, reason: '$code search label');
      expect(strings.invalidMobile, isNotEmpty, reason: '$code validation label');
      expect(strings.retry, isNotEmpty, reason: '$code retry label');
      if (code != 'en') {
        expect(strings.signIn, isNot(english.signIn), reason: '$code should not fall back to English');
        expect(strings.searchTemple, isNot(english.searchTemple), reason: '$code search should be translated');
        expect(strings.invalidMobile, isNot(english.invalidMobile), reason: '$code validation should be translated');
      }
    }
  });

  testWidgets('language change updates accessible contact labels and validation copy',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final semantics = tester.ensureSemantics();
    addTearDown(semantics.dispose);
    final controller = AppLanguageController(initialLocale: const Locale('en'));

    await tester.pumpWidget(MaterialApp(
      home: AppLanguageScope(
        controller: controller,
        child: LinkContactPage(onLink: (_) async {}),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Mobile number'), findsOneWidget);

    await controller.setLocale(const Locale('hi'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('मोबाइल नंबर'), findsOneWidget);
    expect(find.bySemanticsLabel('मोबाइल नंबर जोड़ें'), findsOneWidget);

    await tester.tap(find.text('मोबाइल नंबर जोड़ें'));
    await tester.pumpAndSettle();
    expect(find.text('कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।'), findsOneWidget);
    expect(find.text('Enter a valid 10 digit mobile number.'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

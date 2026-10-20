import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jain_community_platform/core/i18n/app_language.dart';
import 'package:jain_community_platform/core/routing/app_routes.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jain_community_platform/features/public/presentation/bade_baba_home_page.dart';

void main() {
  testWidgets('public tenant landing page works anonymously and sign-in actions navigate',
      (tester) async {
    final router = GoRouter(
      initialLocation: '/public',
      routes: [
        GoRoute(
          path: '/public',
          builder: (context, state) => const BadeBabaHomePage(),
        ),
        GoRoute(
          path: AppRoutes.login,
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Login destination')),
          ),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.text('Your Jain Temple Community'), findsOneWidget);
    expect(find.text('Discover temples and community activities'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('MyJinalay Member'), findsNothing);

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Login destination'), findsOneWidget);

    router.go('/public');
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -1000));
    await tester.pumpAndSettle();
    expect(find.text('Sign in to continue'), findsOneWidget);
    await tester.tap(find.text('Sign in to continue'));
    await tester.pumpAndSettle();
    expect(find.text('Login destination'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('public landing updates all critical copy when switching supported languages',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final controller = AppLanguageController(initialLocale: const Locale('en'));
    await tester.pumpWidget(MaterialApp(
      home: AppLanguageScope(
        controller: controller,
        child: const BadeBabaHomePage(),
      ),
    ));
    await tester.pumpAndSettle();

    final localizedCopy = <String, List<String>>{
      'en': ['Your Jain Temple Community', 'What would you like to do?', 'Events & registrations', 'Sign in to continue'],
      'hi': ['आपका जैन मंदिर समुदाय', 'आप क्या करना चाहेंगे?', 'कार्यक्रम और पंजीकरण', 'जारी रखने के लिए साइन इन करें'],
      'mr': ['तुमचा जैन मंदिर समुदाय', 'तुम्हाला काय करायचे आहे?', 'कार्यक्रम आणि नोंदणी', 'पुढे जाण्यासाठी साइन इन करा'],
      'gu': ['તમારો જૈન મંદિર સમુદાય', 'તમે શું કરવા માંગો છો?', 'કાર્યક્રમો અને નોંધણી', 'આગળ વધવા સાઇન ઇન કરો'],
    };

    for (final entry in localizedCopy.entries) {
      await controller.setLocale(Locale(entry.key));
      await tester.pumpAndSettle();
      expect(find.text(entry.value[0]), findsOneWidget, reason: '${entry.key} hero heading');
      expect(find.text(entry.value[1]), findsOneWidget, reason: '${entry.key} action heading');
      expect(find.text(entry.value[2]), findsOneWidget, reason: '${entry.key} events card');
      expect(find.text(entry.value[3]), findsOneWidget, reason: '${entry.key} sign-in action');
      expect(tester.takeException(), isNull);
    }
    controller.dispose();
  });

}

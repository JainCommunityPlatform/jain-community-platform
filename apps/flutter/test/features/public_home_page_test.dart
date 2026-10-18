import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jain_community_platform/core/routing/app_routes.dart';
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
}

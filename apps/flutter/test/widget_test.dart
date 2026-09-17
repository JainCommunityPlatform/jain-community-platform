import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/core/routing/app_router.dart';
import 'package:jain_community_platform/core/session/app_session.dart';
import 'package:jain_community_platform/main.dart';

void main() {
  testWidgets('renders the public home route', (tester) async {
    final router = AppRouter();
    await tester.pumpWidget(JainCommunityPlatformApp(router: router));

    expect(find.text('Jain Community Platform'), findsOneWidget);
    expect(
      find.text('Community, temples, events and giving in one platform'),
      findsOneWidget,
    );
  });

  testWidgets('redirects unauthenticated users from admin to login',
      (tester) async {
    final router = AppRouter();
    await tester.pumpWidget(JainCommunityPlatformApp(router: router));

    router.router.go('/admin');
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('allows an authenticated admin to open the admin route',
      (tester) async {
    final router = AppRouter(
      session: const AppSession(
        isAuthenticated: true,
        roles: {AppRole.admin},
      ),
    );
    await tester.pumpWidget(JainCommunityPlatformApp(router: router));

    router.router.go('/admin');
    await tester.pumpAndSettle();

    expect(find.text('Admin console'), findsOneWidget);
  });
}

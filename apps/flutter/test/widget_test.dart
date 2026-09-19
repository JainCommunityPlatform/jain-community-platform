import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/core/routing/app_router.dart';
import 'package:jain_community_platform/core/session/app_session.dart';
import 'package:jain_community_platform/core/tenant/tenant_context.dart';
import 'package:jain_community_platform/features/auth/presentation/login_page.dart';
import 'package:jain_community_platform/main.dart';

const badeBabaKharadiTenant = TenantContext(
  id: 'bade-baba-kharadi',
  name: 'Bade Baba Kharadi',
  hostname: 'badebabakharadi.com',
);

void main() {
  testWidgets('renders the public home route', (tester) async {
    final router = AppRouter(tenant: badeBabaKharadiTenant);
    await tester.pumpWidget(
      JainCommunityPlatformApp(
        router: router,
        tenant: badeBabaKharadiTenant,
      ),
    );

    expect(find.text('Jain Community Platform'), findsOneWidget);
    expect(
      find.text('Community, temples, events and giving in one platform'),
      findsOneWidget,
    );
  });

  testWidgets('redirects unauthenticated users from admin to login',
      (tester) async {
    final router = AppRouter(tenant: badeBabaKharadiTenant);
    await tester.pumpWidget(
      JainCommunityPlatformApp(
        router: router,
        tenant: badeBabaKharadiTenant,
      ),
    );

    router.router.go('/admin');
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('allows an authenticated admin to open the admin route',
      (tester) async {
    final router = AppRouter(
      session: const AppSession(
        isAuthenticated: true,
        role: 'TENANT_ADMIN',
      ),
      tenant: badeBabaKharadiTenant,
    );
    await tester.pumpWidget(
      JainCommunityPlatformApp(
        router: router,
        tenant: badeBabaKharadiTenant,
      ),
    );

    router.router.go('/admin');
    await tester.pumpAndSettle();

    expect(find.text('Admin console'), findsOneWidget);
  });

  testWidgets('redirects an authenticated session away from login',
      (tester) async {
    final router = AppRouter(
      session: const AppSession(
        isAuthenticated: true,
        userId: 'user-123',
      ),
      tenant: badeBabaKharadiTenant,
    );
    await tester.pumpWidget(
      JainCommunityPlatformApp(
        router: router,
        tenant: badeBabaKharadiTenant,
      ),
    );

    router.router.go('/login');
    await tester.pumpAndSettle();

    expect(find.text('Member home'), findsOneWidget);
  });

  testWidgets('login page invokes the Google sign-in callback',
      (tester) async {
    var invoked = false;

    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(
          onSignInWithGoogle: () async {
            invoked = true;
          },
        ),
      ),
    );

    await tester.tap(find.text('Continue with Google'));
    await tester.pump();

    expect(invoked, isTrue);
  });
}

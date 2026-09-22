import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/core/routing/app_router.dart';
import 'package:jain_community_platform/core/session/app_session.dart';
import 'package:jain_community_platform/core/tenant/tenant_context.dart';
import 'package:jain_community_platform/features/auth/presentation/login_page.dart';
import 'package:jain_community_platform/features/member/presentation/member_home_page.dart';
import 'package:jain_community_platform/main.dart';

const badeBabaKharadiTenant = TenantContext(
  id: 'bade-baba-kharadi',
  name: 'Bade Baba Kharadi',
  hostname: 'badebabakharadi.com',
);

void main() {
  testWidgets('renders the public home route with a sign-in action',
      (tester) async {
    final router = AppRouter(tenant: badeBabaKharadiTenant);
    await tester.pumpWidget(
      JainCommunityPlatformApp(
        router: router,
        tenant: badeBabaKharadiTenant,
      ),
    );

    expect(find.text('MyJinalay'), findsOneWidget);
    expect(
      find.text('Community, temples, events and giving'),
      findsOneWidget,
    );
    expect(find.text('Sign in to MyJinalay'), findsOneWidget);
  });

  testWidgets('home sign-in action navigates to login', (tester) async {
    final router = AppRouter(tenant: badeBabaKharadiTenant);
    await tester.pumpWidget(
      JainCommunityPlatformApp(
        router: router,
        tenant: badeBabaKharadiTenant,
      ),
    );

    await tester.tap(find.text('Sign in to MyJinalay'));
    await tester.pumpAndSettle();

    expect(router.router.state.uri.path, '/login');
    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Faith Brings Us Together'), findsOneWidget);
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

    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Explore without signing in'), findsOneWidget);
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

    expect(find.text('Namaste 🙏'), findsOneWidget);
    expect(find.text('Nearby Jinalays'), findsOneWidget);
    expect(find.text('Temple Renovation Fund'), findsOneWidget);
  });

  testWidgets('member experience exposes the demo navigation tabs',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: MemberHomePage()),
    );

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Temples'), findsOneWidget);
    expect(find.text('Events'), findsOneWidget);
    expect(find.text('Donations'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  testWidgets('member experience switches between demo screens',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: MemberHomePage()),
    );

    await tester.tap(find.text('Temples'));
    await tester.pumpAndSettle();
    expect(find.text('Explore Temples'), findsOneWidget);

    await tester.tap(find.text('Events'));
    await tester.pumpAndSettle();
    expect(find.text('Events & Community'), findsOneWidget);

    await tester.tap(find.text('Donations'));
    await tester.pumpAndSettle();
    expect(find.text('Support & Donate'), findsOneWidget);

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Arpit Jain'), findsOneWidget);
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

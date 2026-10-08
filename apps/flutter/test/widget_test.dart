import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/core/auth/firebase_auth_provider.dart';
import 'package:jain_community_platform/core/routing/app_router.dart';
import 'package:jain_community_platform/core/routing/app_routes.dart';
import 'package:jain_community_platform/core/session/app_session.dart';
import 'package:jain_community_platform/core/session/app_session_controller.dart';
import 'package:jain_community_platform/core/session/auth_session_service.dart';
import 'package:jain_community_platform/core/tenant/tenant_context.dart';
import 'package:jain_community_platform/core/tenant/tenant_selection_controller.dart';
import 'package:jain_community_platform/features/auth/presentation/login_page.dart';
import 'package:jain_community_platform/features/member/presentation/member_home_page.dart';
import 'package:jain_community_platform/features/profile/data/profile_repository.dart';
import 'package:jain_community_platform/features/tenant/data/tenant_repository.dart';
import 'package:jain_community_platform/features/website/data/website_repository.dart';
import 'package:jain_community_platform/features/website/presentation/tenant_home_page.dart';
import 'package:jain_community_platform/main.dart';

const temple = TenantContext(
  id: 'tenant-1',
  name: 'Shree Adinath Jinalay',
  hostname: 'temple.jcp.example',
);

ApiClient _apiClient() {
  final client = MockClient((request) async {
    if (request.url.path == '/api/website/site') {
      return http.Response(jsonEncode({
        'tenantId': 'tenant-1',
        'theme': {'primary': '#F57C00', 'secondary': '#8B2E1B', 'background': '#FFF4DE', 'surface': '#FFFDF8', 'accent': '#E65100'},
        'header': {'navItems': [], 'languages': ['हिन्दी']},
        'hero': {'title': 'Shree Adinath Jinalay', 'subtitle': 'शांति, श्रद्धा और सेवा का संगम'},
        'quickInfo': [],
        'about': {'title': 'मंदिर', 'body': 'परिचय'},
        'templeDirectory': {'enabled': true, 'title': 'मंदिर खोजें', 'showSearch': true, 'limit': 6},
        'events': {'enabled': true, 'title': 'कार्यक्रम', 'items': []},
        'gallery': {'enabled': true, 'title': 'गैलरी', 'items': []},
        'seva': {'enabled': true, 'title': 'सेवा', 'items': []},
        'contact': {},
        'footer': {'tagline': 'MyJinalay'},
      }), 200);
    }
    if (request.url.path == '/api/directory/temples') {
      return http.Response(jsonEncode([{
        'id': 'tenant-1',
        'slug': 'temple-one',
        'name': 'Shree Adinath Jinalay',
        'hostname': 'temple.jcp.example',
      }]), 200);
    }
    return http.Response('{}', 200);
  });
  return ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client);
}

class FakeAuth implements FirebaseAuthProvider {
  FakeAuth(this.signedIn);
  final bool signedIn;

  @override
  bool get isSignedIn => signedIn;

  @override
  Stream<FirebaseAuthUser?> authStateChanges() =>
      Stream.value(signedIn ? const FirebaseAuthUser(uid: 'user-1') : null);

  @override
  Future<String?> getIdToken() async => null;

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signOut() async {}
}

class FakeSessionService extends AuthSessionService {
  FakeSessionService(this.value) : super(ApiClient(baseUrl: Uri.parse('https://example.test/')));

  final AppSession value;

  @override
  Future<AppSession> loadCurrentSession() async => value;
}

Future<void> _pumpRouter(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

Future<(AppRouter, TenantSelectionController, AppSessionController)> _router({
  AppSession session = AppSession.signedOut,
}) async {
  final api = _apiClient();
  final selection = TenantSelectionController(temple);
  final auth = FakeAuth(session.isAuthenticated);
  final controller = AppSessionController(
    auth: auth,
    sessionService: FakeSessionService(session),
  );
  await controller.initialize();
  await Future<void>.delayed(Duration.zero);

  final router = AppRouter(
    tenantSelection: selection,
    tenantRepository: TenantRepository(api),
    sessionController: controller,
    profileRepository: ProfileRepository(api),
    api: api,
  );
  return (router, selection, controller);
}

void main() {
  testWidgets('renders the tenant-configured public home', (tester) async {
    final (_, selection, controller) = await _router();

    await tester.pumpWidget(MaterialApp(
      home: TenantHomePage(
        selection: selection,
        tenantRepository: TenantRepository(_apiClient()),
        websiteRepository: WebsiteRepository(_apiClient()),
        sessionController: controller,
      ),
    ));
    await _pumpRouter(tester);

    expect(find.text('Shree Adinath Jinalay'), findsOneWidget);
    controller.dispose();
  });

  testWidgets('home sign-in action navigates to login', (tester) async {
    final (_, selection, controller) = await _router();
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, __) => TenantHomePage(
            selection: selection,
            tenantRepository: TenantRepository(_apiClient()),
            websiteRepository: WebsiteRepository(_apiClient()),
            sessionController: controller,
          ),
        ),
        GoRoute(
          path: '/login',
          builder: (_, __) => const Scaffold(body: Text('Continue with Google')),
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await _pumpRouter(tester);

    await tester.tap(find.widgetWithText(TextButton, 'Sign in'));
    await _pumpRouter(tester);

    expect(router.state.uri.path, '/login');
    expect(find.text('Continue with Google'), findsOneWidget);
    router.dispose();
    controller.dispose();
  });

  testWidgets('redirects unauthenticated users from admin to login',
      (tester) async {
    final (appRouter, _, controller) = await _router();
    final router = GoRouter(
      initialLocation: AppRoutes.admin,
      redirect: appRouter.redirect,
      routes: [
        GoRoute(path: '/login', builder: (_, __) => const Scaffold(body: Text('login'))),
        GoRoute(path: AppRoutes.admin, builder: (_, __) => const Scaffold(body: Text('admin'))),
        GoRoute(path: AppRoutes.member, builder: (_, __) => const Scaffold(body: Text('member'))),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await _pumpRouter(tester);

    expect(router.state.uri.path, '/login');
    router.dispose();
    controller.dispose();
  });

  testWidgets('allows an authenticated tenant admin to open admin',
      (tester) async {
    final (appRouter, _, controller) = await _router(
      session: const AppSession(
        isAuthenticated: true,
        userId: 'user-1',
        role: 'TENANT_ADMIN',
      ),
    );
    final router = GoRouter(
      initialLocation: AppRoutes.admin,
      redirect: appRouter.redirect,
      routes: [
        GoRoute(path: '/login', builder: (_, __) => const Scaffold(body: Text('login'))),
        GoRoute(path: AppRoutes.admin, builder: (_, __) => const Scaffold(body: Text('admin'))),
        GoRoute(path: AppRoutes.member, builder: (_, __) => const Scaffold(body: Text('member'))),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await _pumpRouter(tester);

    expect(router.state.uri.path, AppRoutes.admin);
    expect(find.text('admin'), findsOneWidget);
    router.dispose();
    controller.dispose();
  });

  testWidgets('member experience exposes the demo navigation tabs',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: MemberHomePage()));
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Temples'), findsOneWidget);
    expect(find.text('Events'), findsOneWidget);
    expect(find.text('Donations'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  testWidgets('member experience switches between demo screens',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: MemberHomePage()));

    await tester.tap(find.text('Temples'));
    await _pumpRouter(tester);
    expect(find.text('Explore Temples'), findsOneWidget);

    await tester.tap(find.text('Events'));
    await _pumpRouter(tester);
    expect(find.text('Events & Community'), findsOneWidget);

    await tester.tap(find.text('Donations'));
    await _pumpRouter(tester);
    expect(find.text('Support & Donate'), findsOneWidget);

    await tester.tap(find.text('Profile'));
    await _pumpRouter(tester);
    expect(find.text('MyJinalay Member'), findsOneWidget);
  });

  testWidgets('login page invokes the Google sign-in callback',
      (tester) async {
    var invoked = false;
    await tester.pumpWidget(MaterialApp(
      home: LoginPage(onSignInWithGoogle: () async { invoked = true; }),
    ));
    await tester.ensureVisible(find.text('Continue with Google'));
    await tester.tap(find.text('Continue with Google'));
    await tester.pump();
    expect(invoked, isTrue);
  });
}

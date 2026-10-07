import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/admin_home_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/member/presentation/member_home_page.dart';
import '../../features/platform/presentation/platform_admin_page.dart';
import '../../features/profile/data/profile_repository.dart';
import '../../features/profile/presentation/link_contact_page.dart';
import '../../features/public/presentation/home_page.dart';
import '../../features/tenant/data/tenant_repository.dart';
import '../../features/website/data/website_repository.dart';
import '../../features/website/presentation/website_editor_page.dart';
import '../api/api_client.dart';
import '../session/app_session.dart';
import '../session/app_session_controller.dart';
import '../tenant/tenant_selection_controller.dart';
import 'app_routes.dart';

class AppRouter {
  AppRouter({
    AppSession session = const AppSession(),
    required TenantSelectionController tenantSelection,
    required TenantRepository tenantRepository,
    required AppSessionController sessionController,
    required ProfileRepository profileRepository,
    required ApiClient api,
  })  : _session = session,
        _tenantSelection = tenantSelection,
        _tenantRepository = tenantRepository,
        _sessionController = sessionController,
        _profileRepository = profileRepository,
        _api = api {
    final websiteRepository = WebsiteRepository(api);
    _websiteRepository = websiteRepository;
    router = GoRouter(
      initialLocation: AppRoutes.home,
      refreshListenable: sessionController,
      redirect: redirect,
      routes: [
        GoRoute(
          path: AppRoutes.home,
          builder: (_, __) => HomePage(
            selection: _tenantSelection,
            tenantRepository: _tenantRepository,
            websiteRepository: websiteRepository,
            onTenantSelected: (_) => _sessionController.refreshCurrentSession(),
          ),
        ),
        GoRoute(
          path: AppRoutes.login,
          builder: (_, __) => LoginPage(
            onSignInWithGoogle: sessionController.signInWithGoogle,
            isLoading: sessionController.status == AppSessionStatus.initializing,
            error: sessionController.error,
          ),
        ),
        GoRoute(
          path: '/link-contact',
          builder: (_, __) => LinkContactPage(
            onLink: (value) => _sessionController.linkContact(value),
          ),
        ),
        GoRoute(
          path: AppRoutes.member,
          builder: (_, __) => MemberHomePage(profileRepository: _profileRepository),
        ),
        GoRoute(
          path: AppRoutes.admin,
          builder: (_, __) => AdminHomePage(api: _api),
        ),
        GoRoute(
          path: AppRoutes.adminSite,
          builder: (_, __) => WebsiteEditorPage(
            repository: _websiteRepository,
            tenantName: _tenantSelection.selected?.name ?? 'Temple',
          ),
        ),
        GoRoute(
          path: AppRoutes.platformAdmin,
          builder: (_, __) => PlatformAdminPage(api: _api),
        ),
        GoRoute(
          path: AppRoutes.finance,
          builder: (_, __) => const _PlaceholderPage(title: 'Finance console'),
        ),
        GoRoute(
          path: AppRoutes.library,
          builder: (_, __) => const _PlaceholderPage(title: 'Digital library'),
        ),
      ],
    );
  }

  final AppSession _session;
  final TenantSelectionController _tenantSelection;
  final TenantRepository _tenantRepository;
  final AppSessionController _sessionController;
  final ProfileRepository _profileRepository;
  final ApiClient _api;
  late final WebsiteRepository _websiteRepository;
  late final GoRouter router;

  AppSession get currentSession => _sessionController.session;

  String? redirect(BuildContext context, GoRouterState state) {
    final location = state.matchedLocation;
    final session = currentSession;
    final isPrivateRoute = {
      AppRoutes.member,
      AppRoutes.admin,
      AppRoutes.adminSite,
      AppRoutes.finance,
      AppRoutes.library,
      AppRoutes.platformAdmin,
    }.contains(location);

    if (location == AppRoutes.login && session.isAuthenticated) {
      if (session.needsPhoneLink) return '/link-contact';
      if (session.isAdmin && _tenantSelection.selected != null) return AppRoutes.admin;
      if (session.isPlatformAdmin) return AppRoutes.platformAdmin;
      return AppRoutes.member;
    }

    if (location == '/link-contact') {
      return session.isAuthenticated ? null : AppRoutes.login;
    }

    if (session.isAuthenticated && session.needsPhoneLink) {
      return '/link-contact';
    }

    if (!isPrivateRoute) return null;

    if (!session.isAuthenticated) return AppRoutes.login;

    if (location == AppRoutes.platformAdmin && !session.isPlatformAdmin) {
      return AppRoutes.member;
    }

    if ((location == AppRoutes.admin || location == AppRoutes.adminSite) &&
        (!session.isAdmin || _tenantSelection.selected == null)) {
      return AppRoutes.member;
    }

    if (location == AppRoutes.finance && !session.isFinance) {
      return AppRoutes.member;
    }

    return null;
  }
}

class _PlaceholderPage extends StatelessWidget {
  const _PlaceholderPage({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(child: Text(title)),
    );
  }
}

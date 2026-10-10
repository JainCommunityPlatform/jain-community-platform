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
    required TenantSelectionController tenantSelection,
    required TenantRepository tenantRepository,
    required AppSessionController sessionController,
    required ProfileRepository profileRepository,
    required ApiClient api,
  })  : _tenantSelection = tenantSelection,
        _tenantRepository = tenantRepository,
        _sessionController = sessionController,
        _profileRepository = profileRepository,
        _api = api {
    final websiteRepository = WebsiteRepository(api);
    _websiteRepository = websiteRepository;
    router = GoRouter(
      navigatorKey: navigatorKey,
      initialLocation: AppRoutes.home,
      refreshListenable: sessionController,
      redirect: redirect,
      routes: [
        GoRoute(
          path: AppRoutes.home,
          builder: (context, __) => _withBackGuard(context, HomePage(
            selection: _tenantSelection,
            tenantRepository: _tenantRepository,
            websiteRepository: websiteRepository,
            onTenantSelected: (_) => _sessionController.refreshCurrentSession(),
            sessionController: _sessionController,
          )),
        ),
        GoRoute(
          path: AppRoutes.login,
          builder: (context, __) => _withBackGuard(context, LoginPage(
            onSignInWithGoogle: sessionController.signInWithGoogle,
            isLoading: sessionController.status == AppSessionStatus.initializing,
            error: sessionController.error,
          )),
        ),
        GoRoute(
          path: '/link-contact',
          builder: (context, __) => _withBackGuard(context, LinkContactPage(
            onLink: (value) => _sessionController.linkContact(value),
          )),
        ),
        GoRoute(
          path: AppRoutes.member,
          builder: (context, state) => _withBackGuard(context, MemberHomePage(
            profileRepository: _profileRepository,
            api: _api,
            initialIndex: int.tryParse(state.uri.queryParameters['tab'] ?? '') ?? 0,
          )),
        ),
        GoRoute(
          path: AppRoutes.admin,
          builder: (context, __) => _withBackGuard(context, AdminHomePage(api: _api)),
        ),
        GoRoute(
          path: AppRoutes.adminSite,
          builder: (context, __) => _withBackGuard(context, WebsiteEditorPage(
            repository: _websiteRepository,
            tenantName: _tenantSelection.selected?.name ?? 'Temple',
          )),
        ),
        GoRoute(
          path: AppRoutes.platformAdmin,
          builder: (context, __) => _withBackGuard(context, PlatformAdminPage(api: _api)),
        ),
        GoRoute(
          path: AppRoutes.finance,
          builder: (context, __) => _withBackGuard(context, const _PlaceholderPage(title: 'Finance console')),
        ),
        GoRoute(
          path: AppRoutes.library,
          builder: (context, __) => _withBackGuard(context, const _PlaceholderPage(title: 'Digital library')),
        ),
        GoRoute(
          path: AppRoutes.inventory,
          builder: (context, __) => _withBackGuard(context, const _PlaceholderPage(title: 'Inventory console')),
        ),
      ],
    );
  }

  final TenantSelectionController _tenantSelection;
  final TenantRepository _tenantRepository;
  final AppSessionController _sessionController;
  final ProfileRepository _profileRepository;
  final ApiClient _api;
  late final WebsiteRepository _websiteRepository;
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  late final GoRouter router;

  AppSession get currentSession => _sessionController.session;

  Widget _withBackGuard(BuildContext context, Widget child) {
    final currentPath = router.routeInformationProvider.value.uri.path;
    return PopScope<Object?>(
      canPop: router.canPop() || Navigator.of(context).canPop(),
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (currentPath != AppRoutes.home) {
          _tenantSelection.select(null);
          router.go(AppRoutes.home);
        } else if (_tenantSelection.selected != null) {
          _tenantSelection.select(null);
        }
      },
      child: child,
    );
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final location = state.matchedLocation;
    final session = currentSession;
    final isPrivateRoute = {
      AppRoutes.member,
      AppRoutes.admin,
      AppRoutes.adminSite,
      AppRoutes.finance,
      AppRoutes.library,
      AppRoutes.inventory,
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

    if (location == AppRoutes.inventory && !session.isInventory) {
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

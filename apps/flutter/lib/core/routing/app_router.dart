import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/admin_home_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/member/presentation/member_home_page.dart';
import '../../features/public/presentation/home_page.dart';
import '../session/app_session.dart';
import '../session/app_session_controller.dart';
import '../tenant/tenant_context.dart';
import 'app_routes.dart';

class AppRouter {
  AppRouter({
    AppSession session = const AppSession(),
    TenantContext? tenant,
    AppSessionController? sessionController,
  })  : _session = session,
        _tenant = tenant,
        _sessionController = sessionController {
    router = GoRouter(
      initialLocation: AppRoutes.home,
      refreshListenable: sessionController,
      redirect: redirect,
      routes: [
        GoRoute(
          path: AppRoutes.home,
          builder: (_, __) => const HomePage(),
        ),
        GoRoute(
          path: AppRoutes.login,
          builder: (_, __) => LoginPage(
            onSignInWithGoogle: sessionController?.signInWithGoogle,
            isLoading: sessionController?.status ==
                AppSessionStatus.initializing,
            error: sessionController?.error,
          ),
        ),
        GoRoute(
          path: AppRoutes.member,
          builder: (_, __) => const MemberHomePage(),
        ),
        GoRoute(
          path: AppRoutes.admin,
          builder: (_, __) => const AdminHomePage(),
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
  final TenantContext? _tenant;
  final AppSessionController? _sessionController;
  late final GoRouter router;

  AppSession get currentSession => _sessionController?.session ?? _session;

  String? redirect(BuildContext context, GoRouterState state) {
    final location = state.matchedLocation;
    final session = currentSession;
    final isPrivateRoute = location == AppRoutes.member ||
        location == AppRoutes.admin ||
        location == AppRoutes.finance ||
        location == AppRoutes.library;

    if (location == AppRoutes.login && session.isAuthenticated) {
      return AppRoutes.member;
    }

    if (!isPrivateRoute) {
      return null;
    }

    if (_tenant == null) {
      return AppRoutes.home;
    }

    if (!session.isAuthenticated) {
      return AppRoutes.login;
    }

    if (location == AppRoutes.admin && !session.isAdmin) {
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

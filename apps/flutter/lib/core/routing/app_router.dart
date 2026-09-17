import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/admin_home_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/member/presentation/member_home_page.dart';
import '../../features/public/presentation/home_page.dart';
import '../session/app_session.dart';
import 'app_routes.dart';

class AppRouter {
  AppRouter({AppSession session = const AppSession()})
      : _session = session,
        router = GoRouter(
          initialLocation: AppRoutes.home,
          routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (_, __) => const HomePage(),
            ),
            GoRoute(
              path: AppRoutes.login,
              builder: (_, __) => const LoginPage(),
            ),
            GoRoute(
              path: AppRoutes.member,
              builder: (_, __) => const MemberHomePage(),
            ),
            GoRoute(
              path: AppRoutes.admin,
              builder: (_, __) => const AdminHomePage(),
            ),
          ],
        );

  final AppSession _session;
  final GoRouter router;

  String? redirect(BuildContext context, GoRouterState state) {
    final location = state.matchedLocation;
    final isPrivateRoute = location == AppRoutes.member ||
        location == AppRoutes.admin ||
        location == AppRoutes.finance ||
        location == AppRoutes.library;

    if (!isPrivateRoute) {
      return null;
    }

    if (!_session.isAuthenticated) {
      return AppRoutes.login;
    }

    if (location == AppRoutes.admin && !_session.isAdmin) {
      return AppRoutes.member;
    }

    if (location == AppRoutes.finance && !_session.isFinance) {
      return AppRoutes.member;
    }

    return null;
  }
}

import 'package:flutter/material.dart';

import 'core/api/api_client.dart';
import 'core/api/api_environment.dart';
import 'core/auth/firebase_auth_provider.dart';
import 'core/firebase/firebase_bootstrap.dart';
import 'core/routing/app_router.dart';
import 'core/session/app_session_controller.dart';
import 'core/session/auth_session_service.dart';
import 'core/tenant/tenant_context.dart';
import 'core/tenant/tenant_scope.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await FirebaseBootstrap().initialize();

  final firebaseAuth = FirebaseAuthService();
  await firebaseAuth.initialize();

  final api = ApiClient(
    baseUrl: ApiEnvironment.baseUrl,
    accessTokenProvider: firebaseAuth.getIdToken,
    onUnauthorized: firebaseAuth.signOut,
  );
  final sessionController = AppSessionController(
    auth: firebaseAuth,
    sessionService: AuthSessionService(api),
  );
  await sessionController.initialize();

  final tenant = const TenantResolver().resolve(Uri.base);
  runApp(
    JainCommunityPlatformApp(
      router: AppRouter(
        tenant: tenant,
        sessionController: sessionController,
      ),
      tenant: tenant,
    ),
  );
}

class JainCommunityPlatformApp extends StatelessWidget {
  const JainCommunityPlatformApp({required this.router, this.tenant, super.key});

  final AppRouter router;
  final TenantContext? tenant;

  @override
  Widget build(BuildContext context) {
    return TenantScope(
      tenant: tenant,
      child: MaterialApp.router(
        title: tenant?.name ?? 'Jain Community Platform',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        routerConfig: router.router,
      ),
    );
  }
}

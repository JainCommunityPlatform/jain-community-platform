import 'package:flutter/foundation.dart';
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
import 'core/tenant/tenant_selection_controller.dart';
import 'core/theme/app_theme.dart';
import 'features/profile/data/profile_repository.dart';
import 'features/tenant/data/tenant_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await FirebaseBootstrap().initialize();

  final baseUrl = ApiEnvironment.baseUrl;
  final publicApi = ApiClient(baseUrl: baseUrl);
  final tenantRepository = TenantRepository(publicApi);
  final tenantSelection = TenantSelectionController();

  if (kIsWeb) {
    final resolved = await tenantRepository.resolveHost(Uri.base.host);
    tenantSelection.select(resolved);
  }

  final firebaseAuth = FirebaseAuthService();
  await firebaseAuth.initialize();

  final api = ApiClient(
    baseUrl: baseUrl,
    accessTokenProvider: firebaseAuth.getIdToken,
    onUnauthorized: firebaseAuth.signOut,
    tenantIdProvider: () => tenantSelection.tenantId,
  );
  final profileRepository = ProfileRepository(api);
  final sessionController = AppSessionController(
    auth: firebaseAuth,
    sessionService: AuthSessionService(api),
  );
  await sessionController.initialize();

  runApp(
    JainCommunityPlatformApp(
      router: AppRouter(
        tenantSelection: tenantSelection,
        tenantRepository: tenantRepository,
        sessionController: sessionController,
        profileRepository: profileRepository,
        api: api,
      ),
      tenant: tenantSelection.selected,
      tenantSelection: tenantSelection,
    ),
  );
}

class JainCommunityPlatformApp extends StatelessWidget {
  const JainCommunityPlatformApp({
    required this.router,
    required this.tenantSelection,
    this.tenant,
    super.key,
  });

  final AppRouter router;
  final TenantContext? tenant;
  final TenantSelectionController tenantSelection;

  @override
  Widget build(BuildContext context) {
    return TenantScope(
      tenant: tenant,
      child: AnimatedBuilder(
        animation: tenantSelection,
        builder: (context, _) => MaterialApp.router(
          title: tenantSelection.selected?.name ?? 'MyJinalay',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          routerConfig: router.router,
        ),
      ),
    );
  }
}

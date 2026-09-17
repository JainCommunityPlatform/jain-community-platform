import 'package:flutter/material.dart';

import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(JainCommunityPlatformApp(router: AppRouter()));
}

class JainCommunityPlatformApp extends StatelessWidget {
  const JainCommunityPlatformApp({required this.router, super.key});

  final AppRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Jain Community Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router.router,
    );
  }
}

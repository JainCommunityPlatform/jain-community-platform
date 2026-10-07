import 'package:flutter/material.dart';

import '../../../core/session/app_session_controller.dart';
import '../../../core/tenant/tenant_selection_controller.dart';
import '../../tenant/data/tenant_repository.dart';
import '../../website/data/website_repository.dart';
import '../../website/presentation/tenant_home_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({
    required this.selection,
    required this.tenantRepository,
    required this.websiteRepository,
    required this.sessionController,
    this.onTenantSelected,
    super.key,
  });

  final TenantSelectionController selection;
  final TenantRepository tenantRepository;
  final WebsiteRepository websiteRepository;
  final AppSessionController sessionController;
  final Future<void> Function(TenantSummary)? onTenantSelected;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: selection,
      builder: (context, _) => AnimatedBuilder(
        animation: sessionController,
        builder: (context, __) => TenantHomePage(
          key: ValueKey(selection.tenantId),
          selection: selection,
          tenantRepository: tenantRepository,
          websiteRepository: websiteRepository,
          onSelectTenant: onTenantSelected,
          sessionController: sessionController,
        ),
      ),
    );
  }
}

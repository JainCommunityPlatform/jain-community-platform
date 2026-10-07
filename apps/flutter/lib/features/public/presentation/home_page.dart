import 'package:flutter/material.dart';

import '../../../core/tenant/tenant_selection_controller.dart';
import '../../tenant/data/tenant_repository.dart';
import '../../website/data/website_repository.dart';
import '../../website/presentation/tenant_home_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({
    required this.selection,
    required this.tenantRepository,
    required this.websiteRepository,
    super.key,
  });

  final TenantSelectionController selection;
  final TenantRepository tenantRepository;
  final WebsiteRepository websiteRepository;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: selection,
      builder: (context, _) => TenantHomePage(
        selection: selection,
        tenantRepository: tenantRepository,
        websiteRepository: websiteRepository,
      ),
    );
  }
}

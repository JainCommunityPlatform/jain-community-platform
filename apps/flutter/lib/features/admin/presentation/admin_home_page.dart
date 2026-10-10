import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../data/tenant_member_repository.dart';
import 'admin_members_page.dart';

class AdminHomePage extends StatelessWidget {
  const AdminHomePage({required this.api, super.key});

  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    final repository = TenantMemberRepository(api);
    return Scaffold(
      appBar: AppBar(title: const Text('Temple Admin')),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 5,
        onDestinationSelected: (index) {
          if (index == 5) return;
          context.go('${AppRoutes.member}?tab=$index');
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.temple_hindu_outlined), selectedIcon: Icon(Icons.temple_hindu), label: 'Temples'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Events'),
          NavigationDestination(icon: Icon(Icons.volunteer_activism_outlined), selectedIcon: Icon(Icons.volunteer_activism), label: 'Donations'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
          NavigationDestination(icon: Icon(Icons.admin_panel_settings_outlined), selectedIcon: Icon(Icons.admin_panel_settings), label: 'Manage'),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.web),
              title: const Text('Temple website'),
              subtitle: const Text('Edit the shared homepage, content and images'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go(AppRoutes.adminSite),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.people_outline),
              title: const Text('Members'),
              subtitle: const Text('Manage tenant members and roles'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => AdminMembersPage(repository: repository)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

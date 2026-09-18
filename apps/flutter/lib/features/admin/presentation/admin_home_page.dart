import 'package:flutter/material.dart';

import 'admin_members_page.dart';

class AdminHomePage extends StatelessWidget {
  const AdminHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin console')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.people_outline),
              title: const Text('Members'),
              subtitle: const Text('Manage tenant members and roles'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AdminMembersPage()),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

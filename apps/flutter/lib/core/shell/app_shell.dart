import 'package:flutter/material.dart';

import '../tenant/tenant_scope.dart';

class AppShell extends StatelessWidget {
  const AppShell({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tenant = TenantScope.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(tenant?.name ?? 'Jain Community Platform'),
      ),
      body: child,
    );
  }
}

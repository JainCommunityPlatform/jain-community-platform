import 'package:flutter/widgets.dart';

import 'tenant_context.dart';

class TenantScope extends InheritedWidget {
  const TenantScope({
    required this.tenant,
    required super.child,
    super.key,
  });

  final TenantContext? tenant;

  static TenantContext? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<TenantScope>()?.tenant;
  }

  @override
  bool updateShouldNotify(TenantScope oldWidget) => tenant != oldWidget.tenant;
}

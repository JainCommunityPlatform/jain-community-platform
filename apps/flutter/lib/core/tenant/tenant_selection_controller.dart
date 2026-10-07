import 'package:flutter/foundation.dart';

import 'tenant_context.dart';

class TenantSelectionController extends ChangeNotifier {
  TenantSelectionController([TenantContext? initial]) : _selected = initial;

  TenantContext? _selected;

  TenantContext? get selected => _selected;
  String? get tenantId => _selected?.id;

  void select(TenantContext? tenant) {
    if (_selected?.id == tenant?.id) return;
    _selected = tenant;
    notifyListeners();
  }
}

import 'package:flutter_test/flutter_test.dart';

import '../../../lib/core/session/app_session.dart';

void main() {
  test('maps authenticated auth/me response to an authenticated session', () {
    final session = AppSession.fromAuthMe({
      'userId': 'user-123',
      'email': 'member@example.com',
      'displayName': 'Community Member',
      'tenantId': 'tenant-123',
      'role': 'TENANT_ADMIN',
    });

    expect(session.isAuthenticated, isTrue);
    expect(session.userId, 'user-123');
    expect(session.email, 'member@example.com');
    expect(session.displayName, 'Community Member');
    expect(session.tenantId, 'tenant-123');
    expect(session.role, 'TENANT_ADMIN');
    expect(session.isAdmin, isTrue);
    expect(session.isFinance, isTrue);
  });

  test('treats a missing or empty user id as signed out', () {
    final missing = AppSession.fromAuthMe(const {});
    final empty = AppSession.fromAuthMe({'userId': ''});

    expect(missing.isAuthenticated, isFalse);
    expect(empty.isAuthenticated, isFalse);
  });

  test('maps finance roles without granting admin access', () {
    const financeRoles = [
      'FINANCE_VIEWER',
      'FINANCE_OPERATOR',
      'FINANCE_APPROVER',
    ];

    for (final role in financeRoles) {
      final session = AppSession.fromAuthMe({
        'userId': 'user-123',
        'role': role,
      });

      expect(session.isFinance, isTrue, reason: role);
      expect(session.isAdmin, isFalse, reason: role);
    }
  });
}

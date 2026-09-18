import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../lib/features/admin/data/tenant_member.dart';
import '../../../../lib/features/admin/data/tenant_member_repository.dart';
import '../../../../lib/features/admin/presentation/admin_members_page.dart';

class FakeRepository extends TenantMemberRepository {
  FakeRepository(this.current) : super(_unusedApi);
  static final _unusedApi = throw UnimplementedError();
  List<TenantMember> current;
  bool fail = false;
  @override Future<List<TenantMember>> list() async {
    if (fail) throw Exception('network error');
    return current;
  }
  @override Future<TenantMember> create({required String userId, required String role}) async =>
      TenantMember(id: 'new', userId: userId, role: role);
  @override Future<TenantMember> updateRole({required String userId, required String role}) async =>
      TenantMember(id: 'm', userId: userId, role: role);
  @override Future<void> remove(String userId) async {}
}

void main() {
  testWidgets('loads members from repository', (tester) async {
    final repo = FakeRepository([const TenantMember(id: 'm1', userId: 'u1', role: 'TENANT_ADMIN', displayName: 'Community Admin')]);
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();
    expect(find.text('Community Admin'), findsOneWidget);
  });

  testWidgets('shows retry state on API failure', (tester) async {
    final repo = FakeRepository(const [])..fail = true;
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();
    expect(find.text('Unable to load members'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}

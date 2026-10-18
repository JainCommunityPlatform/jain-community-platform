import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/admin/data/tenant_member.dart';
import 'package:jain_community_platform/features/admin/data/tenant_member_repository.dart';
import 'package:jain_community_platform/features/admin/presentation/admin_members_page.dart';

class FakeRepository extends TenantMemberRepository {
  FakeRepository(this.current)
      : super(ApiClient(baseUrl: Uri.parse('https://example.test/')));

  List<TenantMember> current;
  bool fail = false;
  bool failCreate = false;
  bool failRoleUpdate = false;
  bool failContactUpdate = false;
  bool failRemove = false;
  int listCalls = 0;
  int createCalls = 0;
  int roleUpdateCalls = 0;
  int contactUpdateCalls = 0;
  int removeCalls = 0;

  @override
  Future<List<TenantMember>> list() async {
    listCalls++;
    if (fail) throw Exception('network error');
    return List<TenantMember>.from(current);
  }

  @override
  Future<TenantMember> create({required String userId, required String role}) async {
    createCalls++;
    await Future<void>.delayed(const Duration(milliseconds: 1));
    if (failCreate) throw StateError('simulated create failure');
    final member = TenantMember(
      id: 'new',
      userId: userId,
      role: role,
      displayName: 'New Member',
      email: '$userId@example.test',
    );
    current.add(member);
    return member;
  }

  @override
  Future<TenantMember> updateRole({required String userId, required String role}) async {
    roleUpdateCalls++;
    await Future<void>.delayed(const Duration(milliseconds: 1));
    if (failRoleUpdate) throw StateError('simulated role update failure');
    final index = current.indexWhere((member) => member.userId == userId);
    final old = current[index];
    final updated = TenantMember(
      id: old.id,
      userId: old.userId,
      role: role,
      displayName: old.displayName,
      email: old.email,
      primaryPhone: old.primaryPhone,
    );
    current[index] = updated;
    return updated;
  }

  @override
  Future<void> updateContact({required String userId, required String value}) async {
    contactUpdateCalls++;
    await Future<void>.delayed(const Duration(milliseconds: 1));
    if (failContactUpdate) throw StateError('simulated contact update failure');
    final index = current.indexWhere((member) => member.userId == userId);
    final old = current[index];
    current[index] = TenantMember(
      id: old.id,
      userId: old.userId,
      role: old.role,
      displayName: old.displayName,
      email: old.email,
      primaryPhone: value,
    );
  }

  @override
  Future<void> remove(String userId) async {
    removeCalls++;
    await Future<void>.delayed(const Duration(milliseconds: 1));
    if (failRemove) throw StateError('simulated remove failure');
    current.removeWhere((member) => member.userId == userId);
  }
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

  testWidgets('add member validates required user ID and refreshes after creation',
      (tester) async {
    final repo = FakeRepository(<TenantMember>[]);
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add member'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Add'));
    await tester.pumpAndSettle();
    expect(find.text('User ID is required'), findsOneWidget);
    expect(repo.createCalls, 0);

    await tester.enterText(find.byType(TextFormField).first, 'user-2');
    await tester.tap(find.widgetWithText(FilledButton, 'Add'));
    await tester.pumpAndSettle();

    expect(repo.createCalls, 1);
    expect(repo.current.single.userId, 'user-2');
    expect(find.text('New Member'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('create failure keeps add dialog open and allows retry',
      (tester) async {
    final repo = FakeRepository(<TenantMember>[])..failCreate = true;
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add member'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, 'user-3');
    await tester.tap(find.widgetWithText(FilledButton, 'Add'));
    await tester.pumpAndSettle();

    expect(find.text('Add member'), findsOneWidget);
    expect(find.textContaining('simulated create failure'), findsOneWidget);
    expect(repo.createCalls, 1);

    repo.failCreate = false;
    await tester.tap(find.widgetWithText(FilledButton, 'Add'));
    await tester.pumpAndSettle();
    expect(repo.createCalls, 2);
    expect(find.text('New Member'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('contact update validates mobile and persists a valid number',
      (tester) async {
    final repo = FakeRepository([
      const TenantMember(id: 'm1', userId: 'u1', role: 'TENANT_ADMIN', displayName: 'Community Admin'),
    ]);
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Update mobile number'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), '1234567890');
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid 10 digit mobile number'), findsOneWidget);
    expect(repo.contactUpdateCalls, 0);

    await tester.enterText(find.byType(TextFormField), '9876543210');
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(repo.contactUpdateCalls, 1);
    expect(repo.current.single.primaryPhone, '9876543210');
    expect(find.textContaining('9876543210'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('role change refreshes member list with updated role',
      (tester) async {
    final repo = FakeRepository([
      const TenantMember(id: 'm1', userId: 'u1', role: 'TENANT_ADMIN', displayName: 'Community Admin'),
    ]);
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Change role'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Content Manager').last);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(repo.roleUpdateCalls, 1);
    expect(repo.current.single.role, 'CONTENT_MANAGER');
    expect(repo.listCalls, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('removing member refreshes to empty state',
      (tester) async {
    final repo = FakeRepository([
      const TenantMember(id: 'm1', userId: 'u1', role: 'TENANT_ADMIN', displayName: 'Community Admin'),
    ]);
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove member'));
    await tester.pumpAndSettle();

    expect(repo.removeCalls, 1);
    expect(repo.current, isEmpty);
    expect(find.text('No members yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('pull to refresh reloads changed member list',
      (tester) async {
    final repo = FakeRepository([
      const TenantMember(id: 'm1', userId: 'u1', role: 'TENANT_ADMIN', displayName: 'Community Admin'),
    ]);
    await tester.pumpWidget(MaterialApp(home: AdminMembersPage(repository: repo)));
    await tester.pumpAndSettle();

    repo.current
      ..clear()
      ..add(const TenantMember(id: 'm2', userId: 'u2', role: 'CONTENT_MANAGER', displayName: 'Newly Added'));
    await tester.drag(find.byType(ListView), const Offset(0, 500));
    await tester.pumpAndSettle();

    expect(repo.listCalls, 2);
    expect(find.text('Newly Added'), findsOneWidget);
    expect(find.text('Community Admin'), findsNothing);
    expect(tester.takeException(), isNull);
  });

}

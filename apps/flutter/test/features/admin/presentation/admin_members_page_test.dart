import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../lib/features/admin/presentation/admin_members_page.dart';

void main() {
  testWidgets('shows members and member administration actions', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AdminMembersPage()));

    expect(find.text('Members'), findsOneWidget);
    expect(find.text('Community Admin'), findsOneWidget);
    expect(find.text('Content Manager'), findsOneWidget);
    expect(find.byTooltip('Add member'), findsOneWidget);
  });

  testWidgets('opens add member dialog', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AdminMembersPage()));

    await tester.tap(find.byTooltip('Add member'));
    await tester.pumpAndSettle();

    expect(find.text('Add member'), findsOneWidget);
    expect(find.text('User ID'), findsOneWidget);
    expect(find.text('Role'), findsOneWidget);
  });
}

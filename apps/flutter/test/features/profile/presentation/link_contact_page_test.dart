import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/features/profile/presentation/link_contact_page.dart';

void main() {
  testWidgets('invalid mobile number is rejected without calling link handler',
      (tester) async {
    var calls = 0;
    await tester.pumpWidget(MaterialApp(
      home: LinkContactPage(onLink: (_) async { calls++; }),
    ));

    await tester.tap(find.text('Link mobile number'));
    await tester.pumpAndSettle();

    expect(find.text('Enter a valid 10 digit mobile number.'), findsOneWidget);
    expect(calls, 0);

    await tester.enterText(find.byType(TextField), '5123456789');
    await tester.tap(find.text('Link mobile number'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid 10 digit mobile number.'), findsOneWidget);
    expect(calls, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('link request disables duplicate submission and recovers after failure',
      (tester) async {
    final pending = Completer<void>();
    String? submittedValue;
    await tester.pumpWidget(MaterialApp(
      home: LinkContactPage(onLink: (value) {
        submittedValue = value;
        return pending.future;
      }),
    ));

    await tester.enterText(find.byType(TextField), '9000000000');
    await tester.tap(find.text('Link mobile number'));
    await tester.pump();

    expect(submittedValue, '9000000000');
    expect(find.text('Linking…'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    expect(tester.widget<FilledButton>(
      find.ancestor(of: find.text('Linking…'), matching: find.byType(FilledButton)),
    ).onPressed, isNull);

    pending.completeError(StateError('simulated contact-link failure'));
    await tester.pumpAndSettle();

    expect(find.text('Unable to link this number. Please try again.'), findsOneWidget);
    expect(find.text('Link mobile number'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isTrue);
    expect(tester.takeException(), isNull);
  });
}

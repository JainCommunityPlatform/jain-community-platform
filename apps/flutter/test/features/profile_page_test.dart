import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/profile/data/profile_repository.dart';
import 'package:jain_community_platform/features/profile/data/user_profile.dart';
import 'package:jain_community_platform/features/profile/presentation/profile_page.dart';

class _ProfileRepository extends ProfileRepository {
  _ProfileRepository() : super(ApiClient(baseUrl: Uri.parse('https://example.test/')));

  int updates = 0;

  @override
  Future<UserProfile> get() async => const UserProfile(
        id: 'user-1',
        displayName: 'Arpit Jain',
        email: 'member@example.test',
        address: 'Pune',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411014',
        primaryPhone: '9000000000',
      );

  @override
  Future<List<UserActivity>> activities() async => const [];

  @override
  Future<UserProfile> update({
    String? displayName,
    String? address,
    String? city,
    String? state,
    String? postalCode,
  }) async {
    updates++;
    return UserProfile(
      id: 'user-1',
      displayName: displayName,
      email: 'member@example.test',
      address: address,
      city: city,
      state: state,
      postalCode: postalCode,
      primaryPhone: '9000000000',
    );
  }
}

void main() {
  testWidgets('profile opens read-only and edit is explicit', (tester) async {
    final repository = _ProfileRepository();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ProfilePage(repository: repository)),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Arpit Jain'), findsNWidgets(2));
    expect(find.text('Edit'), findsOneWidget);
    expect(find.text('Save profile'), findsNothing);
    final nameField = tester.widget<TextField>(
      find.byType(TextField).first,
    );
    expect(nameField.readOnly, isTrue);

    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    expect(find.text('Save profile'), findsOneWidget);
    expect(find.text('Cancel'), findsOneWidget);
  });

  testWidgets('profile exposes confirmed sign-out action', (tester) async {
    final repository = _ProfileRepository();
    var signedOut = false;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ProfilePage(
        repository: repository,
        onSignOut: () async { signedOut = true; },
      )),
    ));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Sign out'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Sign out?'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Sign out').last);
    await tester.pumpAndSettle();
    expect(signedOut, isTrue);
  });
}

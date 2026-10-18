import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/profile/data/profile_repository.dart';
import 'package:jain_community_platform/features/profile/data/user_profile.dart';
import 'package:jain_community_platform/features/profile/presentation/profile_page.dart';

class _ProfileRepository extends ProfileRepository {
  _ProfileRepository() : super(ApiClient(baseUrl: Uri.parse('https://example.test/')));

  UserProfile currentProfile = const UserProfile(
    id: 'user-1',
    displayName: 'Arpit Jain',
    email: 'member@example.test',
    address: 'Pune',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411014',
    primaryPhone: '9000000000',
  );
  int getCalls = 0;
  int updates = 0;
  bool failGet = false;
  bool failActivities = false;
  bool failUpdate = false;

  @override
  Future<UserProfile> get() async {
    getCalls++;
    if (failGet) throw StateError('simulated profile load failure');
    return currentProfile;
  }

  @override
  Future<List<UserActivity>> activities() async {
    if (failActivities) throw StateError('simulated activity load failure');
    return const [];
  }

  @override
  Future<UserProfile> update({
    String? displayName,
    String? address,
    String? city,
    String? state,
    String? postalCode,
  }) async {
    updates++;
    if (failUpdate) throw StateError('simulated profile save failure');
    currentProfile = UserProfile(
      id: 'user-1',
      displayName: displayName,
      email: 'member@example.test',
      address: address,
      city: city,
      state: state,
      postalCode: postalCode,
      primaryPhone: '9000000000',
    );
    return currentProfile;
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

    await tester.scrollUntilVisible(
      find.text('Sign out'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Sign out?'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Sign out').last);
    // The page intentionally shows an indeterminate spinner while sign-out
    // is in progress; pump once rather than waiting for all animations to stop.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(signedOut, isTrue);
  });

  testWidgets('cancel discards profile edits without calling update',
      (tester) async {
    final repository = _ProfileRepository();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ProfilePage(repository: repository)),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Name'),
      'Unsaved name',
    );
    await tester.ensureVisible(find.text('Cancel'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    expect(repository.updates, 0);
    expect(find.text('Save profile'), findsNothing);
    expect(tester.widget<TextField>(
      find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Name'),
    ).controller!.text, 'Arpit Jain');
    expect(tester.takeException(), isNull);
  });

  testWidgets('profile save trims values and returns fields to read-only mode',
      (tester) async {
    final repository = _ProfileRepository();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ProfilePage(repository: repository)),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Name'),
      '  New Member  ',
    );
    await tester.enterText(
      find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'City'),
      '  Nashik  ',
    );
    await tester.ensureVisible(find.text('Save profile'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save profile'));
    await tester.pumpAndSettle();

    expect(repository.updates, 1);
    expect(repository.currentProfile.displayName, 'New Member');
    expect(repository.currentProfile.city, 'Nashik');
    expect(find.text('Profile saved.'), findsOneWidget);
    expect(find.text('Save profile'), findsNothing);
    expect(tester.widget<TextField>(
      find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Name'),
    ).readOnly, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('profile save failure keeps edit mode and retry can succeed',
      (tester) async {
    final repository = _ProfileRepository()..failUpdate = true;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ProfilePage(repository: repository)),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Name'),
      'Updated Member',
    );
    await tester.ensureVisible(find.text('Save profile'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save profile'));
    await tester.pumpAndSettle();

    expect(find.text('Could not save your profile. Please try again.'), findsOneWidget);
    expect(find.text('Save profile'), findsOneWidget);
    expect(repository.updates, 1);

    repository.failUpdate = false;
    await tester.ensureVisible(find.text('Save profile'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save profile'));
    await tester.pumpAndSettle();
    expect(repository.updates, 2);
    expect(repository.currentProfile.displayName, 'Updated Member');
    expect(find.text('Profile saved.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('profile load failure can be retried and refresh reloads saved data',
      (tester) async {
    final repository = _ProfileRepository()..failGet = true;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ProfilePage(repository: repository)),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Retry'), findsOneWidget);

    repository.failGet = false;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('Arpit Jain'), findsNWidgets(2));
    expect(repository.getCalls, 2);

    repository.currentProfile = const UserProfile(
      id: 'user-1',
      displayName: 'Refreshed Member',
      email: 'member@example.test',
      address: 'Pune',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411014',
      primaryPhone: '9000000000',
    );
    await tester.drag(find.byType(ListView), const Offset(0, 500));
    await tester.pumpAndSettle();

    expect(repository.getCalls, 3);
    expect(find.text('Refreshed Member'), findsNWidgets(2));
    expect(tester.takeException(), isNull);
  });

}

import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/features/profile/data/registration_context.dart';

void main() {
  test('parses canonical profile and activities for a registration', () {
    final context = RegistrationContext.fromJson({
      'profile': {
        'id': 'u1',
        'displayName': 'Test User',
        'email': 'test@example.com',
        'primaryPhone': '9876543210',
        'phoneNumbers': ['9876543210'],
        'address': 'Pune',
        'city': 'Pune',
        'state': 'MH',
        'postalCode': '411001',
        'needsPhoneLink': false,
      },
      'activities': [
        {
          'id': 'a1',
          'eventType': 'KSHAMAWANI',
          'eventId': 'k26',
          'title': 'Kshamawani 2026',
          'participatedAt': '2026-09-01T10:00:00.000Z',
        },
      ],
    });

    expect(context.profile.id, 'u1');
    expect(context.profile.primaryPhone, '9876543210');
    expect(context.activities.single.eventId, 'k26');
  });

  test('rejects malformed responses', () {
    expect(
      () => RegistrationContext.fromJson({'profile': {}, 'activities': {}}),
      throwsA(isA<FormatException>()),
    );
  });
}

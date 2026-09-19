import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/core/api/api_exception.dart';
import 'package:jain_community_platform/core/session/auth_session_service.dart';

void main() {
  test('loads the current session from auth/me', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/auth/me');
      return http.Response(
        jsonEncode({
          'userId': 'user-123',
          'email': 'member@example.com',
          'displayName': 'Community Member',
          'tenantId': 'tenant-123',
          'role': 'CONTENT_MANAGER',
        }),
        200,
      );
    });

    final service = AuthSessionService(
      ApiClient(
        baseUrl: Uri.parse('https://example.test/'),
        client: client,
      ),
    );

    final session = await service.loadCurrentSession();

    expect(session.isAuthenticated, isTrue);
    expect(session.userId, 'user-123');
    expect(session.role, 'CONTENT_MANAGER');
    expect(session.isAdmin, isFalse);
    expect(session.isFinance, isFalse);
  });

  test('propagates API failures from auth/me', () async {
    final client = MockClient((_) async {
      return http.Response(
        jsonEncode({'statusCode': 401, 'message': 'Unauthorized'}),
        401,
      );
    });

    final service = AuthSessionService(
      ApiClient(
        baseUrl: Uri.parse('https://example.test/'),
        client: client,
      ),
    );

    expect(
      service.loadCurrentSession(),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 401)
            .having((error) => error.message, 'message', 'Unauthorized'),
      ),
    );
  });
}

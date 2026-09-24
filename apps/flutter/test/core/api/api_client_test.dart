import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/core/api/api_exception.dart';

void main() {
  test('adds bearer token and decodes JSON', () async {
    final client = MockClient((request) async {
      expect(request.headers['authorization'], 'Bearer token-123');
      expect(request.method, 'GET');
      expect(request.url.path, '/api/health');
      return http.Response(jsonEncode({'status': 'ok'}), 200);
    });

    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      accessTokenProvider: () async => 'token-123',
      client: client,
    );

    expect(await api.getObject('/api/health'), {'status': 'ok'});
  });

  test('invokes the unauthorized handler before surfacing a 401', () async {
    var unauthorizedCalls = 0;
    final client = MockClient((_) async {
      return http.Response(
        jsonEncode({'statusCode': 401, 'message': 'Unauthorized'}),
        401,
      );
    });

    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      onUnauthorized: () async {
        unauthorizedCalls++;
      },
      client: client,
    );

    await expectLater(
      api.getObject('/api/protected'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 401)
            .having((error) => error.message, 'message', 'Unauthorized'),
      ),
    );
    expect(unauthorizedCalls, 1);
  });

  test('surfaces API errors with status and message', () async {
    final client = MockClient((_) async {
      return http.Response(
        jsonEncode({'statusCode': 403, 'message': 'Permission denied'}),
        403,
      );
    });

    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      client: client,
    );

    expect(
      () => api.getObject('/api/tenant/members'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 403)
            .having((e) => e.message, 'message', 'Permission denied'),
      ),
    );
  });

  test('times out a request instead of waiting forever', () async {
    final client = MockClient((_) async {
      await Future<void>.delayed(const Duration(milliseconds: 100));
      return http.Response(jsonEncode({'status': 'late'}), 200);
    });

    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      requestTimeout: const Duration(milliseconds: 10),
      client: client,
    );

    await expectLater(
      api.getObject('/api/auth/me'),
      throwsA(isA<TimeoutException>()),
    );
  });
}

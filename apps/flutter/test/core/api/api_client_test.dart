import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../../../lib/core/api/api_client.dart';
import '../../../lib/core/api/api_exception.dart';

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
}

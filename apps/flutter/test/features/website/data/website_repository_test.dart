import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/website/data/website_repository.dart';

void main() {
  test('reads and updates the shared tenant website configuration without server fields', () async {
    final client = MockClient((request) async {
      if (request.method == 'GET') {
        return http.Response(jsonEncode({
          'tenantId': 't1',
          'version': 7,
          'hero': {'title': 'Temple One'},
        }), 200);
      }
      expect(request.method, 'PUT');
      final payload = jsonDecode(request.body) as Map<String, dynamic>;
      expect(payload.containsKey('tenantId'), isFalse);
      expect(payload.containsKey('version'), isFalse);
      expect(payload['hero'], {'title': 'Updated'});
      expect(payload['theme'], {'primary': '#F57C00'});
      return http.Response(jsonEncode({
        'tenantId': 't1',
        'version': 8,
        'hero': {'title': 'Updated'},
      }), 200);
    });

    final repository = WebsiteRepository(
      ApiClient(
        baseUrl: Uri.parse('https://example.test/'),
        client: client,
        tenantIdProvider: () => 't1',
      ),
    );

    expect((await repository.getSite())['hero']['title'], 'Temple One');
    expect((await repository.updateSite({
      'tenantId': 't1',
      'version': 7,
      'hero': {'title': 'Updated'},
      'theme': {'primary': '#F57C00'},
    }))['hero']['title'], 'Updated');
  });
}

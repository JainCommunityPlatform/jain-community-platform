import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/website/data/website_repository.dart';

void main() {
  test('reads and updates the shared tenant website configuration', () async {
    final client = MockClient((request) async {
      if (request.method == 'GET') {
        return http.Response(jsonEncode({
          'tenantId': 't1',
          'hero': {'title': 'Temple One'},
        }), 200);
      }
      expect(request.method, 'PUT');
      return http.Response(jsonEncode({
        'tenantId': 't1',
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
      'hero': {'title': 'Updated'},
    }))['hero']['title'], 'Updated');
  });
}

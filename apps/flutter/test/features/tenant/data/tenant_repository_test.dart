import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/tenant/data/tenant_repository.dart';

void main() {
  test('lists central temples and resolves a custom host', () async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/directory/temples') {
        return http.Response(jsonEncode([
          {
            'id': 't1',
            'slug': 'temple-one',
            'name': 'Temple One',
            'hostname': 'temple-one.jcp.example',
            'city': 'Pune',
          },
        ]), 200);
      }
      return http.Response(jsonEncode({
        'id': 't1',
        'name': 'Temple One',
        'hostname': 'temple-one.jcp.example',
      }), 200);
    });

    final repository = TenantRepository(
      ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client),
    );

    expect((await repository.listTemples()).single.name, 'Temple One');
    expect(
      (await repository.resolveHost('temple-one.jcp.example'))?.id,
      't1',
    );
  });
}

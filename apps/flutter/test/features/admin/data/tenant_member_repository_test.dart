import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/admin/data/tenant_member_repository.dart';

void main() {
  test('lists tenant members from the API', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/tenant/members');
      return http.Response(
        jsonEncode([
          {
            'id': 'membership-1',
            'userId': 'user-1',
            'role': 'TENANT_ADMIN',
            'email': 'admin@example.com',
            'displayName': 'Community Admin',
          }
        ]),
        200,
      );
    });

    final repository = TenantMemberRepository(
      ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client),
    );

    final members = await repository.list();

    expect(members, hasLength(1));
    expect(members.single.role, 'TENANT_ADMIN');
    expect(members.single.displayName, 'Community Admin');
  });
}

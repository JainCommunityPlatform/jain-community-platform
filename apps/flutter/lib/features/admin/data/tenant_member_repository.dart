import '../../../core/api/api_client.dart';
import 'tenant_member.dart';

class TenantMemberRepository {
  const TenantMemberRepository(this.api);

  final ApiClient api;

  Future<List<TenantMember>> list() async {
    final response = await api.getList('/api/tenant/members');
    return response
        .map((item) => TenantMember.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<TenantMember> get(String userId) async {
    return TenantMember.fromJson(
      await api.getObject('/api/tenant/members/$userId'),
    );
  }

  Future<TenantMember> create({
    required String userId,
    required String role,
  }) async {
    return TenantMember.fromJson(
      await api.post(
        '/api/tenant/members',
        body: {'userId': userId, 'role': role},
      ),
    );
  }

  Future<TenantMember> updateRole({
    required String userId,
    required String role,
  }) async {
    return TenantMember.fromJson(
      await api.patch(
        '/api/tenant/members/$userId',
        body: {'role': role},
      ),
    );
  }

  Future<void> remove(String userId) {
    return api.delete('/api/tenant/members/$userId');
  }
}

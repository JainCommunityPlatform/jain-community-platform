import 'dart:typed_data';

import '../../../core/api/api_client.dart';

class WebsiteRepository {
  const WebsiteRepository(this.api);

  final ApiClient api;

  Future<Map<String, dynamic>> getSite() => api.getObject('/api/website/site');

  Future<Map<String, dynamic>> updateSite(Map<String, dynamic> config) {
    return api.put('/api/website/site', body: config);
  }

  Future<Map<String, dynamic>> resetSite() {
    return api.post('/api/website/site/reset');
  }

  Future<List<dynamic>> listTenantMemberships() => api.getList('/api/memberships');

  Future<Map<String, dynamic>> assignTenantRoles({
    required String email,
    required List<String> roles,
  }) {
    return api.post('/api/memberships/roles', body: {
      'email': email,
      'roles': roles,
    });
  }

  Future<String> uploadImage(Uint8List bytes, String filename) async {
    final result = await api.uploadImage(
      '/api/website/media',
      bytes: bytes,
      filename: filename,
    );
    return result['url'] as String;
  }
}

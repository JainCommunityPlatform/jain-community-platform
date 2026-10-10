import 'dart:typed_data';

import '../../../core/api/api_client.dart';

class WebsiteRepository {
  const WebsiteRepository(this.api);

  final ApiClient api;

  Future<Map<String, dynamic>> getSite() => api.getObject('/api/website/site');

  Future<Map<String, dynamic>> updateSite(Map<String, dynamic> config) {
    // The API DTO intentionally accepts only editable website sections.
    // A GET response also contains server-owned fields such as tenantId/version;
    // forwarding those fields triggers the global forbidNonWhitelisted 400.
    const editableFields = [
      'theme',
      'header',
      'hero',
      'quickInfo',
      'about',
      'templeDirectory',
      'events',
      'gallery',
      'seva',
      'contact',
      'footer',
      '_versionNote',
      'publish',
    ];
    final payload = <String, dynamic>{
      for (final field in editableFields)
        if (config.containsKey(field)) field: config[field],
    };
    return api.put('/api/website/site', body: payload);
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

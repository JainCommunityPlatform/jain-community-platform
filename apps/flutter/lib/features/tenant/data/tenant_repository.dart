import '../../../core/api/api_client.dart';
import '../../../core/tenant/tenant_context.dart';

class TenantSummary {
  const TenantSummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.hostname,
    this.city,
    this.state,
    this.address,
    this.primaryImageUrl,
  });

  final String id;
  final String slug;
  final String name;
  final String hostname;
  final String? city;
  final String? state;
  final String? address;
  final String? primaryImageUrl;

  factory TenantSummary.fromJson(Map<String, dynamic> json) {
    return TenantSummary(
      id: json['id'] as String,
      slug: json['slug'] as String? ?? '',
      name: json['name'] as String? ?? '',
      hostname: json['hostname'] as String? ?? '',
      city: json['city'] as String?,
      state: json['state'] as String?,
      address: json['address'] as String?,
      primaryImageUrl: json['primaryImageUrl'] as String?,
    );
  }

  TenantContext toContext() => TenantContext(
        id: id,
        name: name,
        hostname: hostname,
      );
}

class TenantRepository {
  const TenantRepository(this.api);

  final ApiClient api;

  Future<List<TenantSummary>> listTemples() async {
    final items = await api.getList('/api/directory/temples');
    return items
        .map((item) => TenantSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<TenantContext?> resolveHost(String hostname) async {
    if (hostname.isEmpty) return null;
    try {
      final json = await api.getObject(
        '/api/tenant/resolve?hostname=${Uri.encodeQueryComponent(hostname)}',
      );
      return TenantContext(
        id: json['id'] as String,
        name: json['name'] as String,
        hostname: json['hostname'] as String,
      );
    } catch (_) {
      return null;
    }
  }
}

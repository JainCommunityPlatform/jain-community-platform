import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/tenant/tenant_context.dart';

void main() {
  test('stores a resolved tenant context without hardcoded tenant routing', () {
    const tenant = TenantContext(
      id: 'tenant-1',
      name: 'Temple One',
      hostname: 'temple.example.com',
    );

    expect(tenant.id, 'tenant-1');
    expect(tenant.name, 'Temple One');
    expect(tenant.hostname, 'temple.example.com');
  });
}

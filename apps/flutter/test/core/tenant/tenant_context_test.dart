import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/tenant/tenant_context.dart';

void main() {
  const resolver = TenantResolver();

  test('resolves the Bade Baba Kharadi custom domain', () {
    final tenant = resolver.resolve(
      Uri.parse('https://badebabakharadi.com/events/chaturmas'),
    );

    expect(tenant?.id, 'bade-baba-kharadi');
    expect(tenant?.name, 'Bade Baba Kharadi');
    expect(tenant?.hostname, 'badebabakharadi.com');
  });

  test('does not invent a tenant for an unknown host', () {
    expect(resolver.resolve(Uri.parse('https://example.com')), isNull);
  });
}

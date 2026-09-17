class TenantContext {
  const TenantContext({
    required this.id,
    required this.name,
    required this.hostname,
  });

  final String id;
  final String name;
  final String hostname;
}

class TenantResolver {
  const TenantResolver();

  TenantContext? resolve(Uri uri) {
    final host = uri.host.toLowerCase();

    if (host == 'badebabakharadi.com' ||
        host == 'www.badebabakharadi.com') {
      return const TenantContext(
        id: 'bade-baba-kharadi',
        name: 'Bade Baba Kharadi',
        hostname: 'badebabakharadi.com',
      );
    }

    // Development hosts intentionally have no tenant until the backend/domain
    // resolver is connected. This prevents the client from inventing tenancy.
    return null;
  }
}

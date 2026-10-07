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

enum AppRole {
  member,
  admin,
  finance,
}

class AppSession {
  const AppSession({
    this.isAuthenticated = false,
    this.tenantId,
    this.roles = const <AppRole>{},
  });

  final bool isAuthenticated;
  final String? tenantId;
  final Set<AppRole> roles;

  bool get isAdmin => roles.contains(AppRole.admin);
  bool get isFinance => roles.contains(AppRole.finance);
}

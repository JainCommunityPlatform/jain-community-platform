enum AppRole { member, admin, finance }

class AppSession {
  const AppSession({
    this.isAuthenticated = false,
    this.userId,
    this.email,
    this.displayName,
    this.tenantId,
    this.role,
    this.roles = const [],
    this.needsPhoneLink = false,
    this.platformRoles = const [],
  });

  final bool isAuthenticated;
  final String? userId;
  final String? email;
  final String? displayName;
  final String? tenantId;
  final String? role;
  final List<String> roles;
  final bool needsPhoneLink;
  final List<String> platformRoles;

  Set<String> get effectiveRoles => {...roles, if (role != null) role!};
  bool get isAdmin => effectiveRoles.contains('TENANT_ADMIN');
  bool get isPlatformAdmin => platformRoles.contains('PLATFORM_ADMIN');
  bool get isFinance => effectiveRoles.intersection(const {
    'TENANT_FINANCE',
    'FINANCE_VIEWER',
    'FINANCE_OPERATOR',
    'FINANCE_APPROVER',
    'TENANT_ADMIN',
  }).isNotEmpty;
  bool get isInventory => effectiveRoles.intersection(const {
    'INVENTORY_VIEWER',
    'INVENTORY_OPERATOR',
    'INVENTORY_MANAGER',
    'TENANT_ADMIN',
  }).isNotEmpty;

  factory AppSession.fromAuthMe(Map<String, dynamic> json) {
    final userId = json['userId'] as String?;
    return AppSession(
      isAuthenticated: userId != null && userId.isNotEmpty,
      userId: userId,
      email: json['email'] as String?,
      displayName: json['displayName'] as String?,
      tenantId: json['tenantId'] as String?,
      role: json['role'] as String?,
      roles: (json['roles'] as List<dynamic>? ??
              json['tenantRoles'] as List<dynamic>? ??
              const [])
          .map((item) => item.toString())
          .toList(),
      needsPhoneLink: json['needsPhoneLink'] as bool? ?? false,
      platformRoles: (json['platformRoles'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
    );
  }

  static const signedOut = AppSession();
}

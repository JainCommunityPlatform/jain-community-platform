enum AppRole { member, admin, finance }

class AppSession {
  const AppSession({
    this.isAuthenticated = false,
    this.userId,
    this.email,
    this.displayName,
    this.tenantId,
    this.role,
  });

  final bool isAuthenticated;
  final String? userId;
  final String? email;
  final String? displayName;
  final String? tenantId;
  final String? role;

  bool get isAdmin => role == 'TENANT_ADMIN';
  bool get isFinance => const {
    'FINANCE_VIEWER',
    'FINANCE_OPERATOR',
    'FINANCE_APPROVER',
    'TENANT_ADMIN',
  }.contains(role);

  factory AppSession.fromAuthMe(Map<String, dynamic> json) {
    final userId = json['userId'] as String?;
    return AppSession(
      isAuthenticated: userId != null && userId.isNotEmpty,
      userId: userId,
      email: json['email'] as String?,
      displayName: json['displayName'] as String?,
      tenantId: json['tenantId'] as String?,
      role: json['role'] as String?,
    );
  }

  static const signedOut = AppSession();
}

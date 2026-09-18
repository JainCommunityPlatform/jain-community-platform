class TenantMember {
  const TenantMember({
    required this.id,
    required this.userId,
    required this.role,
    this.email,
    this.displayName,
  });

  final String id;
  final String userId;
  final String role;
  final String? email;
  final String? displayName;

  factory TenantMember.fromJson(Map<String, dynamic> json) {
    return TenantMember(
      id: json['id'] as String,
      userId: json['userId'] as String,
      role: json['role'] as String,
      email: json['email'] as String?,
      displayName: json['displayName'] as String?,
    );
  }
}

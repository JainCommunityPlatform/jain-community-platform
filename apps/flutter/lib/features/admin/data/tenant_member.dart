class TenantMember {
  const TenantMember({
    required this.id,
    required this.userId,
    required this.role,
    this.email,
    this.displayName,
    this.primaryPhone,
  });

  final String id;
  final String userId;
  final String role;
  final String? email;
  final String? displayName;
  final String? primaryPhone;

  factory TenantMember.fromJson(Map<String, dynamic> json) {
    return TenantMember(
      id: json['id'] as String,
      userId: json['userId'] as String,
      role: json['role'] as String,
      email: json['email'] as String?,
      displayName: json['displayName'] as String?,
      primaryPhone: json['primaryPhone'] as String?,
    );
  }
}

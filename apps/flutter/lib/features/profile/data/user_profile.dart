class UserProfile {
  const UserProfile({
    required this.id,
    this.displayName,
    this.email,
    this.primaryPhone,
    this.phoneNumbers = const [],
    this.address,
    this.city,
    this.state,
    this.postalCode,
    this.needsPhoneLink = false,
  });
  final String id;
  final String? displayName;
  final String? email;
  final String? primaryPhone;
  final List<String> phoneNumbers;
  final String? address;
  final String? city;
  final String? state;
  final String? postalCode;
  final bool needsPhoneLink;
  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    displayName: json['displayName'] as String?,
    email: json['email'] as String?,
    primaryPhone: json['primaryPhone'] as String?,
    phoneNumbers: (json['phoneNumbers'] as List<dynamic>? ?? const []).cast<String>(),
    address: json['address'] as String?,
    city: json['city'] as String?,
    state: json['state'] as String?,
    postalCode: json['postalCode'] as String?,
    needsPhoneLink: json['needsPhoneLink'] as bool? ?? false,
  );
}
class UserActivity {
  const UserActivity({required this.eventType, required this.eventId, required this.title, required this.participatedAt});
  final String eventType;
  final String eventId;
  final String title;
  final DateTime participatedAt;
  factory UserActivity.fromJson(Map<String, dynamic> json) => UserActivity(
    eventType: json['eventType'] as String,
    eventId: json['eventId'] as String,
    title: json['title'] as String,
    participatedAt: DateTime.parse(json['participatedAt'] as String),
  );
}

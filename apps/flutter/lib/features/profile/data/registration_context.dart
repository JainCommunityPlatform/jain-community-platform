import 'user_profile.dart';

class RegistrationContext {
  const RegistrationContext({
    required this.profile,
    required this.activities,
  });

  final UserProfile profile;
  final List<UserActivity> activities;

  factory RegistrationContext.fromJson(Map<String, dynamic> json) {
    final profileJson = json['profile'];
    final activitiesJson = json['activities'];
    if (profileJson is! Map<String, dynamic> ||
        activitiesJson is! List<dynamic>) {
      throw const FormatException('Invalid registration context response');
    }

    return RegistrationContext(
      profile: UserProfile.fromJson(profileJson),
      activities: activitiesJson
          .map((item) => UserActivity.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
    );
  }
}

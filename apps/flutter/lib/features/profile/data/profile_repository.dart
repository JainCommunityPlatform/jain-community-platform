import '../../../core/api/api_client.dart';
import 'user_profile.dart';

class ProfileRepository {
  const ProfileRepository(this.api);
  final ApiClient api;
  Future<UserProfile> get() async => UserProfile.fromJson(await api.getObject('/api/profile'));
  Future<UserProfile> update({String? displayName, String? address, String? city, String? state, String? postalCode}) async {
    return UserProfile.fromJson(await api.patch('/api/profile', body: {
      if (displayName != null) 'displayName': displayName,
      if (address != null) 'address': address,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      if (postalCode != null) 'postalCode': postalCode,
    }));
  }
  Future<UserProfile> linkContact(String value) async => UserProfile.fromJson(await api.post('/api/profile/contact', body: {'value': value}));
  Future<List<UserActivity>> activities() async {
    final response = await api.getList('/api/profile/activities');
    return response.map((item) => UserActivity.fromJson(item as Map<String, dynamic>)).toList();
  }
}

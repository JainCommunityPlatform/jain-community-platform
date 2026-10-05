import '../api/api_client.dart';
import 'app_session.dart';
import '../../features/profile/data/user_profile.dart';

class AuthSessionService {
  const AuthSessionService(this.api);

  final ApiClient api;

  Future<AppSession> loadCurrentSession() async {
    final response = await api.getObject('/api/auth/me');
    final session = AppSession.fromAuthMe(response);
    final profile = UserProfile.fromJson(await api.getObject('/api/profile'));
    return AppSession(
      isAuthenticated: session.isAuthenticated,
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
      tenantId: session.tenantId,
      role: session.role,
      needsPhoneLink: profile.needsPhoneLink,
    );
  }

  Future<void> linkContact(String value) async {
    await api.post('/api/profile/contact', body: {'value': value});
  }
}

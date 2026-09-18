import '../api/api_client.dart';
import 'app_session.dart';

class AuthSessionService {
  const AuthSessionService(this.api);

  final ApiClient api;

  Future<AppSession> loadCurrentSession() async {
    final response = await api.getObject('/api/auth/me');
    return AppSession.fromAuthMe(response);
  }
}

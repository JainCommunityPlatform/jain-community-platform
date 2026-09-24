import 'dart:async';

import 'package:flutter/foundation.dart';

import '../auth/firebase_auth_provider.dart';
import 'app_session.dart';
import 'auth_session_service.dart';

enum AppSessionStatus {
  initializing,
  signedOut,
  authenticated,
  error,
}

class AppSessionController extends ChangeNotifier {
  AppSessionController({
    required FirebaseAuthProvider auth,
    required AuthSessionService sessionService,
    this.sessionLoadTimeout = const Duration(seconds: 20),
  })  : _auth = auth,
        _sessionService = sessionService;

  final FirebaseAuthProvider _auth;
  final AuthSessionService _sessionService;
  final Duration sessionLoadTimeout;

  AppSessionStatus _status = AppSessionStatus.initializing;
  AppSession _session = AppSession.signedOut;
  Object? _error;
  StreamSubscription<FirebaseAuthUser?>? _subscription;

  AppSessionStatus get status => _status;
  AppSession get session => _session;
  Object? get error => _error;

  bool get isReady =>
      _status == AppSessionStatus.signedOut ||
      _status == AppSessionStatus.authenticated ||
      _status == AppSessionStatus.error;

  Future<void> initialize() async {
    await _subscription?.cancel();
    _subscription = _auth.authStateChanges().listen(
      (user) {
        unawaited(_handleAuthState(user));
      },
      onError: (Object error, StackTrace stackTrace) {
        _setError(error);
      },
    );
  }

  Future<void> _handleAuthState(FirebaseAuthUser? user) async {
    if (user == null) {
      _session = AppSession.signedOut;
      _error = null;
      _status = AppSessionStatus.signedOut;
      notifyListeners();
      return;
    }

    _status = AppSessionStatus.initializing;
    _error = null;
    notifyListeners();

    try {
      _session = await _sessionService
          .loadCurrentSession()
          .timeout(sessionLoadTimeout);
      if (!_session.isAuthenticated) {
        await _auth.signOut();
        _session = AppSession.signedOut;
        _status = AppSessionStatus.signedOut;
      } else {
        _status = AppSessionStatus.authenticated;
      }
    } catch (error) {
      _session = AppSession.signedOut;
      _error = error;
      _status = AppSessionStatus.error;
    }

    notifyListeners();
  }

  Future<void> signInWithGoogle() async {
    _status = AppSessionStatus.initializing;
    _error = null;
    notifyListeners();

    try {
      await _auth.signInWithGoogle();
    } catch (error) {
      _setError(error);
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  void _setError(Object error) {
    _session = AppSession.signedOut;
    _error = error;
    _status = AppSessionStatus.error;
    notifyListeners();
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}

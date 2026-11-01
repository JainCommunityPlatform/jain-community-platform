import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/api_exception.dart';
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
    AppSession initialSession = AppSession.signedOut,
    this.sessionLoadTimeout = const Duration(seconds: 20),
    this.googleSignInTimeout = const Duration(seconds: 35),
  })  : _auth = auth,
        _sessionService = sessionService,
        _session = initialSession,
        _status = initialSession.isAuthenticated
            ? AppSessionStatus.authenticated
            : AppSessionStatus.signedOut;

  final FirebaseAuthProvider _auth;
  final AuthSessionService _sessionService;
  final Duration sessionLoadTimeout;
  final Duration googleSignInTimeout;

  AppSessionStatus _status = AppSessionStatus.initializing;
  AppSession _session = AppSession.signedOut;
  Object? _error;
  StreamSubscription<FirebaseAuthUser?>? _subscription;
  int _sessionGeneration = 0;

  AppSessionStatus get status => _status;
  AppSession get session => _session;
  Object? get error => _error;

  bool get isReady =>
      _status == AppSessionStatus.signedOut ||
      _status == AppSessionStatus.authenticated ||
      _status == AppSessionStatus.error;

  Future<void> initialize() async {
    // Invalidate work started by a previous subscription before replacing it.
    _sessionGeneration++;
    await _subscription?.cancel();
    _subscription = _auth.authStateChanges().listen(
      (user) {
        unawaited(_handleAuthState(user));
      },
      onError: (Object error, StackTrace stackTrace) {
        _sessionGeneration++;
        _setError(error);
      },
    );
  }

  Future<void> _handleAuthState(FirebaseAuthUser? user) async {
    // Every auth-state event supersedes any older asynchronous session load.
    final generation = ++_sessionGeneration;
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
      final session = await _sessionService
          .loadCurrentSession()
          .timeout(sessionLoadTimeout);
      if (generation != _sessionGeneration) return;

      _session = session;
      if (!_session.isAuthenticated) {
        await _auth.signOut();
        if (generation != _sessionGeneration) return;
        _session = AppSession.signedOut;
        _status = AppSessionStatus.signedOut;
      } else {
        _status = AppSessionStatus.authenticated;
      }
    } catch (error) {
      if (generation != _sessionGeneration) return;
      _session = AppSession.signedOut;
      if (error is ApiException && error.statusCode == 401) {
        // Firebase can restore a locally cached user before the backend
        // rejects a revoked ID token. Clear that local credential too.
        await _auth.signOut();
        if (generation != _sessionGeneration) return;
        _error = null;
        _status = AppSessionStatus.signedOut;
      } else {
        _error = error is TimeoutException
            ? error
            : StateError('JCP session: $error');
        _status = AppSessionStatus.error;
      }
    }

    if (generation != _sessionGeneration) return;
    notifyListeners();
  }

  Future<void> refreshCurrentSession() async {
    if (!_auth.isSignedIn) return;
    final generation = ++_sessionGeneration;
    _status = AppSessionStatus.initializing;
    _error = null;
    notifyListeners();
    try {
      final session = await _sessionService
          .loadCurrentSession()
          .timeout(sessionLoadTimeout);
      if (generation != _sessionGeneration) return;
      _session = session;
      _status = _session.isAuthenticated
          ? AppSessionStatus.authenticated
          : AppSessionStatus.signedOut;
    } catch (error) {
      if (generation != _sessionGeneration) return;
      // A 401 means the backend no longer accepts this Firebase identity
      // (for example, the ID token was revoked). Clear the local Firebase
      // session as well; transient failures must not force a sign-out.
      if (error is ApiException && error.statusCode == 401) {
        await _auth.signOut();
        if (generation != _sessionGeneration) return;
        _session = AppSession.signedOut;
        _error = null;
        _status = AppSessionStatus.signedOut;
      } else {
        _setError(error);
        return;
      }
    }
    if (generation == _sessionGeneration) notifyListeners();
  }

  Future<void> signInWithGoogle() async {
    final generation = ++_sessionGeneration;
    _status = AppSessionStatus.initializing;
    _error = null;
    notifyListeners();

    try {
      await _auth.signInWithGoogle().timeout(googleSignInTimeout);
    } catch (error) {
      if (generation != _sessionGeneration) return;
      _setError(
        error is TimeoutException
            ? error
            : StateError('Google authentication: $error'),
      );
    }
  }

  Future<void> linkContact(String value) async {
    final generation = ++_sessionGeneration;
    _status = AppSessionStatus.initializing;
    _error = null;
    notifyListeners();
    try {
      await _sessionService.linkContact(value);
      if (generation != _sessionGeneration) return;
      final session = await _sessionService.loadCurrentSession();
      if (generation != _sessionGeneration) return;
      _session = session;
      _status = AppSessionStatus.authenticated;
    } catch (error) {
      if (generation != _sessionGeneration) return;
      _setError(error);
      return;
    }
    if (generation == _sessionGeneration) notifyListeners();
  }

  Future<void> signOut() async {
    // A pending restore/refresh must not be able to re-authenticate after this
    // sign-out request. The auth-state event will publish the signed-out state.
    _sessionGeneration++;
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
    _sessionGeneration++;
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}

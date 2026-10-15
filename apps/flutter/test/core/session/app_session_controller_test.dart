import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/core/api/api_exception.dart';
import 'package:jain_community_platform/core/auth/firebase_auth_provider.dart';
import 'package:jain_community_platform/core/session/app_session.dart';
import 'package:jain_community_platform/core/session/app_session_controller.dart';
import 'package:jain_community_platform/core/session/auth_session_service.dart';

class FakeFirebaseAuthProvider implements FirebaseAuthProvider {
  FakeFirebaseAuthProvider({
    this.signInDelay = Duration.zero,
    bool initiallySignedIn = false,
  }) : _isSignedIn = initiallySignedIn;

  final Duration signInDelay;
  final controller = StreamController<FirebaseAuthUser?>.broadcast();
  bool _isSignedIn;
  int signOutCount = 0;

  @override
  bool get isSignedIn => _isSignedIn;

  @override
  Stream<FirebaseAuthUser?> authStateChanges() => controller.stream;

  @override
  Future<String?> getIdToken() async => 'test-token';

  @override
  Future<void> signInWithGoogle() async {
    if (signInDelay > Duration.zero) {
      await Future<void>.delayed(signInDelay);
    }
    emit(const FirebaseAuthUser(uid: 'firebase-uid'));
  }

  @override
  Future<void> signOut() async {
    signOutCount++;
    emit(null);
  }

  void emit(FirebaseAuthUser? user) {
    _isSignedIn = user != null;
    controller.add(user);
  }

  Future<void> dispose() => controller.close();
}

class RestoredFirebaseAuthProvider implements FirebaseAuthProvider {
  RestoredFirebaseAuthProvider(this.user);

  final FirebaseAuthUser? user;

  @override
  bool get isSignedIn => user != null;

  @override
  Stream<FirebaseAuthUser?> authStateChanges() => Stream.value(user);

  @override
  Future<String?> getIdToken() async => 'restored-token';

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signOut() async {}
}

class FakeAuthSessionService extends AuthSessionService {
  FakeAuthSessionService(this.loader)
      : super(ApiClient(baseUrl: Uri.parse('https://example.test/')));

  final Future<AppSession> Function() loader;

  @override
  Future<AppSession> loadCurrentSession() => loader();
}

void main() {
  test('restores the backend session when Firebase already has a user at startup',
      () async {
    final auth = RestoredFirebaseAuthProvider(
      const FirebaseAuthUser(
        uid: 'firebase-uid',
        email: 'restored-admin@example.com',
      ),
    );
    var sessionLoadCount = 0;
    final service = FakeAuthSessionService(() async {
      sessionLoadCount++;
      return const AppSession(
        isAuthenticated: true,
        userId: 'restored-user-123',
        tenantId: 'restored-tenant-123',
        role: 'TENANT_ADMIN',
        roles: ['EVENT_MANAGER'],
      );
    });
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(sessionLoadCount, 1);
    expect(controller.status, AppSessionStatus.authenticated);
    expect(controller.session.userId, 'restored-user-123');
    expect(controller.session.tenantId, 'restored-tenant-123');
    expect(controller.session.isAdmin, isTrue);
    expect(controller.session.roles, ['EVENT_MANAGER']);

    controller.dispose();
  });

  test('starts signed out when Firebase emits no user', () async {
    final auth = FakeFirebaseAuthProvider();
    final service = FakeAuthSessionService(
      () async => throw StateError('should not load backend session'),
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    auth.emit(null);
    await Future<void>.delayed(Duration.zero);

    expect(controller.status, AppSessionStatus.signedOut);
    expect(controller.session, AppSession.signedOut);

    controller.dispose();
    await auth.dispose();
  });

  test('loads the backend session after Firebase authentication', () async {
    final auth = FakeFirebaseAuthProvider();
    final service = FakeAuthSessionService(
      () async => const AppSession(
        isAuthenticated: true,
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'TENANT_ADMIN',
      ),
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    auth.emit(
      const FirebaseAuthUser(
        uid: 'firebase-uid',
        email: 'admin@example.com',
      ),
    );
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(controller.status, AppSessionStatus.authenticated);
    expect(controller.session.userId, 'user-123');
    expect(controller.session.tenantId, 'tenant-123');
    expect(controller.session.isAdmin, isTrue);

    controller.dispose();
    await auth.dispose();
  });

  test('clears Firebase credentials when refresh says the backend session is unauthorized', () async {
    final auth = FakeFirebaseAuthProvider();
    var loadCount = 0;
    final service = FakeAuthSessionService(() async {
      loadCount++;
      if (loadCount == 1) {
        return const AppSession(
          isAuthenticated: true,
          userId: 'user-123',
          tenantId: 'tenant-123',
          role: 'TENANT_ADMIN',
        );
      }
      throw const ApiException(statusCode: 401, message: 'Unauthorized');
    });
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    auth.emit(const FirebaseAuthUser(uid: 'firebase-uid'));
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(controller.status, AppSessionStatus.authenticated);
    expect(auth.isSignedIn, isTrue);

    await controller.refreshCurrentSession();
    await Future<void>.delayed(Duration.zero);

    expect(auth.signOutCount, 1);
    expect(auth.isSignedIn, isFalse);
    expect(controller.status, AppSessionStatus.signedOut);
    expect(controller.session, AppSession.signedOut);
    expect(controller.error, isNull);

    controller.dispose();
    await auth.dispose();
  });

  test('enters error state when the backend session cannot be loaded', () async {
    final auth = FakeFirebaseAuthProvider();
    final service = FakeAuthSessionService(
      () async => throw StateError('backend unavailable'),
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    auth.emit(
      const FirebaseAuthUser(
        uid: 'firebase-uid',
        email: 'member@example.com',
      ),
    );
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(controller.status, AppSessionStatus.error);
    expect(controller.session, AppSession.signedOut);
    expect(controller.error, isA<StateError>());

    controller.dispose();
    await auth.dispose();
  });

  test('fails the session handshake instead of waiting forever', () async {
    final auth = FakeFirebaseAuthProvider();
    final service = FakeAuthSessionService(
      () async {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        return const AppSession(
          isAuthenticated: true,
          userId: 'user-123',
        );
      },
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
      sessionLoadTimeout: const Duration(milliseconds: 10),
    );

    await controller.initialize();
    auth.emit(const FirebaseAuthUser(uid: 'firebase-uid'));
    await Future<void>.delayed(const Duration(milliseconds: 30));

    expect(controller.status, AppSessionStatus.error);
    expect(controller.session, AppSession.signedOut);
    expect(controller.error, isA<TimeoutException>());

    controller.dispose();
    await auth.dispose();
  });

  test('fails Google sign-in instead of leaving the button loading forever', () async {
    final auth = FakeFirebaseAuthProvider(
      signInDelay: const Duration(milliseconds: 100),
    );
    final service = FakeAuthSessionService(
      () async => const AppSession(isAuthenticated: true, userId: 'user-123'),
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
      googleSignInTimeout: const Duration(milliseconds: 10),
    );

    await controller.initialize();
    await controller.signInWithGoogle();

    expect(controller.status, AppSessionStatus.error);
    expect(controller.session, AppSession.signedOut);
    expect(controller.error, isA<TimeoutException>());

    controller.dispose();
    await auth.dispose();
  });

  test('starts Google sign-in through the Firebase provider', () async {
    final auth = FakeFirebaseAuthProvider();
    final service = FakeAuthSessionService(
      () async => const AppSession(
        isAuthenticated: true,
        userId: 'user-123',
      ),
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    await controller.signInWithGoogle();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(controller.status, AppSessionStatus.authenticated);
    expect(controller.session.isAuthenticated, isTrue);

    controller.dispose();
    await auth.dispose();
  });

  test('signs out through the Firebase provider', () async {
    final auth = FakeFirebaseAuthProvider();
    final service = FakeAuthSessionService(
      () async => const AppSession(
        isAuthenticated: true,
        userId: 'user-123',
      ),
    );
    final controller = AppSessionController(
      auth: auth,
      sessionService: service,
    );

    await controller.initialize();
    auth.emit(
      const FirebaseAuthUser(
        uid: 'firebase-uid',
      ),
    );
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    await controller.signOut();
    await Future<void>.delayed(Duration.zero);

    expect(controller.status, AppSessionStatus.signedOut);

    controller.dispose();
    await auth.dispose();
  });
}

import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

class FirebaseAuthUser {
  const FirebaseAuthUser({
    required this.uid,
    this.email,
    this.displayName,
  });

  final String uid;
  final String? email;
  final String? displayName;
}

abstract interface class FirebaseAuthProvider {
  Stream<FirebaseAuthUser?> authStateChanges();

  Future<String?> getIdToken();

  Future<void> signInWithGoogle();

  Future<void> signOut();
}

class FirebaseAuthService implements FirebaseAuthProvider {
  FirebaseAuthService({
    FirebaseAuth? auth,
    GoogleSignIn? googleSignIn,
    this.signInTimeout = const Duration(seconds: 30),
  })  : _auth = auth ?? FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  final FirebaseAuth _auth;
  final GoogleSignIn _googleSignIn;
  final Duration signInTimeout;

  Future<void> initialize() async {
    if (!kIsWeb) {
      const serverClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
      await _googleSignIn.initialize(
        serverClientId: serverClientId.isEmpty ? null : serverClientId,
      );
    }
  }

  @override
  Stream<FirebaseAuthUser?> authStateChanges() {
    return _auth.authStateChanges().map(
      (user) => user == null
          ? null
          : FirebaseAuthUser(
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
            ),
    );
  }

  @override
  Future<String?> getIdToken() async {
    return await _auth.currentUser?.getIdToken();
  }

  @override
  Future<void> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        await _auth
            .signInWithPopup(GoogleAuthProvider())
            .timeout(signInTimeout);
        return;
      }

      final googleUser =
          await _googleSignIn.authenticate().timeout(signInTimeout);
      final googleAuth = googleUser.authentication;
      final idToken = googleAuth.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw StateError(
          'Google Sign-In returned no ID token. Check the Android OAuth '
          'client configuration and signing certificate.',
        );
      }

      final credential = GoogleAuthProvider.credential(idToken: idToken);
      await _auth
          .signInWithCredential(credential)
          .timeout(signInTimeout);
    } on TimeoutException {
      rethrow;
    } on GoogleSignInException catch (error) {
      throw StateError('Google Sign-In failed: ${error.code}');
    }
  }

  @override
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }
}

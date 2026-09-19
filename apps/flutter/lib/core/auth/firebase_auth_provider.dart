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
  })  : _auth = auth ?? FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  final FirebaseAuth _auth;
  final GoogleSignIn _googleSignIn;

  Future<void> initialize() async {
    if (!kIsWeb) {
      await _googleSignIn.initialize();
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
    if (kIsWeb) {
      await _auth.signInWithPopup(GoogleAuthProvider());
      return;
    }

    final googleUser = await _googleSignIn.authenticate();
    final googleAuth = googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      idToken: googleAuth.idToken,
    );

    await _auth.signInWithCredential(credential);
  }

  @override
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }
}

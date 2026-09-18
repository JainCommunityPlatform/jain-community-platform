import 'package:firebase_auth/firebase_auth.dart';

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

  Future<void> signOut();
}

class FirebaseAuthService implements FirebaseAuthProvider {
  FirebaseAuthService({FirebaseAuth? auth}) : _auth = auth ?? FirebaseAuth.instance;

  final FirebaseAuth _auth;

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
  Future<String?> getIdToken() {
    return _auth.currentUser?.getIdToken();
  }

  @override
  Future<void> signOut() {
    return _auth.signOut();
  }
}

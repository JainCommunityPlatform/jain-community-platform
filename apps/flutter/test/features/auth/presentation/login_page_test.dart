import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/features/auth/presentation/login_page.dart';

void main() {
  testWidgets(
    'shows a disabled signing-in state while authentication is running',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: LoginPage(
            isLoading: true,
            onSignInWithGoogle: null,
          ),
        ),
      );

      expect(find.text('Signing in…'), findsOneWidget);
      expect(find.text('Continue with Google'), findsNothing);
    },
  );

  testWidgets(
    'shows a recoverable error state after authentication fails',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: LoginPage(
            error: StateError('authentication failed'),
            onSignInWithGoogle: () async {},
          ),
        ),
      );

      expect(find.text('Sign-in failed. Please try again.'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
    },
  );
}

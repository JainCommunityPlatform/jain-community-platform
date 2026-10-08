import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jain_community_platform/features/auth/presentation/login_page.dart';

void main() {
  Future<void> pumpEnglishLogin(
    WidgetTester tester, {
    bool isLoading = false,
    Object? error,
    Future<void> Function()? onSignInWithGoogle,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(
          isLoading: isLoading,
          error: error,
          onSignInWithGoogle: onSignInWithGoogle,
        ),
      ),
    );
  }

  testWidgets(
    'shows a disabled signing-in state while authentication is running',
    (tester) async {
      await pumpEnglishLogin(
        tester,
        isLoading: true,
        onSignInWithGoogle: null,
      );

      expect(find.text('Signing in…'), findsOneWidget);
      expect(find.text('Continue with Google'), findsNothing);
    },
  );

  testWidgets(
    'shows a recoverable error state after authentication fails',
    (tester) async {
      await pumpEnglishLogin(
        tester,
        error: StateError('authentication failed'),
        onSignInWithGoogle: () async {},
      );
      await tester.pump();

      expect(find.text('Sign-in failed'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
    },
  );
}

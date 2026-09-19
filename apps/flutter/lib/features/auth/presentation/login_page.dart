import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_routes.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({
    this.onSignInWithGoogle,
    this.isLoading = false,
    this.error,
    super.key,
  });

  final Future<void> Function()? onSignInWithGoogle;
  final bool isLoading;
  final Object? error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Sign in to continue',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                if (error != null) ...[
                  Text(
                    'Sign-in failed. Please try again.',
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                ],
                FilledButton.icon(
                  onPressed: isLoading || onSignInWithGoogle == null
                      ? null
                      : onSignInWithGoogle,
                  icon: const Icon(Icons.login),
                  label: Text(
                    isLoading ? 'Signing in…' : 'Continue with Google',
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: isLoading
                      ? null
                      : () => context.go(AppRoutes.home),
                  child: const Text('Back to public experience'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

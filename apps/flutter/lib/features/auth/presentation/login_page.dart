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
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 56,
                  maxWidth: 520,
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const _BrandMark(size: 76),
                    const SizedBox(height: 14),
                    Text(
                      'MyJinalay',
                      style: TextStyle(
                        color: colors.secondary,
                        fontSize: 36,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -1,
                      ),
                    ),
                    Text(
                      'by Nipun',
                      style: TextStyle(
                        color: colors.primary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Container(
                      height: 300,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            const Color(0xFFFFD88A),
                            colors.primary.withValues(alpha: 0.72),
                            const Color(0xFF5D321D),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: colors.primary.withValues(alpha: 0.18),
                            blurRadius: 30,
                            offset: const Offset(0, 14),
                          ),
                        ],
                      ),
                      child: const Stack(
                        alignment: Alignment.center,
                        children: [
                          Positioned(
                            top: 22,
                            child: _JainFlag(),
                          ),
                          Positioned(
                            top: 72,
                            child: Icon(
                              Icons.temple_hindu,
                              size: 126,
                              color: Colors.white,
                            ),
                          ),
                          Positioned(
                            bottom: 36,
                            child: Icon(
                              Icons.self_improvement,
                              size: 94,
                              color: Color(0xFFFFF4D5),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 26),
                    const Text(
                      'Faith Brings Us Together',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Discover Jain temples, support meaningful seva, join community events and stay connected with your Jinalay.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: colors.secondary.withValues(alpha: 0.72),
                        height: 1.45,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (error != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: colors.errorContainer,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          'Sign-in failed. Please try again.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: colors.onErrorContainer),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    FilledButton.icon(
                      onPressed: isLoading || onSignInWithGoogle == null
                          ? null
                          : onSignInWithGoogle,
                      icon: const Icon(Icons.g_mobiledata, size: 28),
                      label: Text(
                        isLoading ? 'Signing in…' : 'Continue with Google',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: isLoading
                          ? null
                          : () => context.go(AppRoutes.home),
                      child: const Text('Explore without signing in'),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Temples  •  Community  •  Seva',
                      style: TextStyle(
                        color: colors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.10),
        border: Border.all(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
        ),
      ),
      child: Icon(
        Icons.local_florist,
        color: Theme.of(context).colorScheme.primary,
        size: size * 0.55,
      ),
    );
  }
}

class _JainFlag extends StatelessWidget {
  const _JainFlag();

  @override
  Widget build(BuildContext context) {
    const colors = [
      Color(0xFFFF2B2B),
      Color(0xFFFFD400),
      Colors.white,
      Color(0xFF159447),
      Color(0xFF174EA6),
    ];

    return Container(
      width: 92,
      height: 46,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 3)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (final color in colors) Expanded(child: ColoredBox(color: color)),
        ],
      ),
    );
  }
}

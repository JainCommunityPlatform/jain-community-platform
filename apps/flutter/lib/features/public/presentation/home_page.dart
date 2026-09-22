import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_routes.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 34, 24, 28),
          child: Column(
            children: [
              Icon(Icons.local_florist, color: colors.primary, size: 52),
              const SizedBox(height: 8),
              Text('MyJinalay', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700, color: colors.secondary)),
              Text('by Nipun', style: TextStyle(color: colors.primary, fontWeight: FontWeight.w600)),
              const SizedBox(height: 28),
              Container(
                height: 250,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFD88A), Color(0xFFC17B2B), Color(0xFF5D321D)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: const Stack(
                  alignment: Alignment.center,
                  children: [
                    Positioned(top: 18, child: _JainFlag()),
                    Positioned(top: 66, child: Icon(Icons.temple_hindu, size: 122, color: Colors.white)),
                    Positioned(bottom: 20, child: Icon(Icons.self_improvement, size: 74, color: Color(0xFFFFF4D5))),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text('Community, temples, events and giving', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              const Text('A calm, simple space to discover Jinalays, support seva, join events and stay connected with the Jain community.', textAlign: TextAlign.center, style: TextStyle(height: 1.45)),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => context.go(AppRoutes.login),
                icon: const Icon(Icons.login),
                label: const Text('Sign in to MyJinalay'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _JainFlag extends StatelessWidget {
  const _JainFlag();

  @override
  Widget build(BuildContext context) {
    const colors = [Color(0xFFFF2B2B), Color(0xFFFFD400), Colors.white, Color(0xFF159447), Color(0xFF174EA6)];
    return SizedBox(
      width: 88,
      height: 44,
      child: Column(children: [for (final color in colors) Expanded(child: ColoredBox(color: color))]),
    );
  }
}

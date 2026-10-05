import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_routes.dart';

class BadeBabaHomePage extends StatelessWidget {
  const BadeBabaHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bade Baba Kharadi'),
        actions: [
          TextButton.icon(
            onPressed: () => context.go(AppRoutes.login),
            icon: const Icon(Icons.login),
            label: const Text('Sign in'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
        children: [
          _HeroCard(colors: colors),
          const SizedBox(height: 20),
          const _SectionTitle('What would you like to do?'),
          const SizedBox(height: 12),
          const _ActionGrid(),
          const SizedBox(height: 28),
          const _SectionTitle('Community'),
          const SizedBox(height: 12),
          _InfoCard(
            icon: Icons.event,
            title: 'Events & registrations',
            text: 'Join temple and community events. Your JCP identity keeps your registrations connected across activities.',
          ),
          _InfoCard(
            icon: Icons.volunteer_activism,
            title: 'Seva & giving',
            text: 'Support temple initiatives and keep your participation connected to your JCP account.',
          ),
          _InfoCard(
            icon: Icons.notifications_active,
            title: 'Stay connected',
            text: 'Get important temple updates through the communication channels configured by the temple.',
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => context.go(AppRoutes.login),
            icon: const Icon(Icons.person),
            label: const Text('Sign in to continue'),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.colors});

  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [colors.primaryContainer, colors.surface],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.temple_hindu, size: 52),
            SizedBox(height: 16),
            Text(
              'Shri Adinath Jinalay',
              style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 6),
            Text(
              'Bade Baba Kharadi, Pune',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 12),
            Text(
              'A new JCP-powered temple experience for events, seva, registrations and community updates.',
              style: TextStyle(height: 1.45),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionGrid extends StatelessWidget {
  const _ActionGrid();

  @override
  Widget build(BuildContext context) {
    final actions = [
      (Icons.event_available, 'Events'),
      (Icons.app_registration, 'Register'),
      (Icons.volunteer_activism, 'Seva'),
      (Icons.account_balance, 'Temple'),
    ];
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final action in actions)
          SizedBox(
            width: 160,
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: Icon(action.$1),
              label: Text(action.$2),
            ),
          ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800));
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.title, required this.text});

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(child: Icon(icon)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(text),
        ),
      ),
    );
  }
}

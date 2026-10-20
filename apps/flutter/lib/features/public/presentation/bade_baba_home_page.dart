import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/routing/app_routes.dart';

class BadeBabaHomePage extends StatelessWidget {
  const BadeBabaHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final strings = AppStrings.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('MyJinalay'),
        actions: [
          TextButton.icon(
            onPressed: () => context.go(AppRoutes.login),
            icon: const Icon(Icons.login),
            label: Text(strings.signIn),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
        children: [
          _HeroCard(colors: colors, strings: strings),
          const SizedBox(height: 20),
          _SectionTitle(strings.publicActionsHeading),
          const SizedBox(height: 12),
          _ActionGrid(strings: strings),
          const SizedBox(height: 28),
          _SectionTitle(strings.publicCommunityHeading),
          const SizedBox(height: 12),
          _InfoCard(
            icon: Icons.event,
            title: strings.publicEventsTitle,
            text: strings.publicEventsDescription,
          ),
          _InfoCard(
            icon: Icons.volunteer_activism,
            title: strings.publicSevaTitle,
            text: strings.publicSevaDescription,
          ),
          _InfoCard(
            icon: Icons.notifications_active,
            title: strings.publicStayConnectedTitle,
            text: strings.publicStayConnectedDescription,
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => context.go(AppRoutes.login),
            icon: const Icon(Icons.person),
            label: Text(strings.signInContinue),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.colors, required this.strings});

  final ColorScheme colors;
  final AppStrings strings;

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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const ExcludeSemantics(child: Icon(Icons.temple_hindu, size: 52)),
            const SizedBox(height: 16),
            Semantics(
              header: true,
              child: Text(
                strings.publicHeroTitle,
                style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              strings.publicHeroSubtitle,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Text(
              strings.publicHeroDescription,
              style: const TextStyle(height: 1.45),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionGrid extends StatelessWidget {
  const _ActionGrid({required this.strings});

  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    final actions = [
      (Icons.event_available, strings.publicActionEvents),
      (Icons.app_registration, strings.publicActionRegister),
      (Icons.volunteer_activism, strings.publicActionSeva),
      (Icons.account_balance, strings.publicActionTemple),
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
  Widget build(BuildContext context) => Semantics(
        header: true,
        child: Text(text, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
      );
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

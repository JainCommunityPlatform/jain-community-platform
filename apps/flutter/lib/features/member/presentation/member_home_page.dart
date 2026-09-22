import 'package:flutter/material.dart';

class MemberHomePage extends StatefulWidget {
  const MemberHomePage({super.key});

  @override
  State<MemberHomePage> createState() => _MemberHomePageState();
}

class _MemberHomePageState extends State<MemberHomePage> {
  int selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const _HomeTab(),
      const _TemplesTab(),
      const _EventsTab(),
      const _DonationsTab(),
      const _ProfileTab(),
    ];

    return Scaffold(
      body: SafeArea(child: IndexedStack(index: selectedIndex, children: pages)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => selectedIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.temple_hindu_outlined), selectedIcon: Icon(Icons.temple_hindu), label: 'Temples'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Events'),
          NavigationDestination(icon: Icon(Icons.volunteer_activism_outlined), selectedIcon: Icon(Icons.volunteer_activism), label: 'Donations'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    return _PageScaffold(
      title: 'Namaste 🙏',
      subtitle: 'Your connection to Jain temples',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        children: [
          _HeroCard(
            title: 'Faith Brings Us Together',
            subtitle: 'Explore temples, seva and community events in one place.',
            icon: Icons.temple_hindu,
          ),
          const SizedBox(height: 18),
          const _SectionTitle(title: 'Nearby Jinalays', action: 'View all'),
          const SizedBox(height: 10),
          const _TempleCard(
            name: 'Shri Adinath Jinalay',
            location: 'Kharadi, Pune',
            distance: '2.4 km',
          ),
          const SizedBox(height: 10),
          const _TempleCard(
            name: 'Shri Parshvanath Jinalay',
            location: 'Viman Nagar, Pune',
            distance: '3.1 km',
          ),
          const SizedBox(height: 18),
          const _SectionTitle(title: 'Make a Difference'),
          const SizedBox(height: 10),
          const _DonationCard(),
          const SizedBox(height: 18),
          const _SectionTitle(title: 'Upcoming Events', action: 'View all'),
          const SizedBox(height: 10),
          const _EventTile(
            title: 'Chaturmas Pravachan Series 2026',
            date: '12 Jul – 20 Sep 2026',
            location: 'Shri Adinath Jinalay',
          ),
        ],
      ),
    );
  }
}

class _TemplesTab extends StatelessWidget {
  const _TemplesTab();

  @override
  Widget build(BuildContext context) {
    return _PageScaffold(
      title: 'Explore Temples',
      subtitle: 'Discover Jain temples near you',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        children: const [
          _SearchBox(hint: 'Search temples, city or area…'),
          SizedBox(height: 14),
          _TempleCard(name: 'Shri Adinath Jinalay', location: 'Kharadi, Pune', distance: '2.4 km'),
          SizedBox(height: 10),
          _TempleCard(name: 'Shri Parshvanath Jinalay', location: 'Viman Nagar, Pune', distance: '3.1 km'),
          SizedBox(height: 10),
          _TempleCard(name: 'Shri Mahavir Swami Jinalay', location: 'Hadapsar, Pune', distance: '5.6 km'),
          SizedBox(height: 10),
          _TempleCard(name: 'Shri Shantinath Jinalay', location: 'Aundh, Pune', distance: '7.2 km'),
        ],
      ),
    );
  }
}

class _EventsTab extends StatelessWidget {
  const _EventsTab();

  @override
  Widget build(BuildContext context) {
    return _PageScaffold(
      title: 'Events & Community',
      subtitle: 'Stay connected with your community',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        children: const [
          _EventTile(title: 'Chaturmas Pravachan Series 2026', date: '12 Jul – 20 Sep 2026', location: 'Shri Adinath Jinalay'),
          SizedBox(height: 12),
          _EventTile(title: 'Paryushan Parva', date: '28 Aug – 5 Sep 2026', location: 'Community Hall, Pune'),
          SizedBox(height: 12),
          _EventTile(title: 'Samvatsari Pratikraman', date: '5 Sep 2026', location: 'Shri Adinath Jinalay'),
          SizedBox(height: 12),
          _EventTile(title: 'Jain Gyan Shivir', date: '15 Oct 2026', location: 'Pune'),
        ],
      ),
    );
  }
}

class _DonationsTab extends StatelessWidget {
  const _DonationsTab();

  @override
  Widget build(BuildContext context) {
    return _PageScaffold(
      title: 'Support & Donate',
      subtitle: 'Small contributions create a greater tomorrow',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        children: const [
          _DonationCard(),
          SizedBox(height: 12),
          _DonationCard(
            title: 'Puja & Aarti Seva',
            raised: '₹3,20,000',
            target: '₹5,00,000',
            icon: Icons.auto_awesome,
          ),
        ],
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return _PageScaffold(
      title: 'Profile',
      subtitle: 'Faith • Seva • Community',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        children: [
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(radius: 28, child: Text('MJ')),
              title: const Text('MyJinalay Member', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('Community member'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 12),
          for (final item in const [
            (Icons.favorite_outline, 'My Donations'),
            (Icons.event_outlined, 'My Registrations'),
            (Icons.bookmark_outline, 'Favourite Temples'),
            (Icons.notifications_none, 'Notifications'),
            (Icons.help_outline, 'Help & Support'),
            (Icons.info_outline, 'About MyJinalay'),
          ])
            Card(
              child: ListTile(
                leading: Icon(item.$1),
                title: Text(item.$2),
                trailing: const Icon(Icons.chevron_right),
              ),
            ),
        ],
      ),
    );
  }
}

class _PageScaffold extends StatelessWidget {
  const _PageScaffold({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 3),
                    Text(subtitle, style: TextStyle(color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.65))),
                  ],
                ),
              ),
              const _BrandMark(),
            ],
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) => Icon(
        Icons.local_florist,
        color: Theme.of(context).colorScheme.primary,
        size: 32,
      );
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.title, required this.subtitle, required this.icon});

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [colors.primary, const Color(0xFF6A351E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          const _JainFlagSmall(),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(subtitle, style: const TextStyle(color: Colors.white70, height: 1.35)),
              ],
            ),
          ),
          Icon(icon, color: Colors.white.withValues(alpha: 0.85), size: 48),
        ],
      ),
    );
  }
}

class _JainFlagSmall extends StatelessWidget {
  const _JainFlagSmall();

  @override
  Widget build(BuildContext context) {
    const colors = [Color(0xFFFF2B2B), Color(0xFFFFD400), Colors.white, Color(0xFF159447), Color(0xFF174EA6)];
    return SizedBox(
      width: 36,
      height: 54,
      child: Column(children: [for (final color in colors) Expanded(child: ColoredBox(color: color))]),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.action});

  final String title;
  final String? action;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
          if (action != null) Text(action!, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600)),
        ],
      );
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.hint});

  final String hint;

  @override
  Widget build(BuildContext context) => TextField(
        decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: hint),
      );
}

class _TempleCard extends StatelessWidget {
  const _TempleCard({required this.name, required this.location, required this.distance});

  final String name;
  final String location;
  final String distance;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(colors: [Color(0xFFFFD88A), Color(0xFFC17B2B)]),
            ),
            child: const Icon(Icons.temple_hindu, color: Colors.white, size: 34),
          ),
          title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text('$location\n$distance'),
          isThreeLine: true,
          trailing: const Icon(Icons.chevron_right),
        ),
      );
}

class _DonationCard extends StatelessWidget {
  const _DonationCard({
    this.title = 'Temple Renovation Fund',
    this.raised = '₹8,50,000',
    this.target = '₹25,00,000',
    this.icon = Icons.volunteer_activism,
  });

  final String title;
  final String raised;
  final String target;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
            ]),
            const SizedBox(height: 10),
            Text('Support the ongoing seva and maintenance work of the temple.'),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: 0.34, borderRadius: BorderRadius.circular(8)),
            const SizedBox(height: 8),
            Text('$raised raised of $target'),
            const SizedBox(height: 12),
            FilledButton(onPressed: () {}, child: const Text('Donate Now')),
          ],
        ),
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.title, required this.date, required this.location});

  final String title;
  final String date;
  final String location;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          contentPadding: const EdgeInsets.all(14),
          leading: CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
            child: Icon(Icons.event, color: Theme.of(context).colorScheme.primary),
          ),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text('$date\n$location'),
          isThreeLine: true,
          trailing: const Icon(Icons.chevron_right),
        ),
      );
}

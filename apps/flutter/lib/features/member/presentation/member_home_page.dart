import 'package:flutter/material.dart';

import '../../../core/api/api_client.dart';
import '../../giving/presentation/donor_giving_page.dart';
import '../../profile/data/profile_repository.dart';
import '../../profile/presentation/profile_page.dart';
import '../../tenant/data/tenant_repository.dart';

class MemberHomePage extends StatefulWidget {
  const MemberHomePage({
    this.profileRepository,
    this.api,
    this.onSignOut,
    this.initialIndex = 0,
    super.key,
  });
  final ProfileRepository? profileRepository;
  final ApiClient? api;
  final Future<void> Function()? onSignOut;
  final int initialIndex;

  @override
  State<MemberHomePage> createState() => _MemberHomePageState();
}

class _MemberHomePageState extends State<MemberHomePage> {
  late int selectedIndex;

  @override
  void initState() {
    super.initState();
    selectedIndex = widget.initialIndex.clamp(0, 4).toInt();
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _HomeTab(api: widget.api),
      _TemplesTab(api: widget.api),
      const _EventsTab(),
      widget.api == null ? const _DonationsTab() : DonorGivingPage(api: widget.api!),
      widget.profileRepository == null ? const _ProfileTab() : ProfilePage(repository: widget.profileRepository!, onSignOut: widget.onSignOut),
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

class _HomeTab extends StatefulWidget {
  const _HomeTab({this.api});

  final ApiClient? api;

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  List<TenantSummary> _temples = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTemples();
  }

  Future<void> _loadTemples() async {
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      final api = widget.api;
      if (api == null) throw StateError('Temple directory is not configured.');
      final temples = await TenantRepository(api).listTemples();
      if (!mounted) return;
      setState(() { _temples = temples; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _error = 'Could not load temples. Pull down to retry.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _PageScaffold(
      title: 'Namaste 🙏',
      subtitle: 'Your connection to Jain temples',
      child: RefreshIndicator(
        onRefresh: _loadTemples,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
          children: [
            const _HeroCard(
              title: 'Faith Brings Us Together',
              subtitle: 'Explore temples, seva and community events in one place.',
              icon: Icons.temple_hindu,
            ),
            const SizedBox(height: 18),
            const _SectionTitle(title: 'Nearby Jinalays'),
            const SizedBox(height: 10),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineRetry(message: _error!, onRetry: _loadTemples)
            else if (_temples.isEmpty)
              const _EmptyDirectoryMessage(message: 'No temples have been published in the central directory yet.')
            else
              for (final temple in _temples.take(2)) ...[
                _TempleCard(
                  name: temple.name,
                  location: _templeLocation(temple),
                  imageUrl: temple.primaryImageUrl,
                ),
                const SizedBox(height: 10),
              ],
            const SizedBox(height: 18),
            const _SectionTitle(title: 'Make a Difference'),
            const SizedBox(height: 10),
            const _DonationCard(),
            const SizedBox(height: 18),
            const _SectionTitle(title: 'Upcoming Events'),
            const SizedBox(height: 10),
            const _EmptyDirectoryMessage(
              message: 'Events will appear here when they are published by the community.',
            ),
          ],
        ),
      ),
    );
  }
}

class _TemplesTab extends StatefulWidget {
  const _TemplesTab({this.api});

  final ApiClient? api;

  @override
  State<_TemplesTab> createState() => _TemplesTabState();
}

class _TemplesTabState extends State<_TemplesTab> {
  List<TenantSummary> _temples = const [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _loadTemples();
  }

  Future<void> _loadTemples() async {
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      final api = widget.api;
      if (api == null) throw StateError('Temple directory is not configured.');
      final temples = await TenantRepository(api).listTemples();
      if (!mounted) return;
      setState(() { _temples = temples; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _error = 'Could not load temples. Pull down to retry.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = _query.trim().toLowerCase();
    final filtered = _temples.where((temple) {
      final haystack = '${temple.name} ${temple.city ?? ''} ${temple.state ?? ''} ${temple.address ?? ''}'.toLowerCase();
      return haystack.contains(query);
    }).toList();
    return _PageScaffold(
      title: 'Explore Temples',
      subtitle: 'Discover Jain temples near you',
      child: RefreshIndicator(
        onRefresh: _loadTemples,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
          children: [
            TextField(
              onChanged: (value) => setState(() => _query = value),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search temples, city or area…',
              ),
            ),
            const SizedBox(height: 14),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineRetry(message: _error!, onRetry: _loadTemples)
            else if (filtered.isEmpty)
              _EmptyDirectoryMessage(
                message: query.isEmpty
                    ? 'No temples have been published in the central directory yet.'
                    : 'No temples match “$_query”.',
              )
            else
              for (final temple in filtered) ...[
                _TempleCard(
                  name: temple.name,
                  location: _templeLocation(temple),
                  imageUrl: temple.primaryImageUrl,
                ),
                const SizedBox(height: 10),
              ],
          ],
        ),
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
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        children: const [
          _EmptyDirectoryMessage(
            message: 'No community events are published yet. Check back when organizers publish upcoming events.',
          ),
        ],
      ),
    );
  }
}

String _templeLocation(TenantSummary temple) {
  final cityAndState = [temple.city, temple.state]
      .whereType<String>()
      .map((value) => value.trim())
      .where((value) => value.isNotEmpty)
      .join(', ');
  if (cityAndState.isNotEmpty) return cityAndState;
  final address = temple.address?.trim();
  return address == null || address.isEmpty ? 'Location not provided' : address;
}

class _EmptyDirectoryMessage extends StatelessWidget {
  const _EmptyDirectoryMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Text(message),
    ),
  );
}

class _InlineRetry extends StatelessWidget {
  const _InlineRetry({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ),
        ],
      ),
    ),
  );
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
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
        ],
      );
}

class _TempleCard extends StatelessWidget {
  const _TempleCard({required this.name, required this.location, this.imageUrl});

  final String name;
  final String location;
  final String? imageUrl;

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
            child: imageUrl == null || imageUrl!.trim().isEmpty
                ? const Icon(Icons.temple_hindu, color: Colors.white, size: 34)
                : ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.network(imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.temple_hindu, color: Colors.white, size: 34))),
          ),
          title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(location),
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

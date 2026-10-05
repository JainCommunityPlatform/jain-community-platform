import 'package:flutter/material.dart';
import '../data/profile_repository.dart';
import '../data/user_profile.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({required this.repository, super.key});
  final ProfileRepository repository;
  @override State<ProfilePage> createState() => _ProfilePageState();
}
class _ProfilePageState extends State<ProfilePage> {
  UserProfile? profile;
  List<UserActivity> activities = const [];
  bool loading = true;
  bool saving = false;
  final name = TextEditingController();
  final address = TextEditingController();
  final city = TextEditingController();
  final state = TextEditingController();
  final postalCode = TextEditingController();

  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final p = await widget.repository.get();
      final a = await widget.repository.activities();
      if (!mounted) return;
      profile = p;
      name.text = p.displayName ?? '';
      address.text = p.address ?? '';
      city.text = p.city ?? '';
      state.text = p.state ?? '';
      postalCode.text = p.postalCode ?? '';
      setState(() { activities = a; loading = false; });
    } catch (_) { if (mounted) setState(() => loading = false); }
  }
  Future<void> save() async {
    setState(() => saving = true);
    try {
      final p = await widget.repository.update(
        displayName: name.text.trim(), address: address.text.trim(),
        city: city.text.trim(), state: state.text.trim(), postalCode: postalCode.text.trim(),
      );
      if (mounted) setState(() { profile = p; saving = false; });
    } catch (_) { if (mounted) setState(() => saving = false); }
  }
  @override Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    final p = profile;
    if (p == null) return Center(child: FilledButton(onPressed: load, child: const Text('Retry')));
    return ListView(padding: const EdgeInsets.all(20), children: [
      CircleAvatar(radius: 34, child: Text((p.displayName ?? 'U').substring(0, 1).toUpperCase())),
      const SizedBox(height: 12),
      Text(p.email ?? 'Community member', textAlign: TextAlign.center),
      const SizedBox(height: 18),
      TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
      TextField(controller: address, decoration: const InputDecoration(labelText: 'Address')),
      TextField(controller: city, decoration: const InputDecoration(labelText: 'City')),
      TextField(controller: state, decoration: const InputDecoration(labelText: 'State')),
      TextField(controller: postalCode, decoration: const InputDecoration(labelText: 'PIN code')),
      const SizedBox(height: 12),
      InputDecorator(decoration: const InputDecoration(labelText: 'Mobile number'), child: Text(p.primaryPhone ?? 'Not linked')),
      const SizedBox(height: 12),
      FilledButton(onPressed: saving ? null : save, child: Text(saving ? 'Saving…' : 'Save profile')),
      const SizedBox(height: 24),
      const Text('My participation', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      if (activities.isEmpty) const Text('No participation recorded yet.'),
      for (final activity in activities)
        Card(child: ListTile(
          leading: const Icon(Icons.event_available),
          title: Text(activity.title),
          subtitle: Text(activity.eventType + ' • ' + activity.participatedAt.toLocal().toString()),
        )),
    ]);
  }
  @override void dispose() {
    name.dispose(); address.dispose(); city.dispose(); state.dispose(); postalCode.dispose(); super.dispose();
  }
}

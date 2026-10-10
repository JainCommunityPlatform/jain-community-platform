import 'package:flutter/material.dart';

import '../data/profile_repository.dart';
import '../data/user_profile.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({required this.repository, this.onSignOut, super.key});

  final ProfileRepository repository;
  final Future<void> Function()? onSignOut;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  UserProfile? profile;
  List<UserActivity> activities = const [];
  bool loading = true;
  bool saving = false;
  bool editing = false;
  bool signingOut = false;
  String? message;
  final name = TextEditingController();
  final address = TextEditingController();
  final city = TextEditingController();
  final state = TextEditingController();
  final postalCode = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    if (mounted) setState(() { loading = true; message = null; });
    try {
      final p = await widget.repository.get();
      final a = await widget.repository.activities();
      if (!mounted) return;
      profile = p;
      _populateFields(p);
      setState(() { activities = a; loading = false; });
    } catch (_) {
      if (mounted) setState(() { loading = false; message = 'Could not load your profile. Pull down to retry.'; });
    }
  }

  void _populateFields(UserProfile p) {
    name.text = p.displayName ?? '';
    address.text = p.address ?? '';
    city.text = p.city ?? '';
    state.text = p.state ?? '';
    postalCode.text = p.postalCode ?? '';
  }

  void _cancelEditing() {
    final p = profile;
    if (p != null) _populateFields(p);
    setState(() { editing = false; message = null; });
  }

  Future<void> save() async {
    setState(() { saving = true; message = null; });
    try {
      final p = await widget.repository.update(
        displayName: name.text.trim(),
        address: address.text.trim(),
        city: city.text.trim(),
        state: state.text.trim(),
        postalCode: postalCode.text.trim(),
      );
      if (mounted) {
        setState(() { profile = p; saving = false; editing = false; message = 'Profile saved.'; });
        _populateFields(p);
      }
    } catch (_) {
      if (mounted) setState(() { saving = false; message = 'Could not save your profile. Please try again.'; });
    }
  }

  Future<void> _signOut() async {
    final signOut = widget.onSignOut;
    if (signOut == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need to sign in again to access your account.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => signingOut = true);
    try {
      await signOut();
    } catch (_) {
      if (mounted) setState(() { signingOut = false; message = 'Could not sign out. Please try again.'; });
    }
  }

  Widget _field(TextEditingController controller, String label) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: controller,
      readOnly: !editing,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    ),
  );

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    final p = profile;
    if (p == null) {
      return Center(child: FilledButton(onPressed: load, child: const Text('Retry')));
    }
    final displayName = (p.displayName ?? '').trim();
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          CircleAvatar(radius: 34, child: Text(displayName.isEmpty ? 'U' : displayName.substring(0, 1).toUpperCase())),
          const SizedBox(height: 12),
          Text(displayName.isEmpty ? 'Community member' : displayName,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(p.email ?? 'Email not available', textAlign: TextAlign.center),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(child: Text('Personal details', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold))),
            if (!editing)
              OutlinedButton.icon(onPressed: () => setState(() { editing = true; message = null; }),
                icon: const Icon(Icons.edit_outlined), label: const Text('Edit')),
          ]),
          const SizedBox(height: 10),
          _field(name, 'Name'),
          _field(address, 'Address'),
          _field(city, 'City'),
          _field(state, 'State'),
          _field(postalCode, 'PIN code'),
          InputDecorator(
            decoration: const InputDecoration(labelText: 'Mobile number', border: OutlineInputBorder()),
            child: Text(p.primaryPhone ?? 'Not linked'),
          ),
          if (editing) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: saving ? null : _cancelEditing, child: const Text('Cancel'))),
              const SizedBox(width: 12),
              Expanded(child: FilledButton(onPressed: saving ? null : save, child: Text(saving ? 'Saving…' : 'Save profile'))),
            ]),
          ],
          if (message != null) ...[
            const SizedBox(height: 8),
            Text(message!, style: TextStyle(color: Theme.of(context).colorScheme.secondary)),
          ],
          const SizedBox(height: 24),
          const Text('My participation', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (activities.isEmpty) const Text('No participation recorded yet.'),
          for (final activity in activities)
            Card(child: ListTile(
              leading: const Icon(Icons.event_available),
              title: Text(activity.title),
              subtitle: Text('${activity.eventType} • ${activity.participatedAt.toLocal()}'),
            )),
          if (widget.onSignOut != null) ...[
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: signingOut ? null : _signOut,
              icon: signingOut
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.logout),
              label: Text(signingOut ? 'Signing out…' : 'Sign out'),
              style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    name.dispose(); address.dispose(); city.dispose(); state.dispose(); postalCode.dispose();
    super.dispose();
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_routes.dart';

import '../data/tenant_member.dart';
import '../data/tenant_member_repository.dart';

class AdminMembersPage extends StatefulWidget {
  const AdminMembersPage({required this.repository, super.key});
  final TenantMemberRepository repository;
  @override State<AdminMembersPage> createState() => _AdminMembersPageState();
}

class _AdminMembersPageState extends State<AdminMembersPage> {
  List<TenantMember> members = const [];
  bool loading = true;
  bool mutating = false;
  String? error;

  @override void initState() { super.initState(); load(); }

  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final result = await widget.repository.list();
      if (mounted) setState(() { members = result; loading = false; });
    } catch (e) {
      if (mounted) setState(() { error = e.toString(); loading = false; });
    }
  }

  Future<void> add(String userId, String role) async {
    setState(() => mutating = true);
    try { await widget.repository.create(userId: userId, role: role); if (mounted) Navigator.pop(context); await load(); }
    catch (e) { if (mounted) _showError(e.toString()); }
    finally { if (mounted) setState(() => mutating = false); }
  }

  Future<void> changeRole(TenantMember member, String role) async {
    setState(() => mutating = true);
    try { await widget.repository.updateRole(userId: member.userId, role: role); if (mounted) Navigator.pop(context); await load(); }
    catch (e) { if (mounted) _showError(e.toString()); }
    finally { if (mounted) setState(() => mutating = false); }
  }

  Future<void> updateContact(TenantMember member, String value) async {
    setState(() => mutating = true);
    try { await widget.repository.updateContact(userId: member.userId, value: value); if (mounted) Navigator.pop(context); await load(); }
    catch (e) { if (mounted) _showError(e.toString()); }
    finally { if (mounted) setState(() => mutating = false); }
  }

  Future<void> remove(TenantMember member) async {
    setState(() => mutating = true);
    try { await widget.repository.remove(member.userId); await load(); }
    catch (e) { if (mounted) _showError(e.toString()); }
    finally { if (mounted) setState(() => mutating = false); }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  bool validMobile(String? value) {
    final v = value?.trim() ?? '';
    if (v.length != 10) return false;
    return '6789'.contains(v[0]);
  }

  @override Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Members'), actions: [
        IconButton(tooltip: 'Add member', onPressed: mutating ? null : showAdd, icon: const Icon(Icons.person_add_outlined)),
      ]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 5,
        onDestinationSelected: (index) {
          if (index == 5) {
            Navigator.of(context).pop();
            return;
          }
          context.go('${AppRoutes.member}?tab=$index');
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.temple_hindu_outlined), selectedIcon: Icon(Icons.temple_hindu), label: 'Temples'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Events'),
          NavigationDestination(icon: Icon(Icons.volunteer_activism_outlined), selectedIcon: Icon(Icons.volunteer_activism), label: 'Donations'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
          NavigationDestination(icon: Icon(Icons.admin_panel_settings_outlined), selectedIcon: Icon(Icons.admin_panel_settings), label: 'Manage'),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('Unable to load members'), FilledButton(onPressed: load, child: const Text('Retry')),
                ]))
              : members.isEmpty
                  ? const Center(child: Text('No members yet'))
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: members.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, index) {
                          final member = members[index];
                          final name = member.displayName ?? member.email ?? member.userId;
                          final contact = member.primaryPhone == null ? '' : '\n${member.primaryPhone!}';
                          return ListTile(
                            leading: CircleAvatar(child: Text(name.substring(0, 1).toUpperCase())),
                            title: Text(name),
                            subtitle: Text((member.email ?? member.userId) + contact),
                            trailing: PopupMenuButton<String>(
                              onSelected: (value) {
                                if (value == 'role') showRole(member);
                                if (value == 'contact') showContact(member);
                                if (value == 'remove') remove(member);
                              },
                              itemBuilder: (_) => const [
                                PopupMenuItem(value: 'role', child: Text('Change role')),
                                PopupMenuItem(value: 'contact', child: Text('Update mobile number')),
                                PopupMenuItem(value: 'remove', child: Text('Remove member')),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  void showAdd() {
    final controller = TextEditingController();
    var role = roles.first;
    final key = GlobalKey<FormState>();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (_, setDialogState) => AlertDialog(
          title: const Text('Add member'),
          content: Form(key: key, child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextFormField(controller: controller, decoration: const InputDecoration(labelText: 'User ID'),
              validator: (value) => value == null || value.trim().isEmpty ? 'User ID is required' : null),
            DropdownButtonFormField<String>(initialValue: role, decoration: const InputDecoration(labelText: 'Role'),
              items: roles.map((r) => DropdownMenuItem(value: r, child: Text(roleLabel(r)))).toList(),
              onChanged: (value) => setDialogState(() => role = value!)),
          ])),
          actions: [
            TextButton(onPressed: mutating ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            FilledButton(onPressed: mutating ? null : () { if (key.currentState!.validate()) add(controller.text.trim(), role); },
              child: mutating ? const CircularProgressIndicator() : const Text('Add')),
          ],
        ),
      ),
    ).whenComplete(controller.dispose);
  }

  void showContact(TenantMember member) {
    final controller = TextEditingController(text: member.primaryPhone ?? '');
    final key = GlobalKey<FormState>();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Update mobile number'),
        content: Form(
          key: key,
          child: TextFormField(
            controller: controller,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            decoration: const InputDecoration(labelText: 'Mobile number', prefixText: '+91 '),
            validator: (value) => validMobile(value) ? null : 'Enter a valid 10 digit mobile number',
          ),
        ),
        actions: [
          TextButton(onPressed: mutating ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(onPressed: mutating ? null : () { if (key.currentState!.validate()) updateContact(member, controller.text.trim()); }, child: const Text('Save')),
        ],
      ),
    ).whenComplete(controller.dispose);
  }

  void showRole(TenantMember member) {
    var role = member.role;
    showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (_, setDialogState) => AlertDialog(
          title: const Text('Change role'),
          content: DropdownButtonFormField<String>(initialValue: role,
            items: roles.map((r) => DropdownMenuItem(value: r, child: Text(roleLabel(r)))).toList(),
            onChanged: (value) => setDialogState(() => role = value!)),
          actions: [
            TextButton(onPressed: mutating ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            FilledButton(onPressed: mutating ? null : () => changeRole(member, role), child: const Text('Save')),
          ],
        ),
      ),
    );
  }
}

const roles = ['TENANT_ADMIN', 'CONTENT_MANAGER', 'EVENT_MANAGER', 'INVENTORY_MANAGER', 'FINANCE_VIEWER', 'FINANCE_OPERATOR', 'FINANCE_APPROVER', 'CA_AUDITOR'];
String roleLabel(String role) => role.split('_').map((part) => part[0] + part.substring(1).toLowerCase()).join(' ');

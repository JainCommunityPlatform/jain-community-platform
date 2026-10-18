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
          final router = GoRouter.of(context);
          Navigator.of(context).pop();
          router.go('${AppRoutes.member}?tab=$index');
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
    showDialog<void>(
      context: context,
      builder: (_) => _AddMemberDialog(
        onAdd: add,
      ),
    );
  }

  void showContact(TenantMember member) {
    showDialog<void>(
      context: context,
      builder: (_) => _UpdateMemberContactDialog(
        initialValue: member.primaryPhone ?? '',
        isValidMobile: validMobile,
        onSave: (value) => updateContact(member, value),
      ),
    );
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


class _AddMemberDialog extends StatefulWidget {
  const _AddMemberDialog({required this.onAdd});

  final Future<void> Function(String userId, String role) onAdd;

  @override
  State<_AddMemberDialog> createState() => _AddMemberDialogState();
}

class _AddMemberDialogState extends State<_AddMemberDialog> {
  final controller = TextEditingController();
  final formKey = GlobalKey<FormState>();
  String role = roles.first;
  bool submitting = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (submitting || !formKey.currentState!.validate()) return;
    setState(() => submitting = true);
    try {
      await widget.onAdd(controller.text.trim(), role);
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Add member'),
    content: Form(
      key: formKey,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextFormField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'User ID'),
          validator: (value) => value == null || value.trim().isEmpty
              ? 'User ID is required'
              : null,
        ),
        DropdownButtonFormField<String>(
          initialValue: role,
          decoration: const InputDecoration(labelText: 'Role'),
          items: roles.map((r) => DropdownMenuItem(
            value: r,
            child: Text(roleLabel(r)),
          )).toList(),
          onChanged: submitting ? null : (value) {
            if (value != null) setState(() => role = value);
          },
        ),
      ]),
    ),
    actions: [
      TextButton(
        onPressed: submitting ? null : () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: submitting ? null : submit,
        child: submitting
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : const Text('Add'),
      ),
    ],
  );
}

class _UpdateMemberContactDialog extends StatefulWidget {
  const _UpdateMemberContactDialog({
    required this.initialValue,
    required this.isValidMobile,
    required this.onSave,
  });

  final String initialValue;
  final bool Function(String? value) isValidMobile;
  final Future<void> Function(String value) onSave;

  @override
  State<_UpdateMemberContactDialog> createState() => _UpdateMemberContactDialogState();
}

class _UpdateMemberContactDialogState extends State<_UpdateMemberContactDialog> {
  late final TextEditingController controller =
      TextEditingController(text: widget.initialValue);
  final formKey = GlobalKey<FormState>();
  bool submitting = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (submitting || !formKey.currentState!.validate()) return;
    setState(() => submitting = true);
    try {
      await widget.onSave(controller.text.trim());
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Update mobile number'),
    content: Form(
      key: formKey,
      child: TextFormField(
        controller: controller,
        keyboardType: TextInputType.phone,
        maxLength: 10,
        enabled: !submitting,
        decoration: const InputDecoration(labelText: 'Mobile number', prefixText: '+91 '),
        validator: (value) => widget.isValidMobile(value)
            ? null
            : 'Enter a valid 10 digit mobile number',
      ),
    ),
    actions: [
      TextButton(
        onPressed: submitting ? null : () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: submitting ? null : submit,
        child: submitting
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : const Text('Save'),
      ),
    ],
  );
}

const roles = ['TENANT_ADMIN', 'CONTENT_MANAGER', 'EVENT_MANAGER', 'INVENTORY_MANAGER', 'FINANCE_VIEWER', 'FINANCE_OPERATOR', 'FINANCE_APPROVER', 'CA_AUDITOR'];
String roleLabel(String role) => role.split('_').map((part) => part[0] + part.substring(1).toLowerCase()).join(' ');

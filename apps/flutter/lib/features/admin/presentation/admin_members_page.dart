import 'package:flutter/material.dart';

class AdminMembersPage extends StatefulWidget {
  const AdminMembersPage({super.key});

  @override
  State<AdminMembersPage> createState() => _AdminMembersPageState();
}

class _AdminMembersPageState extends State<AdminMembersPage> {
  final List<_Member> _members = [
    const _Member('Community Admin', 'admin@example.com', 'TENANT_ADMIN'),
    const _Member('Content Manager', 'content@example.com', 'CONTENT_MANAGER'),
  ];

  void _showAddMember() {
    final userController = TextEditingController();
    var role = 'MEMBER';
    final formKey = GlobalKey<FormState>();

    showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add member'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: userController,
                  decoration: const InputDecoration(labelText: 'User ID'),
                  validator: (value) =>
                      value == null || value.trim().isEmpty ? 'User ID is required' : null,
                ),
                DropdownButtonFormField<String>(
                  value: role == 'MEMBER' ? 'CONTENT_MANAGER' : role,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: _roles
                      .map((r) => DropdownMenuItem(value: r, child: Text(_roleLabel(r))))
                      .toList(),
                  onChanged: (value) => setDialogState(() => role = value!),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                if (!formKey.currentState!.validate()) return;
                setState(() => _members.add(
                  _Member('New member', userController.text.trim(), role == 'MEMBER' ? 'CONTENT_MANAGER' : role),
                ));
                Navigator.pop(context);
                ScaffoldMessenger.of(this.context).showSnackBar(
                  const SnackBar(content: Text('Member added locally. API integration will follow.')),
                );
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    ).whenComplete(userController.dispose);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Members'),
        actions: [
          IconButton(
            tooltip: 'Add member',
            onPressed: _showAddMember,
            icon: const Icon(Icons.person_add_outlined),
          ),
        ],
      ),
      body: _members.isEmpty
          ? const Center(child: Text('No members yet'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _members.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final member = _members[index];
                return ListTile(
                  leading: CircleAvatar(child: Text(member.name.substring(0, 1))),
                  title: Text(member.name),
                  subtitle: Text(member.email),
                  trailing: PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'remove') {
                        setState(() => _members.removeAt(index));
                      } else if (value == 'role') {
                        _changeRole(index);
                      }
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'role', child: Text('Change role')),
                      PopupMenuItem(value: 'remove', child: Text('Remove member')),
                    ],
                  ),
                );
              },
            ),
    );
  }

  void _changeRole(int index) {
    var role = _members[index].role;
    showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Change role'),
          content: DropdownButtonFormField<String>(
            value: role,
            items: _roles
                .map((r) => DropdownMenuItem(value: r, child: Text(_roleLabel(r))))
                .toList(),
            onChanged: (value) => setDialogState(() => role = value!),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                setState(() => _members[index] = _members[index].copyWith(role: role));
                Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }
}

const _roles = [
  'TENANT_ADMIN',
  'CONTENT_MANAGER',
  'EVENT_MANAGER',
  'INVENTORY_MANAGER',
  'FINANCE_VIEWER',
  'FINANCE_OPERATOR',
  'FINANCE_APPROVER',
  'CA_AUDITOR',
];

String _roleLabel(String role) => role
    .split('_')
    .map((part) => part[0] + part.substring(1).toLowerCase())
    .join(' ');

class _Member {
  const _Member(this.name, this.email, this.role);

  final String name;
  final String email;
  final String role;

  _Member copyWith({String? role}) => _Member(name, email, role ?? this.role);
}

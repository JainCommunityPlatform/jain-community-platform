import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_routes.dart';

import '../../../core/api/api_client.dart';

class PlatformAdminPage extends StatefulWidget {
  const PlatformAdminPage({required this.api, super.key});

  final ApiClient api;

  @override
  State<PlatformAdminPage> createState() => _PlatformAdminPageState();
}

class _PlatformAdminPageState extends State<PlatformAdminPage> {
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _hostname = TextEditingController();
  final _adminEmail = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _postalCode = TextEditingController();

  List<dynamic> _tenants = [];
  bool _loading = true;
  bool _saving = false;
  bool _showCreate = false;
  String? _message;
  String? _lastTenantId;
  Map<String, dynamic>? _domainVerification;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in [
      _name, _slug, _hostname, _adminEmail, _address, _city, _state, _postalCode,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _tenants = await widget.api.getList('/api/platform/tenants');
    } catch (error) {
      _message = 'Unable to load temples: $error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      final result = await widget.api.post('/api/platform/tenants', body: {
        'name': _name.text.trim(),
        'slug': _slug.text.trim(),
        if (_hostname.text.trim().isNotEmpty) 'customHostname': _hostname.text.trim(),
        if (_adminEmail.text.trim().isNotEmpty) 'adminEmail': _adminEmail.text.trim(),
        if (_address.text.trim().isNotEmpty) 'address': _address.text.trim(),
        if (_city.text.trim().isNotEmpty) 'city': _city.text.trim(),
        if (_state.text.trim().isNotEmpty) 'state': _state.text.trim(),
        if (_postalCode.text.trim().isNotEmpty) 'postalCode': _postalCode.text.trim(),
      });
      _lastTenantId = result['id'] as String?;
      _domainVerification = result['domainVerification'] is Map
          ? Map<String, dynamic>.from(result['domainVerification'] as Map)
          : null;
      _message = 'Temple created successfully.';
      _clearCreateForm();
      await _load();
    } catch (error) {
      _message = 'Temple creation failed: $error';
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
          _showCreate = false;
        });
      }
    }
  }

  void _clearCreateForm() {
    for (final controller in [
      _name, _slug, _hostname, _adminEmail, _address, _city, _state, _postalCode,
    ]) {
      controller.clear();
    }
  }

  Future<void> _editTenant(Map<String, dynamic> tenant) async {
    final name = TextEditingController(text: tenant['name']?.toString() ?? '');
    final address = TextEditingController(text: tenant['address']?.toString() ?? '');
    final city = TextEditingController(text: tenant['city']?.toString() ?? '');
    final state = TextEditingController(text: tenant['state']?.toString() ?? '');
    final pin = TextEditingController(text: tenant['postalCode']?.toString() ?? '');
    final hostname = TextEditingController(text: tenant['hostname']?.toString() ?? '');

    try {
      final saved = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Edit temple'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: MediaQuery.sizeOf(dialogContext).width * 0.82,
              child: Column(
                children: [
                  _dialogField(name, 'Temple name'),
                  _dialogField(hostname, 'Primary domain'),
                  _dialogField(address, 'Address', maxLines: 2),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      if (constraints.maxWidth < 440) {
                        return Column(
                          children: [
                            _dialogField(city, 'City'),
                            _dialogField(state, 'State'),
                            _dialogField(pin, 'PIN'),
                          ],
                        );
                      }
                      return Row(
                        children: [
                          Expanded(child: _dialogField(city, 'City')),
                          const SizedBox(width: 8),
                          Expanded(child: _dialogField(state, 'State')),
                          const SizedBox(width: 8),
                          Expanded(child: _dialogField(pin, 'PIN')),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 18),
                  _AdminManagement(api: widget.api, tenantId: tenant['id'].toString()),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                try {
                  await widget.api.put('/api/platform/tenants/${tenant['id']}', body: {
                    'name': name.text.trim(),
                    'customHostname': hostname.text.trim(),
                    'address': address.text.trim(),
                    'city': city.text.trim(),
                    'state': state.text.trim(),
                    'postalCode': pin.text.trim(),
                  });
                  if (dialogContext.mounted) Navigator.of(dialogContext).pop(true);
                } catch (error) {
                  if (dialogContext.mounted) {
                    ScaffoldMessenger.of(dialogContext).showSnackBar(
                      SnackBar(content: Text('Save failed: $error')),
                    );
                  }
                }
              },
              child: const Text('Save changes'),
            ),
          ],
        ),
      );
      if (saved == true) {
        setState(() => _message = 'Temple details updated.');
        await _load();
      }
    } finally {
      for (final controller in [name, address, city, state, pin, hostname]) {
        controller.dispose();
      }
    }
  }

  Future<void> _verifyDomain() async {
    final tenantId = _lastTenantId;
    if (tenantId == null) return;
    setState(() => _saving = true);
    try {
      final result = await widget.api.post('/api/platform/tenants/$tenantId/domain/verify');
      _domainVerification = Map<String, dynamic>.from(result);
      _message = result['verified'] == true
          ? 'Custom domain verified.'
          : result['message']?.toString() ?? 'Domain is not verified yet.';
    } catch (error) {
      _message = 'Domain verification failed: $error';
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) {
      return const Scaffold(body: _BusyState(message: 'Loading temple administration…'));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('JCP Administration'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _saving ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 5,
        onDestinationSelected: (index) {
          if (index == 5) return;
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
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 32),
        children: [
          _AdminHero(theme: theme, onAdd: () => setState(() => _showCreate = !_showCreate)),
          if (_message != null) ...[
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: Icon(Icons.check_circle_outline, color: theme.colorScheme.primary),
                title: Text(_message!),
              ),
            ),
          ],
          if (_showCreate) ...[
            const SizedBox(height: 12),
            _CreateTempleCard(
              name: _name,
              slug: _slug,
              hostname: _hostname,
              adminEmail: _adminEmail,
              address: _address,
              city: _city,
              state: _state,
              postalCode: _postalCode,
              saving: _saving,
              onCreate: _create,
            ),
          ],
          if (_domainVerification != null) ...[
            const SizedBox(height: 12),
            _DomainVerificationCard(
              verification: _domainVerification!,
              saving: _saving,
              onVerify: _verifyDomain,
            ),
          ],
          const SizedBox(height: 22),
          Text('Your temples', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          if (_tenants.isEmpty)
            const _EmptyState(message: 'No temples have been onboarded yet.')
          else
            ..._tenants.map((item) {
              final tenant = Map<String, dynamic>.from(item as Map);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _TenantAdminCard(
                  tenant: tenant,
                  onEdit: () => _editTenant(tenant),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _AdminHero extends StatelessWidget {
  const _AdminHero({required this.theme, required this.onAdd});

  final ThemeData theme;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(22),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(28),
      gradient: LinearGradient(
        colors: [
          theme.colorScheme.secondary,
          theme.colorScheme.primary,
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      boxShadow: const [
        BoxShadow(blurRadius: 22, offset: Offset(0, 10)),
      ],
    ),
    child: LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 600;
        final heading = const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Temple administration',
              softWrap: true,
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Onboard temples, manage their administrators and maintain their details.',
              softWrap: true,
              style: TextStyle(color: Colors.white70),
            ),
          ],
        );
        final icon = Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Icon(Icons.temple_hindu, color: Colors.white, size: 34),
        );
        final addButton = FilledButton.icon(
          onPressed: onAdd,
          icon: const Icon(Icons.add),
          label: const Text('Add temple'),
        );

        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  icon,
                  const SizedBox(width: 12),
                  Expanded(child: heading),
                ],
              ),
              const SizedBox(height: 18),
              Align(alignment: Alignment.centerLeft, child: addButton),
            ],
          );
        }

        return Row(
          children: [
            icon,
            const SizedBox(width: 16),
            Expanded(child: heading),
            const SizedBox(width: 16),
            addButton,
          ],
        );
      },
    ),
  );
}

class _CreateTempleCard extends StatelessWidget {
  const _CreateTempleCard({
    required this.name,
    required this.slug,
    required this.hostname,
    required this.adminEmail,
    required this.address,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.saving,
    required this.onCreate,
  });

  final TextEditingController name;
  final TextEditingController slug;
  final TextEditingController hostname;
  final TextEditingController adminEmail;
  final TextEditingController address;
  final TextEditingController city;
  final TextEditingController state;
  final TextEditingController postalCode;
  final bool saving;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('New temple', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          const Text('The temple admin can be assigned now or added later from Edit temple.'),
          const SizedBox(height: 16),
          _dialogField(name, 'Temple name'),
          _dialogField(slug, 'Slug, e.g. shree-adinath-jinalay'),
          _dialogField(hostname, 'Custom domain (optional)'),
          _dialogField(adminEmail, 'Temple admin email (optional)'),
          _dialogField(address, 'Address', maxLines: 2),
          Row(
            children: [
              Expanded(child: _dialogField(city, 'City')),
              const SizedBox(width: 8),
              Expanded(child: _dialogField(state, 'State')),
              const SizedBox(width: 8),
              Expanded(child: _dialogField(postalCode, 'PIN')),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: saving ? null : onCreate,
              icon: saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.temple_hindu),
              label: Text(saving ? 'Creating…' : 'Create temple'),
            ),
          ),
        ],
      ),
    ),
  );
}

class _TenantAdminCard extends StatelessWidget {
  const _TenantAdminCard({required this.tenant, required this.onEdit});

  final Map<String, dynamic> tenant;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onEdit,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: const Color(0xFFFFE0A6),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.temple_hindu, size: 34, color: Color(0xFFE65100)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tenant['name']?.toString() ?? 'Temple', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text([
                    tenant['city']?.toString() ?? '',
                    tenant['state']?.toString() ?? '',
                  ].where((value) => value.isNotEmpty).join(', ')),
                  const SizedBox(height: 4),
                  Text(tenant['hostname']?.toString() ?? '', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            const Icon(Icons.edit_outlined),
          ],
        ),
      ),
    ),
  );
}

class _AdminManagement extends StatefulWidget {
  const _AdminManagement({required this.api, required this.tenantId});

  final ApiClient api;
  final String tenantId;

  @override
  State<_AdminManagement> createState() => _AdminManagementState();
}

class _AdminManagementState extends State<_AdminManagement> {
  final _email = TextEditingController();
  List<dynamic> _admins = [];
  bool _loading = true;
  bool _adding = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _admins = await widget.api.getList('/api/platform/tenants/${widget.tenantId}/admins');
    } catch (error) {
      _message = 'Unable to load administrators: $error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _add() async {
    final email = _email.text.trim();
    if (email.isEmpty) return;
    setState(() {
      _adding = true;
      _message = null;
    });
    try {
      final result = await widget.api.post(
        '/api/platform/tenants/${widget.tenantId}/admins',
        body: {'email': email},
      );
      _message = result['status'] == 'invited'
          ? 'Invitation saved. The user will become a temple admin when they sign in with this email.'
          : 'Temple admin assigned.';
      _email.clear();
      await _load();
    } catch (error) {
      _message = 'Unable to add administrator: $error';
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Temple administrators', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Add an existing JCP user by email or create an invitation for a new user.'),
            if (_message != null) Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_message!),
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(12),
                child: LinearProgressIndicator(),
              )
            else ...[
              const SizedBox(height: 8),
              if (_admins.isEmpty)
                const Text('No temple administrators assigned yet.')
              else
                ..._admins.map((item) {
                  final admin = Map<String, dynamic>.from(item as Map);
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(child: Icon(Icons.person)),
                    title: Text(admin['user']?['displayName']?.toString() ?? 'JCP user'),
                    subtitle: Text(admin['user']?['email']?.toString() ?? admin['userId']?.toString() ?? ''),
                    trailing: const Chip(label: Text('ADMIN')),
                  );
                }),
              const SizedBox(height: 8),
              LayoutBuilder(
                builder: (context, constraints) {
                  final emailField = TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Administrator email',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                  );
                  final addButton = FilledButton(
                    onPressed: _adding ? null : _add,
                    child: _adding
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Add'),
                  );
                  if (constraints.maxWidth < 360) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        emailField,
                        const SizedBox(height: 8),
                        Align(alignment: Alignment.centerLeft, child: addButton),
                      ],
                    );
                  }
                  return Row(
                    children: [
                      Expanded(child: emailField),
                      const SizedBox(width: 8),
                      addButton,
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DomainVerificationCard extends StatelessWidget {
  const _DomainVerificationCard({
    required this.verification,
    required this.saving,
    required this.onVerify,
  });

  final Map<String, dynamic> verification;
  final bool saving;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Custom domain verification', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('TXT name: ${verification['txtRecordName'] ?? ''}'),
          Text('TXT value: ${verification['txtRecordValue'] ?? ''}'),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: saving ? null : onVerify,
            icon: saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.verified),
            label: const Text('Verify DNS'),
          ),
        ],
      ),
    ),
  );
}

class _BusyState extends StatelessWidget {
  const _BusyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(
          width: 42,
          height: 42,
          child: CircularProgressIndicator(strokeWidth: 3),
        ),
        const SizedBox(height: 14),
        Text(message),
      ],
    ),
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Center(child: Text(message)),
    ),
  );
}

Widget _dialogField(TextEditingController controller, String label, {int maxLines = 1}) =>
    Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        decoration: InputDecoration(labelText: label),
      ),
    );

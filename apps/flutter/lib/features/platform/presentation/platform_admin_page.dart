import 'package:flutter/material.dart';

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
    for (final c in [_name, _slug, _hostname, _adminEmail, _address, _city, _state, _postalCode]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _tenants = await widget.api.getList('/api/platform/tenants');
    } catch (error) {
      _message = 'लोड नहीं हुआ: $error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    setState(() { _saving = true; _message = null; });
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
      final hostname = result['hostname']?.toString() ?? '';
      final adminStatus = result['adminStatus']?.toString() ?? '';
      _message = 'Temple onboarded: $hostname. Admin: $adminStatus.';
      _lastTenantId = result['id'] as String?;
      _domainVerification = result['domainVerification'] is Map
          ? Map<String, dynamic>.from(result['domainVerification'] as Map)
          : null;
      _name.clear(); _slug.clear(); _hostname.clear(); _adminEmail.clear();
      await _load();
    } catch (error) {
      _message = 'Onboarding failed: $error';
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _verifyDomain() async {
    final tenantId = _lastTenantId;
    if (tenantId == null) return;
    try {
      final result = await widget.api.post('/api/platform/tenants/$tenantId/domain/verify');
      _domainVerification = Map<String, dynamic>.from(result);
      _message = result['verified'] == true
          ? 'Custom domain verified and public resolution is enabled.'
          : result['message']?.toString() ?? 'Domain is not verified yet.';
    } catch (error) {
      _message = 'Domain verification failed: $error';
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(title: const Text('JCP Temple Onboarding')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_message != null) Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(_message!))),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Add a temple', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 14),
                  _field(_name, 'Temple name'),
                  _field(_slug, 'Slug, e.g. shree-adinath-jinalay'),
                  _field(_hostname, 'Custom domain (optional)'),
                  _field(_adminEmail, 'Temple admin email'),
                  _field(_address, 'Address', maxLines: 2),
                  Row(children: [
                    Expanded(child: _field(_city, 'City')),
                    const SizedBox(width: 8),
                    Expanded(child: _field(_state, 'State')),
                    const SizedBox(width: 8),
                    Expanded(child: _field(_postalCode, 'PIN')),
                  ]),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: _saving ? null : _create,
                    icon: const Icon(Icons.add_business),
                    label: Text(_saving ? 'Creating…' : 'Create temple'),
                  ),
                ].expand((w) => [w, const SizedBox(height: 10)]).toList(),
              ),
            ),
          ),
          if (_domainVerification != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Custom domain verification', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text('TXT name: ${_domainVerification?['txtRecordName'] ?? ''}'),
                    Text('TXT value: ${_domainVerification?['txtRecordValue'] ?? ''}'),
                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: _verifyDomain,
                      icon: const Icon(Icons.verified),
                      label: const Text('Verify DNS'),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 10),
          const Text('Existing temples', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          ..._tenants.map((item) {
            final tenant = item as Map<String, dynamic>;
            return Card(
              child: ListTile(
                leading: const Icon(Icons.temple_hindu),
                title: Text(tenant['name'] as String? ?? ''),
                subtitle: Text([
                  tenant['city'] as String? ?? '',
                  tenant['hostname'] as String? ?? '',
                ].where((v) => v.isNotEmpty).join(' • ')),
              ),
            );
          }),
        ],
      ),
    );
  }
}

Widget _field(TextEditingController controller, String label, {int maxLines = 1}) =>
    TextField(controller: controller, maxLines: maxLines, decoration: InputDecoration(labelText: label));

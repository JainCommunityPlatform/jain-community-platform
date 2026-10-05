import 'package:flutter/material.dart';
class LinkContactPage extends StatefulWidget {
  const LinkContactPage({required this.onLink, super.key});
  final Future<void> Function(String value) onLink;
  @override State<LinkContactPage> createState() => _LinkContactPageState();
}
class _LinkContactPageState extends State<LinkContactPage> {
  final controller = TextEditingController();
  bool loading = false;
  String? error;
  Future<void> submit() async {
    final value = controller.text.trim();
    if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
      setState(() => error = 'Enter a valid 10 digit mobile number.'); return;
    }
    setState(() { loading = true; error = null; });
    try { await widget.onLink(value); }
    catch (_) { if (mounted) setState(() { loading = false; error = 'Unable to link this number. Please try again.'; }); }
  }
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Complete your profile')),
    body: ListView(padding: const EdgeInsets.all(24), children: [
      const Icon(Icons.phone_android, size: 64),
      const SizedBox(height: 20),
      const Text('Link your mobile number', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      const Text('We use your mobile number to connect you with your existing Jain community profile and event participation.'),
      const SizedBox(height: 24),
      TextField(controller: controller, keyboardType: TextInputType.phone, maxLength: 10, decoration: const InputDecoration(labelText: 'Mobile number', prefixText: '+91 ')),
      if (error != null) Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
      const SizedBox(height: 16),
      FilledButton(onPressed: loading ? null : submit, child: Text(loading ? 'Linking…' : 'Link mobile number')),
    ]),
  );
}

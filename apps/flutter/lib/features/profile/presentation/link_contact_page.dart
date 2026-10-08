import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';

class LinkContactPage extends StatefulWidget {
  const LinkContactPage({required this.onLink, super.key});

  final Future<void> Function(String value) onLink;

  @override
  State<LinkContactPage> createState() => _LinkContactPageState();
}

class _LinkContactPageState extends State<LinkContactPage> {
  final controller = TextEditingController();
  bool loading = false;
  String? error;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    final strings = AppStrings.of(context);
    final value = controller.text.trim();
    if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
      setState(() => error = strings.invalidMobile);
      return;
    }

    setState(() {
      loading = true;
      error = null;
    });

    try {
      await widget.onLink(value);
    } catch (_) {
      if (mounted) {
        setState(() {
          loading = false;
          error = strings.linkFailed;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(strings.completeProfile)),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 40),
            children: [
              const Icon(Icons.phone_android, size: 64),
              const SizedBox(height: 20),
              Text(
                strings.linkMobileTitle,
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 10),
              Text(
                strings.linkMobileDescription,
                style: const TextStyle(height: 1.5),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: controller,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                enabled: !loading,
                decoration: InputDecoration(
                  labelText: strings.mobileNumber,
                  prefixText: '+91 ',
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: loading ? null : submit,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (loading) ...[
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Text(loading ? strings.linking : strings.linkMobile),
                  ],
                ),
              ),
            ],
          ),
          if (loading)
            const _LinkingBanner(),
        ],
      ),
    );
  }
}

class _LinkingBanner extends StatelessWidget {
  const _LinkingBanner();

  @override
  Widget build(BuildContext context) => Positioned(
    top: 0,
    left: 0,
    right: 0,
    child: Material(
      elevation: 3,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          child: const Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 12),
              Expanded(child: Text('Linking your profile securely…')),
            ],
          ),
        ),
      ),
    ),
  );
}

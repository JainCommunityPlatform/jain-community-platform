import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../data/website_repository.dart';

class WebsiteEditorPage extends StatefulWidget {
  const WebsiteEditorPage({required this.repository, required this.tenantName, super.key});

  final WebsiteRepository repository;
  final String tenantName;

  @override
  State<WebsiteEditorPage> createState() => _WebsiteEditorPageState();
}

class _WebsiteEditorPageState extends State<WebsiteEditorPage> {
  Map<String, dynamic>? _site;
  bool _loading = true;
  bool _saving = false;
  String? _message;

  final _heroTitle = TextEditingController();
  final _heroSubtitle = TextEditingController();
  final _heroDescription = TextEditingController();
  final _heroCta = TextEditingController();
  final _heroImage = TextEditingController();
  final _aboutTitle = TextEditingController();
  final _aboutBody = TextEditingController();
  final _aboutImage = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _email = TextEditingController();
  final _mapUrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in [
      _heroTitle, _heroSubtitle, _heroDescription, _heroCta, _heroImage,
      _aboutTitle, _aboutBody, _aboutImage, _address, _phone, _whatsapp, _email, _mapUrl,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final site = await widget.repository.getSite();
      _site = site;
      final hero = _map(site['hero']);
      final about = _map(site['about']);
      final contact = _map(site['contact']);
      _heroTitle.text = hero['title'] as String? ?? widget.tenantName;
      _heroSubtitle.text = hero['subtitle'] as String? ?? '';
      _heroDescription.text = hero['description'] as String? ?? '';
      _heroCta.text = hero['ctaLabel'] as String? ?? '';
      _heroImage.text = hero['imageUrl'] as String? ?? '';
      _aboutTitle.text = about['title'] as String? ?? '';
      _aboutBody.text = about['body'] as String? ?? '';
      _aboutImage.text = about['imageUrl'] as String? ?? '';
      _address.text = contact['address'] as String? ?? '';
      _phone.text = contact['phone'] as String? ?? '';
      _whatsapp.text = contact['whatsapp'] as String? ?? '';
      _email.text = contact['email'] as String? ?? '';
      _mapUrl.text = contact['mapUrl'] as String? ?? '';
    } catch (error) {
      _message = 'लोड नहीं हो सका: $error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _uploadTo(TextEditingController target) async {
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) return;
      final url = await widget.repository.uploadImage(bytes, file.name);
      target.text = url;
      if (mounted) setState(() => _message = 'चित्र अपलोड हो गया।');
    } catch (error) {
      if (mounted) setState(() => _message = 'चित्र अपलोड नहीं हुआ: $error');
    }
  }

  Future<void> _save() async {
    final current = _site;
    if (current == null) return;
    setState(() { _saving = true; _message = null; });

    final next = Map<String, dynamic>.from(current);
    next['hero'] = {
      ..._map(current['hero']),
      'title': _heroTitle.text.trim(),
      'subtitle': _heroSubtitle.text.trim(),
      'description': _heroDescription.text.trim(),
      'ctaLabel': _heroCta.text.trim(),
      'imageUrl': _heroImage.text.trim(),
    };
    next['about'] = {
      ..._map(current['about']),
      'title': _aboutTitle.text.trim(),
      'body': _aboutBody.text.trim(),
      'imageUrl': _aboutImage.text.trim(),
    };
    next['contact'] = {
      ..._map(current['contact']),
      'address': _address.text.trim(),
      'phone': _phone.text.trim(),
      'whatsapp': _whatsapp.text.trim(),
      'email': _email.text.trim(),
      'mapUrl': _mapUrl.text.trim(),
    };

    try {
      _site = await widget.repository.updateSite(next);
      if (mounted) setState(() => _message = 'वेबसाइट अपडेट प्रकाशित हो गई।');
    } catch (error) {
      if (mounted) setState(() => _message = 'सहेजना विफल: $error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Temple Website Editor'),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else
            FilledButton.icon(onPressed: _save, icon: const Icon(Icons.publish), label: const Text('Publish')),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_message != null) _Message(message: _message!),
          _EditorSection(
            title: 'Hero / मुख्य भाग',
            children: [
              _field(_heroTitle, 'मंदिर का नाम / शीर्षक'),
              _field(_heroSubtitle, 'उपशीर्षक'),
              _field(_heroDescription, 'विवरण', maxLines: 3),
              _field(_heroCta, 'मुख्य बटन का टेक्स्ट'),
              _ImageField(controller: _heroImage, label: 'Hero image', onUpload: () => _uploadTo(_heroImage)),
            ],
          ),
          _EditorSection(
            title: 'मंदिर परिचय',
            children: [
              _field(_aboutTitle, 'शीर्षक'),
              _field(_aboutBody, 'परिचय', maxLines: 6),
              _ImageField(controller: _aboutImage, label: 'About image', onUpload: () => _uploadTo(_aboutImage)),
            ],
          ),
          _EditorSection(
            title: 'दर्शन / संपर्क',
            children: [
              _field(_address, 'पता', maxLines: 3),
              _field(_phone, 'फोन'),
              _field(_whatsapp, 'WhatsApp'),
              _field(_email, 'ईमेल'),
              _field(_mapUrl, 'Map URL'),
            ],
          ),
          _EditorSection(
            title: 'Shared tenant configuration',
            children: const [
              Text('यह configuration backend में tenant के लिए एक ही source of truth है। Public website और MyJinalay Android app दोनों इसी record को पढ़ते हैं।'),
              Text('कार्यक्रम, गैलरी, सेवा और quick-info cards भी इसी configuration में tenant-scoped हैं और अगले editor sections में इसी model को extend किया जा सकता है।'),
            ],
          ),
        ],
      ),
    );
  }
}

class _EditorSection extends StatelessWidget {
  const _EditorSection({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 14),
        ...children.expand((child) => [child, const SizedBox(height: 10)]),
      ]),
    ),
  );
}

class _ImageField extends StatelessWidget {
  const _ImageField({required this.controller, required this.label, required this.onUpload});
  final TextEditingController controller;
  final String label;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(child: TextField(controller: controller, decoration: InputDecoration(labelText: label))),
      const SizedBox(width: 8),
      OutlinedButton.icon(onPressed: onUpload, icon: const Icon(Icons.upload), label: const Text('Upload')),
    ],
  );
}

Widget _field(TextEditingController controller, String label, {int maxLines = 1}) =>
    TextField(controller: controller, maxLines: maxLines, decoration: InputDecoration(labelText: label));

class _Message extends StatelessWidget {
  const _Message({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(message))),
  );
}

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return {};
}

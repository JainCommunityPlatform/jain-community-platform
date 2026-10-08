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
  final _primaryColor = TextEditingController();
  final _secondaryColor = TextEditingController();
  final _backgroundColor = TextEditingController();
  final _surfaceColor = TextEditingController();
  final _accentColor = TextEditingController();
  final _languages = TextEditingController();
  final _availableLanguages = const ['हिन्दी', 'मराठी', 'English', 'ગુજરાતી'];
  final Set<String> _selectedLanguages = {'हिन्दी', 'मराठी', 'English'};
  bool _uploading = false;
  final _logoUrl = TextEditingController();
  final _directoryTitle = TextEditingController();
  final _directorySubtitle = TextEditingController();
  final _directoryLimit = TextEditingController();
  final _eventsTitle = TextEditingController();
  final _galleryTitle = TextEditingController();
  final _sevaTitle = TextEditingController();
  bool _directoryEnabled = true;
  bool _eventsEnabled = true;
  bool _galleryEnabled = true;
  bool _sevaEnabled = true;

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
      _primaryColor, _secondaryColor, _backgroundColor, _surfaceColor, _accentColor, _languages, _logoUrl,
      _directoryTitle, _directorySubtitle, _directoryLimit, _eventsTitle, _galleryTitle, _sevaTitle,
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
      final theme = _map(site['theme']);
      final header = _map(site['header']);
      final directory = _map(site['templeDirectory']);
      final events = _map(site['events']);
      final gallery = _map(site['gallery']);
      final seva = _map(site['seva']);
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
      _primaryColor.text = theme['primary'] as String? ?? '#F57C00';
      _secondaryColor.text = theme['secondary'] as String? ?? '#8B2E1B';
      _backgroundColor.text = theme['background'] as String? ?? '#FFF4DE';
      _surfaceColor.text = theme['surface'] as String? ?? '#FFFDF8';
      _accentColor.text = theme['accent'] as String? ?? '#E65100';
      _selectedLanguages
        ..clear()
        ..addAll(
          (header['languages'] as List<dynamic>? ?? const [])
              .map((value) => value.toString())
              .where(_availableLanguages.contains),
        );
      if (_selectedLanguages.isEmpty) {
        _selectedLanguages.addAll(['हिन्दी', 'मराठी', 'English']);
      }
      _logoUrl.text = header['logoUrl'] as String? ?? '';
      _directoryTitle.text = directory['title'] as String? ?? 'मंदिर खोजें';
      _directorySubtitle.text = directory['subtitle'] as String? ?? '';
      _directoryLimit.text = (directory['limit'] ?? 6).toString();
      _eventsTitle.text = events['title'] as String? ?? 'चालू एवं आगामी कार्यक्रम';
      _galleryTitle.text = gallery['title'] as String? ?? 'हमारे मंदिर की एक झलक';
      _sevaTitle.text = seva['title'] as String? ?? 'सेवा में सहभागी बनें';
      _directoryEnabled = directory['enabled'] as bool? ?? true;
      _eventsEnabled = events['enabled'] as bool? ?? true;
      _galleryEnabled = gallery['enabled'] as bool? ?? true;
      _sevaEnabled = seva['enabled'] as bool? ?? true;
    } catch (error) {
      _message = 'लोड नहीं हो सका: $error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _uploadTo(TextEditingController target) async {
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;
      final file = result.files.single;
      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) return;
      if (mounted) setState(() => _uploading = true);
      final url = await widget.repository.uploadImage(bytes, file.name);
      target.text = url;
      if (mounted) setState(() => _message = 'चित्र अपलोड हो गया।');
    } catch (error) {
      if (mounted) setState(() => _message = 'चित्र अपलोड नहीं हुआ: $error');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    final current = _site;
    if (current == null) return;
    setState(() { _saving = true; _message = null; });

    final next = Map<String, dynamic>.from(current);
    next['theme'] = {
      ..._map(current['theme']),
      'primary': _primaryColor.text.trim(),
      'secondary': _secondaryColor.text.trim(),
      'background': _backgroundColor.text.trim(),
      'surface': _surfaceColor.text.trim(),
      'accent': _accentColor.text.trim(),
    };
    next['header'] = {
      ..._map(current['header']),
      'logoUrl': _logoUrl.text.trim(),
      'languages': _selectedLanguages.toList(),
    };

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
    next['templeDirectory'] = {
      ..._map(current['templeDirectory']),
      'enabled': _directoryEnabled,
      'title': _directoryTitle.text.trim(),
      'subtitle': _directorySubtitle.text.trim(),
      'limit': int.tryParse(_directoryLimit.text.trim()) ?? 6,
    };
    next['events'] = {
      ..._map(current['events']),
      'enabled': _eventsEnabled,
      'title': _eventsTitle.text.trim(),
    };
    next['gallery'] = {
      ..._map(current['gallery']),
      'enabled': _galleryEnabled,
      'title': _galleryTitle.text.trim(),
    };
    next['seva'] = {
      ..._map(current['seva']),
      'enabled': _sevaEnabled,
      'title': _sevaTitle.text.trim(),
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


  List<Map<String, dynamic>> _items(String section) {
    final value = _map(_site?[section])['items'];
    if (value is! List) return [];
    return value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
  }

  Future<Map<String, dynamic>?> _editItem({
    required String title,
    required Map<String, dynamic> initial,
    required List<String> fields,
    String? imageField,
  }) async {
    final controllers = <String, TextEditingController>{
      for (final field in fields)
        field: TextEditingController(text: initial[field]?.toString() ?? ''),
    };

    try {
      return await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (dialogContext, setDialogState) => AlertDialog(
            title: Text(title),
            content: SingleChildScrollView(
              child: SizedBox(
                width: 520,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final field in fields) ...[
                      TextField(
                        controller: controllers[field],
                        maxLines: field == 'description' || field == 'body' ? 4 : 1,
                        decoration: InputDecoration(labelText: _label(field)),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (imageField != null)
                      Row(
                        children: [
                          Expanded(child: Text(
                            controllers[imageField]?.text.isEmpty ?? true
                                ? 'चित्र अभी चुना नहीं गया'
                                : 'चित्र URL तैयार है',
                          )),
                          OutlinedButton.icon(
                            onPressed: () async {
                              final result = await FilePicker.pickFiles(
                                type: FileType.custom,
                                allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
                                withData: true,
                              );
                              if (result == null || result.files.isEmpty) return;
                              final file = result.files.single;
                              final bytes = file.bytes;
                              if (bytes == null || bytes.isEmpty) return;
                              try {
                                final url = await widget.repository.uploadImage(bytes, file.name);
                                controllers[imageField]?.text = url;
                                setDialogState(() {});
                              } catch (error) {
                                if (dialogContext.mounted) {
                                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                                    SnackBar(content: Text('Upload failed: $error')),
                                  );
                                }
                              }
                            },
                            icon: const Icon(Icons.upload),
                            label: const Text('Upload'),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(dialogContext).pop(), child: const Text('Cancel')),
              FilledButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop({
                    for (final field in fields)
                      field: controllers[field]!.text.trim(),
                  });
                },
                child: const Text('Save'),
              ),
            ],
          ),
        ),
      );
    } finally {
      for (final controller in controllers.values) {
        controller.dispose();
      }
    }
  }

  Future<void> _addOrEditItem({
    required String section,
    required String title,
    required Map<String, dynamic> emptyItem,
    required List<String> fields,
    String? imageField,
    int? index,
  }) async {
    final items = _items(section);
    final initial = index == null ? emptyItem : items[index];
    final result = await _editItem(
      title: title,
      initial: initial,
      fields: fields,
      imageField: imageField,
    );
    if (result == null || !mounted) return;

    final next = [...items];
    if (index == null) {
      next.add(result);
    } else {
      next[index] = result;
    }
    setState(() {
      final sectionMap = _map(_site![section]);
      sectionMap['items'] = next;
      _site![section] = sectionMap;
    });
  }

  void _removeItem(String section, int index) {
    final items = _items(section);
    if (index < 0 || index >= items.length) return;
    setState(() {
      final next = [...items]..removeAt(index);
      final sectionMap = _map(_site![section]);
      sectionMap['items'] = next;
      _site![section] = sectionMap;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Temple Website Editor'),
        actions: [
          if (_saving || _uploading)
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
          if (_uploading)
            const _BusyBanner(message: 'Uploading image securely…'),
          if (_message != null) _Message(message: _message!),
          _EditorSection(
            title: 'Theme & header',
            children: [
              _colorField(_primaryColor, 'Primary color'),
              _colorField(_secondaryColor, 'Secondary color'),
              _colorField(_backgroundColor, 'Background color'),
              _colorField(_surfaceColor, 'Surface color'),
              _colorField(_accentColor, 'Accent color'),
              const Text(
                'Languages available on this temple website',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _availableLanguages.map((language) {
                  final selected = _selectedLanguages.contains(language);
                  return FilterChip(
                    selected: selected,
                    label: Text(language),
                    onSelected: (value) => setState(() {
                      if (value) {
                        _selectedLanguages.add(language);
                      } else if (_selectedLanguages.length > 1) {
                        _selectedLanguages.remove(language);
                      }
                    }),
                  );
                }).toList(),
              ),
              _ImageField(controller: _logoUrl, label: 'Temple logo', onUpload: () => _uploadTo(_logoUrl)),
            ],
          ),
          _EditorSection(
            title: 'Section controls',
            children: [
              SwitchListTile(
                value: _directoryEnabled,
                onChanged: (value) => setState(() => _directoryEnabled = value),
                title: const Text('मंदिर खोजें section'),
              ),
              _field(_directoryTitle, 'Temple directory title'),
              _field(_directorySubtitle, 'Temple directory subtitle'),
              _field(_directoryLimit, 'Temple directory card limit'),
              SwitchListTile(
                value: _eventsEnabled,
                onChanged: (value) => setState(() => _eventsEnabled = value),
                title: const Text('कार्यक्रम section'),
              ),
              _field(_eventsTitle, 'Events section title'),
              SwitchListTile(
                value: _galleryEnabled,
                onChanged: (value) => setState(() => _galleryEnabled = value),
                title: const Text('Gallery section'),
              ),
              _field(_galleryTitle, 'Gallery section title'),
              SwitchListTile(
                value: _sevaEnabled,
                onChanged: (value) => setState(() => _sevaEnabled = value),
                title: const Text('Seva section'),
              ),
              _field(_sevaTitle, 'Seva section title'),
            ],
          ),
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
          _ListEditorSection(
            title: 'आज की जानकारी / Quick info',
            items: _items('quickInfo'),
            itemTitle: (item) => item['title']?.toString() ?? 'Card',
            onAdd: () => _addOrEditItem(
              section: 'quickInfo',
              title: 'Quick info card',
              emptyItem: {'type': 'today', 'title': '', 'value': '', 'secondary': ''},
              fields: ['type', 'title', 'value', 'secondary'],
            ),
            onEdit: (index) => _addOrEditItem(
              section: 'quickInfo',
              title: 'Quick info card',
              emptyItem: {},
              fields: ['type', 'title', 'value', 'secondary'],
              index: index,
            ),
            onDelete: (index) => _removeItem('quickInfo', index),
          ),
          _ListEditorSection(
            title: 'चालू एवं आगामी कार्यक्रम',
            items: _items('events'),
            itemTitle: (item) => item['title']?.toString() ?? 'कार्यक्रम',
            onAdd: () => _addOrEditItem(
              section: 'events',
              title: 'कार्यक्रम',
              emptyItem: {'id': DateTime.now().millisecondsSinceEpoch.toString(), 'title': '', 'badge': 'आगामी', 'dateLabel': '', 'description': '', 'imageUrl': ''},
              fields: ['title', 'badge', 'dateLabel', 'description', 'imageUrl', 'ctaLabel', 'ctaUrl'],
              imageField: 'imageUrl',
            ),
            onEdit: (index) => _addOrEditItem(
              section: 'events',
              title: 'कार्यक्रम',
              emptyItem: {},
              fields: ['title', 'badge', 'dateLabel', 'description', 'imageUrl', 'ctaLabel', 'ctaUrl'],
              imageField: 'imageUrl',
              index: index,
            ),
            onDelete: (index) => _removeItem('events', index),
          ),
          _ListEditorSection(
            title: 'मंदिर गैलरी',
            items: _items('gallery'),
            itemTitle: (item) => item['title']?.toString() ?? 'Gallery image',
            onAdd: () => _addOrEditItem(
              section: 'gallery',
              title: 'Gallery image',
              emptyItem: {'id': DateTime.now().millisecondsSinceEpoch.toString(), 'title': '', 'imageUrl': '', 'alt': ''},
              fields: ['title', 'imageUrl', 'alt'],
              imageField: 'imageUrl',
            ),
            onEdit: (index) => _addOrEditItem(
              section: 'gallery',
              title: 'Gallery image',
              emptyItem: {},
              fields: ['title', 'imageUrl', 'alt'],
              imageField: 'imageUrl',
              index: index,
            ),
            onDelete: (index) => _removeItem('gallery', index),
          ),
          _ListEditorSection(
            title: 'सेवा में सहभागी बनें',
            items: _items('seva'),
            itemTitle: (item) => item['label']?.toString() ?? 'सेवा',
            onAdd: () => _addOrEditItem(
              section: 'seva',
              title: 'सेवा',
              emptyItem: {'id': DateTime.now().millisecondsSinceEpoch.toString(), 'icon': 'local_florist', 'label': '', 'subtitle': '', 'target': ''},
              fields: ['icon', 'label', 'subtitle', 'target'],
            ),
            onEdit: (index) => _addOrEditItem(
              section: 'seva',
              title: 'सेवा',
              emptyItem: {},
              fields: ['icon', 'label', 'subtitle', 'target'],
              index: index,
            ),
            onDelete: (index) => _removeItem('seva', index),
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

String _label(String field) => switch (field) {
  'imageUrl' => 'Image URL',
  'dateLabel' => 'Date / time label',
  'ctaLabel' => 'Button text',
  'ctaUrl' => 'Button target URL',
  'alt' => 'Alt text',
  'secondary' => 'Secondary text',
  _ => field,
};

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return {};
}


class _ListEditorSection extends StatelessWidget {
  const _ListEditorSection({
    required this.title,
    required this.items,
    required this.itemTitle,
    required this.onAdd,
    required this.onEdit,
    required this.onDelete,
  });

  final String title;
  final List<Map<String, dynamic>> items;
  final String Function(Map<String, dynamic>) itemTitle;
  final VoidCallback onAdd;
  final ValueChanged<int> onEdit;
  final ValueChanged<int> onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
                OutlinedButton.icon(onPressed: onAdd, icon: const Icon(Icons.add), label: const Text('Add')),
              ],
            ),
            const SizedBox(height: 10),
            if (items.isEmpty)
              const Text('अभी कोई item नहीं है।')
            else
              ...List.generate(items.length, (index) {
                final item = items[index];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.drag_indicator),
                  title: Text(itemTitle(item)),
                  subtitle: Text(item['imageUrl']?.toString().isNotEmpty == true ? 'Image configured' : ''),
                  trailing: Wrap(
                    children: [
                      IconButton(onPressed: () => onEdit(index), icon: const Icon(Icons.edit)),
                      IconButton(onPressed: () => onDelete(index), icon: const Icon(Icons.delete_outline)),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _BusyBanner extends StatelessWidget {
  const _BusyBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      children: [
        const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
        const SizedBox(width: 12),
        Expanded(child: Text(message)),
      ],
    ),
  );
}

Widget _colorField(TextEditingController controller, String label) => StatefulBuilder(
  builder: (context, setState) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          labelText: '$label (#RRGGBB)',
          prefixIcon: Padding(
            padding: const EdgeInsets.all(12),
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: _parseEditorColor(controller.text),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.black26),
              ),
            ),
          ),
          suffixIcon: IconButton(
            tooltip: 'Choose from Jain palette',
            icon: const Icon(Icons.palette_outlined),
            onPressed: () async {
              final selected = await showDialog<String>(
                context: context,
                builder: (dialogContext) => SimpleDialog(
                  title: const Text('Choose a color'),
                  children: const [
                    _PaletteOption(name: 'Jain saffron', value: '#F57C00'),
                    _PaletteOption(name: 'Deep maroon', value: '#8B2E1B'),
                    _PaletteOption(name: 'Cream', value: '#FFF4DE'),
                    _PaletteOption(name: 'Warm surface', value: '#FFFDF8'),
                    _PaletteOption(name: 'Accent orange', value: '#E65100'),
                    _PaletteOption(name: 'Temple gold', value: '#C58B24'),
                  ],
                ),
              );
              if (selected != null) {
                controller.text = selected;
                setState(() {});
              }
            },
          ),
        ),
      ),
    );
  },
);

Color _parseEditorColor(String value) {
  final raw = value.trim().replaceFirst('#', '');
  final normalized = raw.length == 6 ? 'FF$raw' : raw;
  final parsed = int.tryParse(normalized, radix: 16);
  return parsed == null ? Colors.transparent : Color(parsed);
}

class _PaletteOption extends StatelessWidget {
  const _PaletteOption({required this.name, required this.value});

  final String name;
  final String value;

  @override
  Widget build(BuildContext context) => SimpleDialogOption(
    onPressed: () => Navigator.of(context).pop(value),
    child: Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: _parseEditorColor(value),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.black26),
          ),
        ),
        const SizedBox(width: 12),
        Text(name),
        const Spacer(),
        Text(value),
      ],
    ),
  );
}

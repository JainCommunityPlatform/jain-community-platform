import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_routes.dart';

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
  final _availableLanguages = const ['हिन्दी', 'मराठी', 'English', 'ગુજરાતી'];
  final Set<String> _selectedLanguages = {'हिन्दी', 'मराठी', 'English'};
  TextEditingController? _uploadingTarget;
  final Map<TextEditingController, String> _imageMessages = {};
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
      _primaryColor, _secondaryColor, _backgroundColor, _surfaceColor, _accentColor, _logoUrl,
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
      if (bytes == null || bytes.isEmpty) {
        if (mounted) setState(() => _message = 'Could not read the selected image.');
        return;
      }
      if (bytes.length > 10 * 1024 * 1024) {
        if (mounted) setState(() => _message = 'Please choose an image smaller than 10 MB.');
        return;
      }
      if (!mounted) return;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Preview image'),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 280),
                  child: Image.memory(bytes, fit: BoxFit.contain),
                ),
                const SizedBox(height: 12),
                Text(file.name, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text('${(bytes.length / 1024).ceil()} KB'),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Discard')),
            FilledButton.icon(
              onPressed: () => Navigator.pop(dialogContext, true),
              icon: const Icon(Icons.cloud_upload_outlined),
              label: const Text('Confirm upload'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      setState(() { _uploadingTarget = target; _imageMessages.remove(target); _message = null; });
      final url = await widget.repository.uploadImage(bytes, file.name);
      target.text = url;
      if (mounted) setState(() => _imageMessages[target] = 'Image uploaded. Tap Save & Publish Website to publish this change.');
    } catch (error) {
      if (mounted) setState(() => _imageMessages[target] = 'Image upload failed: $error');
    } finally {
      if (mounted) setState(() { _uploadingTarget = null; });
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
          if (_saving || _uploadingTarget != null)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else
            FilledButton.icon(onPressed: _save, icon: const Icon(Icons.publish), label: const Text('Publish')),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_message != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: _Message(message: _message!),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving || _uploadingTarget != null ? null : _save,
                  icon: Icon(_saving ? Icons.hourglass_top : Icons.publish),
                  label: Text(_saving ? 'Publishing…' : 'Save & Publish Website'),
                ),
              ),
            ),
            NavigationBar(
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
                NavigationDestination(icon: Icon(Icons.web_outlined), selectedIcon: Icon(Icons.web), label: 'Website'),
              ],
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
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
              _ImageField(controller: _logoUrl, label: 'Temple logo', onUpload: () => _uploadTo(_logoUrl), isUploading: identical(_uploadingTarget, _logoUrl), message: _imageMessages[_logoUrl]),
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
              _ImageField(controller: _heroImage, label: 'Hero image', onUpload: () => _uploadTo(_heroImage), isUploading: identical(_uploadingTarget, _heroImage), message: _imageMessages[_heroImage]),
            ],
          ),
          _EditorSection(
            title: 'मंदिर परिचय',
            children: [
              _field(_aboutTitle, 'शीर्षक'),
              _field(_aboutBody, 'परिचय', maxLines: 6),
              _ImageField(controller: _aboutImage, label: 'About image', onUpload: () => _uploadTo(_aboutImage), isUploading: identical(_uploadingTarget, _aboutImage), message: _imageMessages[_aboutImage]),
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
          _TeamAccessSection(repository: widget.repository),
        ],
      ),
    );
  }
}


class _TeamAccessSection extends StatefulWidget {
  const _TeamAccessSection({required this.repository});

  final WebsiteRepository repository;

  @override
  State<_TeamAccessSection> createState() => _TeamAccessSectionState();
}

class _TeamAccessSectionState extends State<_TeamAccessSection> {
  static const _availableRoles = <String, String>{
    'TENANT_ADMIN': 'Temple administrator',
    'CONTENT_MANAGER': 'Content manager',
    'EVENT_MANAGER': 'Event manager',
    'FINANCE_VIEWER': 'Finance — view',
    'FINANCE_OPERATOR': 'Finance — operator',
    'FINANCE_APPROVER': 'Finance — approver',
    'INVENTORY_MANAGER': 'Inventory manager',
    'CA_AUDITOR': 'Auditor',
  };

  final _email = TextEditingController();
  final Set<String> _selectedRoles = {};
  List<Map<String, dynamic>> _memberships = [];
  bool _loading = true;
  bool _saving = false;
  String? _message;
  bool _error = false;

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
      final result = await widget.repository.listTenantMemberships();
      _memberships = result
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      _error = false;
    } catch (error) {
      _message = 'Unable to load temple team: $error';
      _error = true;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectMembership(Map<String, dynamic> membership) {
    final email = membership['email']?.toString();
    if (email == null || email.isEmpty) return;
    final roles = membership['roles'] is List
        ? (membership['roles'] as List).map((role) => role.toString()).toSet()
        : <String>{membership['role']?.toString() ?? ''};
    setState(() {
      _email.text = email;
      _selectedRoles
        ..clear()
        ..addAll(roles.where(_availableRoles.containsKey));
      _message = 'Editing roles for $email. Save to apply the selected roles.';
      _error = false;
    });
  }

  Future<void> _save() async {
    final email = _email.text.trim().toLowerCase();
    if (email.isEmpty || !email.contains('@')) {
      setState(() {
        _message = 'Enter a valid email address.';
        _error = true;
      });
      return;
    }
    if (_selectedRoles.isEmpty) {
      setState(() {
        _message = 'Select at least one role.';
        _error = true;
      });
      return;
    }

    setState(() {
      _saving = true;
      _message = null;
      _error = false;
    });
    try {
      await widget.repository.assignTenantRoles(
        email: email,
        roles: _availableRoles.keys.where(_selectedRoles.contains).toList(),
      );
      _email.clear();
      _selectedRoles.clear();
      _message = 'Temple team roles saved successfully.';
      await _load();
    } catch (error) {
      _message = 'Unable to save roles: $error';
      _error = true;
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        key: const PageStorageKey<String>('Temple team & roles'),
        initiallyExpanded: false,
        maintainState: true,
        tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        title: const Text(
          'Temple team & roles',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        subtitle: const Text('Assign multiple roles to a JCP user'),
        children: [
          const Text(
            'Enter the email of an existing JCP user. Selecting roles replaces that user’s role set for this temple; multiple roles can be selected together.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Existing JCP user email',
              prefixIcon: Icon(Icons.email_outlined),
            ),
          ),
          const SizedBox(height: 8),
          ..._availableRoles.entries.map((entry) => CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            value: _selectedRoles.contains(entry.key),
            title: Text(entry.value),
            subtitle: Text(entry.key, style: const TextStyle(fontSize: 11)),
            onChanged: (selected) => setState(() {
              if (selected == true) {
                _selectedRoles.add(entry.key);
              } else {
                _selectedRoles.remove(entry.key);
              }
            }),
          )),
          if (_message != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  _message!,
                  style: TextStyle(
                    color: _error ? Theme.of(context).colorScheme.error : null,
                  ),
                ),
              ),
            ),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: const Text('Save roles'),
            ),
          ),
          const SizedBox(height: 14),
          const Divider(),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('Current temple team', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(12),
              child: LinearProgressIndicator(),
            )
          else if (_memberships.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('No team members found yet.'),
              ),
            )
          else
            ..._memberships.map((membership) {
              final name = membership['displayName']?.toString();
              final email = membership['email']?.toString() ?? '';
              final roles = membership['roles'] is List
                  ? (membership['roles'] as List).map((role) => role.toString()).join(', ')
                  : membership['role']?.toString() ?? '';
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                title: Text(name?.isNotEmpty == true ? name! : email),
                subtitle: Text('$email\n$roles'),
                isThreeLine: true,
                trailing: IconButton(
                  tooltip: 'Edit roles',
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _selectMembership(membership),
                ),
              );
            }),
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
    margin: const EdgeInsets.only(bottom: 12),
    clipBehavior: Clip.antiAlias,
    child: ExpansionTile(
      initiallyExpanded: title == 'Theme & header',
      tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
      childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
      title: Text(
        title,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
      ),
      children: children
          .expand((child) => [child, const SizedBox(height: 10)])
          .toList(),
    ),
  );
}

class _ImageField extends StatelessWidget {
  const _ImageField({required this.controller, required this.label, required this.onUpload, this.isUploading = false, this.message});
  final TextEditingController controller;
  final String label;
  final VoidCallback onUpload;
  final bool isUploading;
  final String? message;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(children: [
        Expanded(child: TextField(controller: controller, decoration: InputDecoration(labelText: label))),
        const SizedBox(width: 8),
        OutlinedButton.icon(
          onPressed: isUploading ? null : onUpload,
          icon: isUploading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.upload),
          label: Text(isUploading ? 'Uploading…' : 'Choose image'),
        ),
      ]),
      if (isUploading) ...[
        const SizedBox(height: 6),
        const LinearProgressIndicator(),
        const SizedBox(height: 4),
        Text('Uploading this image…', style: Theme.of(context).textTheme.bodySmall),
      ],
      if (message != null) ...[
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: message!.startsWith('Image upload failed')
                ? Theme.of(context).colorScheme.errorContainer
                : Theme.of(context).colorScheme.secondaryContainer,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(message!),
        ),
      ],
      if (controller.text.trim().isNotEmpty) ...[
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.network(
            controller.text.trim(),
            height: 96,
            width: 144,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
        ),
      ],
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
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        key: PageStorageKey<String>(title),
        initiallyExpanded: false,
        maintainState: true,
        tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
        title: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
            ),
            OutlinedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('Add'),
            ),
          ],
        ),
        children: [
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(4, 8, 4, 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('अभी कोई item नहीं है।'),
              ),
            )
          else
            ...List.generate(items.length, (index) {
              final item = items[index];
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.drag_indicator),
                title: Text(itemTitle(item)),
                subtitle: Text(
                  item['imageUrl']?.toString().isNotEmpty == true
                      ? 'Image configured'
                      : '',
                ),
                trailing: Wrap(
                  children: [
                    IconButton(
                      onPressed: () => onEdit(index),
                      icon: const Icon(Icons.edit),
                    ),
                    IconButton(
                      onPressed: () => onDelete(index),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
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

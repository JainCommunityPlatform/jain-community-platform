import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_language.dart';
import '../../../core/i18n/app_strings.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/app_session_controller.dart';
import '../../../core/tenant/tenant_selection_controller.dart';
import '../../tenant/data/tenant_repository.dart';
import '../data/website_repository.dart';

class TenantHomePage extends StatefulWidget {
  const TenantHomePage({
    required this.selection,
    required this.tenantRepository,
    required this.websiteRepository,
    this.onSelectTenant,
    required this.sessionController,
    super.key,
  });

  final TenantSelectionController selection;
  final TenantRepository tenantRepository;
  final WebsiteRepository websiteRepository;
  final FutureOr<void> Function(TenantSummary)? onSelectTenant;
  final AppSessionController sessionController;

  @override
  State<TenantHomePage> createState() => _TenantHomePageState();
}

class _TenantHomePageState extends State<TenantHomePage> {
  late Future<Map<String, dynamic>> _siteFuture;

  @override
  void initState() {
    super.initState();
    _siteFuture = widget.selection.selected == null
        ? Future.value(<String, dynamic>{})
        : widget.websiteRepository.getSite();
  }

  @override
  void didUpdateWidget(covariant TenantHomePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selection.tenantId != widget.selection.tenantId) {
      _siteFuture = widget.selection.selected == null
          ? Future.value(<String, dynamic>{})
          : widget.websiteRepository.getSite();
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenant = widget.selection.selected;
    if (tenant == null) {
      return TempleDirectoryPage(
        repository: widget.tenantRepository,
        selection: widget.selection,
        onSelect: widget.onSelectTenant,
        showPlatformAdmin: widget.sessionController.session.isPlatformAdmin,
        showSignIn: !widget.sessionController.session.isAuthenticated,
      );
    }

    return FutureBuilder<Map<String, dynamic>>(
      future: _siteFuture,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _ErrorPage(
            message: AppStrings.of(context).siteLoadFailed,
            onRetry: () => setState(() => _siteFuture = widget.websiteRepository.getSite()),
          );
        }
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        return _WebsiteView(
          tenant: tenant,
          site: snapshot.data!,
          onFindTemples: () => widget.selection.select(null),
          showAdmin: widget.sessionController.session.isAdmin,
          showSignIn: !widget.sessionController.session.isAuthenticated,
        );
      },
    );
  }
}

class TempleDirectoryPage extends StatefulWidget {
  const TempleDirectoryPage({
    required this.repository,
    required this.selection,
    this.onSelect,
    this.showPlatformAdmin = false,
    this.showSignIn = true,
    super.key,
  });

  final TenantRepository repository;
  final TenantSelectionController selection;
  final FutureOr<void> Function(TenantSummary)? onSelect;
  final bool showPlatformAdmin;
  final bool showSignIn;
  final bool showSignIn;

  @override
  State<TempleDirectoryPage> createState() => _TempleDirectoryPageState();
}

class _TempleDirectoryPageState extends State<TempleDirectoryPage> {
  late Future<List<TenantSummary>> _future;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _future = widget.repository.listTemples();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFFFFF4DE),
      appBar: AppBar(
        title: const Text('MyJinalay', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          if (widget.showPlatformAdmin)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: TextButton.icon(
                onPressed: () => context.go(AppRoutes.platformAdmin),
                icon: const Icon(Icons.admin_panel_settings_outlined, size: 20),
                label: const Text('JCP Admin'),
              ),
            ),
          if (widget.showSignIn)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: FilledButton.tonalIcon(
                onPressed: () => context.go(AppRoutes.login),
                icon: const Icon(Icons.login, size: 18),
                label: Text(strings.signIn),
              ),
            ),
        ],
      ),
      body: FutureBuilder<List<TenantSummary>>(
        future: _future,
        builder: (context, snapshot) {
          final items = (snapshot.data ?? [])
              .where((item) =>
                  item.name.toLowerCase().contains(_query.toLowerCase()) ||
                  (item.city ?? '').toLowerCase().contains(_query.toLowerCase()))
              .toList();

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1180),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 40),
                children: [
                  _TempleDirectoryHero(strings: strings),
                  const SizedBox(height: 18),
                  Card(
                    elevation: 0,
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: TextField(
                        onChanged: (value) => setState(() => _query = value),
                        decoration: InputDecoration(
                          hintText: strings.searchTemple,
                          prefixIcon: const Icon(Icons.search),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          strings.temples,
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
                        ),
                      ),
                      if (snapshot.hasData)
                        Text('${items.length}', style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (snapshot.hasError)
                    _ErrorPage(
                      message: strings.directoryLoadFailed,
                      onRetry: () => setState(() => _future = widget.repository.listTemples()),
                    )
                  else if (!snapshot.hasData)
                    const Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (items.isEmpty)
                    _EmptyContent(message: strings.noTemples)
                  else
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final columns = constraints.maxWidth >= 1000
                            ? 4
                            : constraints.maxWidth >= 650
                                ? 3
                                : 2;
                        return GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: items.length,
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: columns,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 0.78,
                          ),
                          itemBuilder: (context, index) {
                            final temple = items[index];
                            return _TempleCard(
                              temple: temple,
                              onTap: () async {
                                widget.selection.select(temple.toContext());
                                await widget.onSelect?.call(temple);
                              },
                            );
                          },
                        );
                      },
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _TempleDirectoryHero extends StatelessWidget {
  const _TempleDirectoryHero({required this.strings});

  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.secondary,
            colors.primary,
            const Color(0xFFE8A32A),
          ],
        ),
        boxShadow: const [
          BoxShadow(blurRadius: 24, offset: Offset(0, 12)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.temple_hindu, color: Colors.white, size: 48),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '॥ जय जिनेन्द्र ॥',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.86),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  strings.findTemples,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _directoryDescription(strings),
                  style: const TextStyle(color: Colors.white70, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TempleCard extends StatelessWidget {
  const _TempleCard({required this.temple, required this.onTap});

  final TenantSummary temple;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _RemoteImage(url: temple.primaryImageUrl, icon: Icons.temple_hindu)),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(temple.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(
                    [temple.city, temple.state].whereType<String>().where((v) => v.isNotEmpty).join(', '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WebsiteView extends StatelessWidget {
  const _WebsiteView({
    required this.tenant,
    required this.site,
    required this.onFindTemples,
    required this.showAdmin,
    required this.showSignIn,
  });

  final dynamic tenant;
  final Map<String, dynamic> site;
  final VoidCallback onFindTemples;
  final bool showAdmin;
  final bool showSignIn;

  @override
  Widget build(BuildContext context) {
    final theme = _map(site['theme']);
    final header = _map(site['header']);
    final hero = _map(site['hero']);
    final quickInfo = _list(site['quickInfo']);
    final about = _map(site['about']);
    final directory = _map(site['templeDirectory']);
    final events = _map(site['events']);
    final gallery = _map(site['gallery']);
    final seva = _map(site['seva']);
    final contact = _map(site['contact']);
    final colors = ColorScheme.fromSeed(seedColor: _hex(theme['primary'], const Color(0xFFF57C00)));

    return Scaffold(
      backgroundColor: _hex(theme['background'], const Color(0xFFFFF4DE)),
      body: SelectionArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _Header(
              tenantName: tenant.name,
              header: header,
              onFindTemples: onFindTemples,
              colors: colors,
              showAdmin: showAdmin,
              showSignIn: showSignIn,
            )),
            SliverToBoxAdapter(child: _Hero(hero: hero, colors: colors)),
            SliverToBoxAdapter(child: _QuickInfo(items: quickInfo, colors: colors)),
            SliverToBoxAdapter(child: _About(about: about, colors: colors)),
            if (_bool(directory['enabled'], true))
              SliverToBoxAdapter(child: _DirectoryPreview(
                config: directory,
                onFindTemples: onFindTemples,
                colors: colors,
              )),
            if (_bool(events['enabled'], true))
              SliverToBoxAdapter(child: _Events(events: events, colors: colors)),
            if (_bool(gallery['enabled'], true))
              SliverToBoxAdapter(child: _Gallery(gallery: gallery, colors: colors)),
            if (_bool(seva['enabled'], true))
              SliverToBoxAdapter(child: _Seva(seva: seva, colors: colors)),
            SliverToBoxAdapter(child: _Contact(tenantName: tenant.name, contact: contact, colors: colors)),
            SliverToBoxAdapter(child: _Footer(site: site)),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.tenantName, required this.header, required this.onFindTemples, required this.colors, required this.showAdmin, required this.showSignIn});

  final String tenantName;
  final Map<String, dynamic> header;
  final VoidCallback onFindTemples;
  final ColorScheme colors;
  final bool showAdmin;
  final bool showSignIn;

  @override
  Widget build(BuildContext context) {
    final nav = _list(header['navItems']);
    final language = AppLanguageScope.maybeOf(context);
    final strings = AppStrings.of(context);
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFFFFBF1),
        boxShadow: [BoxShadow(blurRadius: 12, color: Color(0x22000000))],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          child: Row(
            children: [
              if ((header['logoUrl'] as String?)?.isNotEmpty ?? false)
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Image.network(header['logoUrl'] as String, width: 42, height: 42, fit: BoxFit.contain),
                )
              else
                const Icon(Icons.temple_hindu, size: 38, color: Color(0xFFE65100)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tenantName, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.w900, color: colors.secondary)),
                    const Text('MyJinalay • Jain Community Platform', style: TextStyle(fontSize: 11)),
                  ],
                ),
              ),
              if (MediaQuery.sizeOf(context).width > 720)
                ...nav.take(7).map((item) => TextButton(
                  onPressed: () {},
                  child: Text(item['label'] as String? ?? ''),
                )),
              IconButton(onPressed: onFindTemples, icon: const Icon(Icons.search)),
              if (showSignIn)
                TextButton(onPressed: () => context.go(AppRoutes.login), child: Text(strings.signIn)),
              if (language != null)
                _LanguageSelector(controller: language, strings: strings),
              if (showAdmin)
                IconButton(onPressed: () => context.go(AppRoutes.admin), icon: const Icon(Icons.admin_panel_settings)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.hero, required this.colors});

  final Map<String, dynamic> hero;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    final image = hero['imageUrl'] as String?;
    return Container(
      constraints: const BoxConstraints(minHeight: 380),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFFF8A00), Color(0xFFFFB52E), Color(0xFFFFF0CE)],
        ),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1180),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth > 760;
                final copy = Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(hero['eyebrow'] as String? ?? '॥ जय जिनेन्द्र ॥',
                          style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 14),
                      Text(hero['title'] as String? ?? '',
                          style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Color(0xFF7A1F12))),
                      if ((hero['subtitle'] as String?)?.isNotEmpty ?? false)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(hero['subtitle'] as String,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        ),
                      if ((hero['description'] as String?)?.isNotEmpty ?? false)
                        Padding(
                          padding: const EdgeInsets.only(top: 14),
                          child: Text(hero['description'] as String, style: const TextStyle(height: 1.5)),
                        ),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.visibility),
                        label: Text(hero['ctaLabel'] as String? ?? 'आज के दर्शन'),
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE64A19)),
                      ),
                    ],
                  ),
                );
                final visual = ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: _RemoteImage(url: image, icon: Icons.temple_hindu, height: wide ? 420 : 300),
                );
                return wide
                    ? Row(children: [Expanded(child: copy), Expanded(child: visual)])
                    : Column(children: [visual, copy]);
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickInfo extends StatelessWidget {
  const _QuickInfo({required this.items, required this.colors});

  final List<Map<String, dynamic>> items;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    return _Section(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columns = constraints.maxWidth > 900 ? 4 : constraints.maxWidth > 560 ? 2 : 1;
          final count = items.length > 4 ? 4 : items.length;
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: count,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.8,
            ),
            itemBuilder: (_, index) {
              final item = items[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: colors.primary.withValues(alpha: .12),
                        foregroundColor: colors.primary,
                        child: Icon(_infoIcon(item['type'] as String?)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(item['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w800)),
                          const SizedBox(height: 3),
                          Text(item['value'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                          if ((item['secondary'] as String?)?.isNotEmpty ?? false)
                            Text(item['secondary'] as String, style: const TextStyle(fontSize: 11)),
                        ],
                      )),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _About extends StatelessWidget {
  const _About({required this.about, required this.colors});

  final Map<String, dynamic> about;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    return _Section(
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth > 720;
            final image = _RemoteImage(url: about['imageUrl'] as String?, icon: Icons.self_improvement, height: wide ? 250 : 220);
            final copy = Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(about['title'] as String? ?? 'मंदिर',
                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: colors.secondary)),
                  const SizedBox(height: 10),
                  Text(about['body'] as String? ?? '', style: const TextStyle(height: 1.55)),
                ],
              ),
            );
            return wide ? Row(children: [Expanded(child: image), Expanded(child: copy)]) : Column(children: [image, copy]);
          },
        ),
      ),
    );
  }
}

class _DirectoryPreview extends StatelessWidget {
  const _DirectoryPreview({required this.config, required this.onFindTemples, required this.colors});

  final Map<String, dynamic> config;
  final VoidCallback onFindTemples;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    return _Section(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            title: config['title'] as String? ?? 'मंदिर खोजें',
            subtitle: config['subtitle'] as String?,
            action: 'सभी मंदिर देखें',
            onAction: onFindTemples,
            colors: colors,
          ),
          const SizedBox(height: 10),
          Card(
            child: ListTile(
              leading: const Icon(Icons.search),
              title: const Text('मंदिर का नाम, शहर या स्थान खोजें'),
              trailing: const Icon(Icons.arrow_forward),
              onTap: onFindTemples,
            ),
          ),
        ],
      ),
    );
  }
}

class _Events extends StatelessWidget {
  const _Events({required this.events, required this.colors});

  final Map<String, dynamic> events;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    final items = _list(events['items']);
    return _Section(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: events['title'] as String? ?? 'चालू एवं आगामी कार्यक्रम', colors: colors),
          const SizedBox(height: 14),
          if (items.isEmpty)
            const _EmptyContent(message: 'अभी कोई कार्यक्रम प्रकाशित नहीं है।')
          else
            _HorizontalCards(items: items, colors: colors),
        ],
      ),
    );
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({required this.gallery, required this.colors});

  final Map<String, dynamic> gallery;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    final items = _list(gallery['items']);
    return _Section(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: gallery['title'] as String? ?? 'हमारे मंदिर की एक झलक', colors: colors),
          const SizedBox(height: 14),
          if (items.isEmpty)
            const _EmptyContent(message: 'मंदिर की तस्वीरें जल्द प्रकाशित होंगी।')
          else
            SizedBox(
              height: 210,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (_, index) => ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: _RemoteImage(
                    url: items[index]['imageUrl'] as String?,
                    icon: Icons.photo_library,
                    width: 300,
                    height: 210,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Seva extends StatelessWidget {
  const _Seva({required this.seva, required this.colors});

  final Map<String, dynamic> seva;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    final items = _list(seva['items']);
    final strings = AppStrings.of(context);
    return _Section(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            title: seva['title'] as String? ?? strings.seva,
            colors: colors,
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth < 520
                  ? 2
                  : constraints.maxWidth < 850
                      ? 3
                      : 4;
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: constraints.maxWidth < 520 ? 1.15 : 1.35,
                ),
                itemBuilder: (_, index) {
                  final item = items[index];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _icon(item['icon'] as String?),
                            color: colors.primary,
                            size: 30,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _sevaLabel(
                              item['icon'] as String?,
                              item['label'] as String?,
                              strings,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          if ((item['subtitle'] as String?)?.isNotEmpty ?? false)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                item['subtitle'] as String,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Contact extends StatelessWidget {
  const _Contact({required this.tenantName, required this.contact, required this.colors});

  final String tenantName;
  final Map<String, dynamic> contact;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    final phone = contact['phone'] as String?;
    final whatsapp = contact['whatsapp'] as String?;
    return _Section(
      child: Card(
        color: colors.surface,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Wrap(
            spacing: 30,
            runSpacing: 16,
            children: [
              SizedBox(
                width: 320,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tenantName, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: colors.secondary)),
                    const SizedBox(height: 8),
                    if ((contact['address'] as String?)?.isNotEmpty ?? false) Text(contact['address'] as String),
                    if (phone?.isNotEmpty ?? false) Text('फोन: $phone'),
                    if (whatsapp?.isNotEmpty ?? false) Text('WhatsApp: $whatsapp'),
                    if ((contact['email'] as String?)?.isNotEmpty ?? false) Text(contact['email'] as String),
                  ],
                ),
              ),
              if ((contact['mapUrl'] as String?)?.isNotEmpty ?? false)
                FilledButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.map),
                  label: const Text('Google Maps पर देखें'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.site});

  final Map<String, dynamic> site;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFFE65100), Color(0xFFFFA000)]),
      ),
      child: Text(
        _map(site['footer'])['tagline'] as String? ?? 'MyJinalay',
        textAlign: TextAlign.center,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _HorizontalCards extends StatelessWidget {
  const _HorizontalCards({required this.items, required this.colors});

  final List<Map<String, dynamic>> items;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 260,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, index) {
          final item = items[index];
          return SizedBox(
            width: 300,
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _RemoteImage(url: item['imageUrl'] as String?, icon: Icons.event)),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if ((item['badge'] as String?)?.isNotEmpty ?? false)
                          Text(item['badge'] as String, style: TextStyle(color: colors.primary, fontWeight: FontWeight.w800)),
                        Text(item['title'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w900)),
                        if ((item['dateLabel'] as String?)?.isNotEmpty ?? false)
                          Text(item['dateLabel'] as String, style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFFFF4DE),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1180),
          child: Padding(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18), child: child),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.colors, this.subtitle, this.action, this.onAction});

  final String title;
  final String? subtitle;
  final String? action;
  final VoidCallback? onAction;
  final ColorScheme colors;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900, color: colors.secondary)),
              if (subtitle?.isNotEmpty ?? false) Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(subtitle!),
              ),
            ],
          ),
        ),
        if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
      ],
    );
  }
}

class _EmptyContent extends StatelessWidget {
  const _EmptyContent({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: const EdgeInsets.all(24), child: Center(child: Text(message))),
  );
}

class _RemoteImage extends StatelessWidget {
  const _RemoteImage({required this.url, required this.icon, this.width, this.height});

  final String? url;
  final IconData icon;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final value = url?.trim();
    if (value == null || value.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: const Color(0xFFFFE0A6),
        child: Center(child: Icon(icon, size: 70, color: const Color(0xFFE65100))),
      );
    }
    return Image.network(
      value,
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        width: width,
        height: height,
        color: const Color(0xFFFFE0A6),
        child: Center(child: Icon(icon, size: 70, color: const Color(0xFFE65100))),
      ),
    );
  }
}

class _ErrorPage extends StatelessWidget {
  const _ErrorPage({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(message),
        const SizedBox(height: 12),
        FilledButton(onPressed: onRetry, child: const Text('पुनः प्रयास करें')),
      ],
    )),
  );
}
class _LanguageSelector extends StatelessWidget {
  const _LanguageSelector({required this.controller, required this.strings});

  final AppLanguageController controller;
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<Locale>(
      tooltip: strings.language,
      icon: const Icon(Icons.translate),
      onSelected: (locale) {
        controller.setLocale(locale);
      },
      itemBuilder: (_) => AppLanguageController.supported
          .map(
            (locale) => PopupMenuItem<Locale>(
              value: locale,
              child: Row(
                children: [
                  if (locale.languageCode == controller.locale.languageCode)
                    const Icon(Icons.check, size: 18)
                  else
                    const SizedBox(width: 18),
                  const SizedBox(width: 8),
                  Text(strings.languageName(locale.languageCode)),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

String _directoryDescription(AppStrings strings) => switch (strings.languageCode) {
  'hi' => 'JCP में उपलब्ध मंदिरों को खोजें और उनकी पूरी वेबसाइट देखें।',
  'mr' => 'JCP वरील मंदिरे शोधा आणि त्यांची संपूर्ण वेबसाइट पहा.',
  'gu' => 'JCP પર ઉપલબ્ધ દેરાસરો શોધો અને તેમની સંપૂર્ણ વેબસાઇટ જુઓ.',
  _ => 'Find temples available on JCP and explore their complete websites.',
};

String _sevaLabel(String? icon, String? fallback, AppStrings strings) => switch (icon) {
  'favorite' => strings.foodSeva,
  'groups' => strings.volunteer,
  'temple_hindu' => strings.templeSeva,
  'local_florist' => strings.pooja,
  _ => fallback ?? '',
};

List<Map<String, dynamic>> _list(dynamic value) {
  if (value is! List) return [];
  return value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
}

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

bool _bool(dynamic value, bool fallback) => value is bool ? value : fallback;

Color _hex(dynamic value, Color fallback) {
  if (value is! String) return fallback;
  final raw = value.replaceFirst('#', '');
  final normalized = raw.length == 6 ? 'FF$raw' : raw;
  final parsed = int.tryParse(normalized, radix: 16);
  return parsed == null ? fallback : Color(parsed);
}

IconData _infoIcon(String? type) => switch (type) {
  'timings' => Icons.schedule,
  'program' => Icons.notifications_active,
  'location' => Icons.location_on,
  _ => Icons.calendar_month,
};

IconData _icon(String? value) => switch (value) {
  'temple_hindu' => Icons.temple_hindu,
  'favorite' => Icons.favorite,
  'groups' => Icons.groups,
  _ => Icons.local_florist,
};

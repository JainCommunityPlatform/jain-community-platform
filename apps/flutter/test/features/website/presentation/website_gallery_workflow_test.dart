import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/website/data/website_repository.dart';
import 'package:jain_community_platform/features/website/presentation/website_editor_page.dart';

class RecordingWebsiteRepository extends WebsiteRepository {
  RecordingWebsiteRepository(this.site)
      : super(ApiClient(baseUrl: Uri.parse('https://example.test/')));

  final Map<String, dynamic> site;
  Map<String, dynamic>? published;

  @override
  Future<Map<String, dynamic>> getSite() async =>
      Map<String, dynamic>.from(site);

  @override
  Future<Map<String, dynamic>> updateSite(Map<String, dynamic> config) async {
    published = Map<String, dynamic>.from(config);
    return Map<String, dynamic>.from(config);
  }
}

void main() {
  testWidgets('gallery item image URL is included when website is published',
      (tester) async {
    final site = <String, dynamic>{
      'tenantId': 'tenant-1',
      'theme': {
        'primary': '#F57C00',
        'secondary': '#8B2E1B',
        'background': '#FFF4DE',
        'surface': '#FFFDF8',
        'accent': '#E65100',
      },
      'header': {'languages': ['हिन्दी']},
      'hero': {'title': 'Bade Baba Kharadi', 'imageUrl': ''},
      'about': {},
      'contact': {},
      'templeDirectory': {'enabled': true, 'limit': 6},
      'events': {'enabled': true, 'items': []},
      'gallery': {'enabled': true, 'title': 'मंदिर गैलरी', 'items': []},
      'seva': {'enabled': true, 'items': []},
      'quickInfo': [],
    };
    final repository = RecordingWebsiteRepository(site);

    await tester.pumpWidget(MaterialApp(
      home: WebsiteEditorPage(
        repository: repository,
        tenantName: 'Bade Baba Kharadi',
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Theme & header'), findsOneWidget);
    final listView = find.byType(ListView).first;
    final editorScrollable = find.descendant(
      of: listView,
      matching: find.byType(Scrollable),
    ).first;
    await tester.scrollUntilVisible(
      find.text('मंदिर गैलरी'),
      240,
      scrollable: editorScrollable,
    );
    await tester.pumpAndSettle();

    final galleryCard = find.ancestor(
      of: find.text('मंदिर गैलरी'),
      matching: find.byType(Card),
    ).first;
    await tester.tap(find.descendant(
      of: galleryCard,
      matching: find.text('Add'),
    ));
    await tester.pumpAndSettle();

    Future<void> enterField(String label, String value) async {
      final field = find.byWidgetPredicate(
        (widget) => widget is TextField &&
            widget.decoration?.labelText == label,
      );
      expect(field, findsOneWidget, reason: 'Expected gallery field: $label');
      await tester.enterText(field, value);
    }

    await enterField('title', 'Main temple');
    await enterField('Image URL', 'https://cdn.example.test/gallery/main.jpg');
    await enterField('Alt text', 'Main temple entrance');
    await tester.tap(find.text('Save').last);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Save & Publish Website'));
    await tester.pumpAndSettle();

    expect(repository.published, isNotNull);
    final gallery = repository.published!['gallery'] as Map<String, dynamic>;
    final items = gallery['items'] as List<dynamic>;
    expect(items, hasLength(1));
    expect(items.single, containsPair('title', 'Main temple'));
    expect(
      items.single,
      containsPair('imageUrl', 'https://cdn.example.test/gallery/main.jpg'),
    );
    expect(items.single, containsPair('alt', 'Main temple entrance'));
    expect(tester.takeException(), isNull);
  });
}

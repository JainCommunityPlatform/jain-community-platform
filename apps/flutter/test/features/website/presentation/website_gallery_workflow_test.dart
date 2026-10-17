import 'dart:async';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
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
  String? uploadedFilename;
  Uint8List? uploadedBytes;
  bool failUpdate = false;
  bool failNextUpload = false;
  int uploadAttempts = 0;
  Completer<String>? uploadCompleter;

  @override
  Future<Map<String, dynamic>> getSite() async =>
      Map<String, dynamic>.from(site);

  @override
  Future<Map<String, dynamic>> updateSite(Map<String, dynamic> config) async {
    if (failUpdate) throw StateError('simulated save failure');
    published = Map<String, dynamic>.from(config);
    site
      ..clear()
      ..addAll(published!);
    return Map<String, dynamic>.from(config);
  }

  @override
  Future<String> uploadImage(Uint8List bytes, String filename) async {
    uploadAttempts++;
    uploadedFilename = filename;
    uploadedBytes = bytes;
    if (failNextUpload) {
      failNextUpload = false;
      throw StateError('simulated upload failure');
    }
    final pendingUpload = uploadCompleter;
    if (pendingUpload != null) return pendingUpload.future;
    return 'https://cdn.example.test/gallery/uploaded.jpg';
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
        imagePicker: () async => FilePickerResult([
          PlatformFile(
            name: 'gallery.jpg',
            size: 4,
            bytes: Uint8List.fromList([1, 2, 3, 4]),
          ),
        ]),
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
    await enterField('Alt text', 'Main temple entrance');
    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();
    expect(find.text('Image uploaded. Save this item, then Save & Publish Website.'), findsOneWidget);
    expect(repository.uploadedFilename, 'gallery.jpg');
    expect(repository.uploadedBytes, isNotNull);
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
      containsPair('imageUrl', 'https://cdn.example.test/gallery/uploaded.jpg'),
    );
    expect(items.single, containsPair('alt', 'Main temple entrance'));
    expect(tester.takeException(), isNull);
  });





  testWidgets('failed publish preserves the last published website when editor is reopened',
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

    Widget editor({Key? key}) => MaterialApp(
          home: WebsiteEditorPage(
            key: key,
            repository: repository,
            tenantName: 'Bade Baba Kharadi',
          ),
        );

    final heroTitle = find.byWidgetPredicate(
      (widget) => widget is TextField &&
          widget.decoration?.labelText == 'मंदिर का नाम / शीर्षक',
    );

    Future<void> openHeroSection() async {
      final heading = find.text('Hero / मुख्य भाग');
      final listView = find.byType(ListView).first;
      final editorScrollable = find.descendant(
        of: listView,
        matching: find.byType(Scrollable),
      ).first;
      await tester.scrollUntilVisible(
        heading,
        240,
        scrollable: editorScrollable,
      );
      if (!tester.any(heroTitle)) {
        await tester.tap(heading);
        await tester.pumpAndSettle();
      }
    }

    await tester.pumpWidget(editor());
    await tester.pumpAndSettle();
    await openHeroSection();
    await tester.enterText(heroTitle, 'Published title');
    await tester.tap(find.text('Save & Publish Website'));
    await tester.pumpAndSettle();

    expect(repository.site['hero'], containsPair('title', 'Published title'));
    final listView = find.byType(ListView).first;
    final editorScrollable = find.descendant(
      of: listView,
      matching: find.byType(Scrollable),
    ).first;
    await tester.scrollUntilVisible(
      find.text('वेबसाइट अपडेट प्रकाशित हो गई।'),
      -240,
      scrollable: editorScrollable,
    );
    expect(find.text('वेबसाइट अपडेट प्रकाशित हो गई।'), findsOneWidget);

    repository.failUpdate = true;
    await openHeroSection();
    await tester.enterText(heroTitle, 'Unpublished edit');
    await tester.tap(find.text('Save & Publish Website'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('सहेजना विफल: Bad state: simulated save failure'),
      -240,
      scrollable: editorScrollable,
    );

    expect(find.text('सहेजना विफल: Bad state: simulated save failure'), findsOneWidget);
    expect(repository.site['hero'], containsPair('title', 'Published title'));

    await tester.pumpWidget(editor(key: UniqueKey()));
    await tester.pumpAndSettle();
    await openHeroSection();

    expect(tester.widget<TextField>(heroTitle).controller!.text, 'Published title');
    expect(repository.site['hero'], isNot(containsPair('title', 'Unpublished edit')));
    expect(tester.takeException(), isNull);
  });

  testWidgets('gallery upload failure can be retried without duplicate successful uploads',
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
    final repository = RecordingWebsiteRepository(site)..failNextUpload = true;

    await tester.pumpWidget(MaterialApp(
      home: WebsiteEditorPage(
        repository: repository,
        tenantName: 'Bade Baba Kharadi',
        imagePicker: () async => FilePickerResult([
          PlatformFile(
            name: 'gallery.jpg',
            size: 4,
            bytes: Uint8List.fromList([0xff, 0xd8, 0xff, 0xd9]),
          ),
        ]),
      ),
    ));
    await tester.pumpAndSettle();

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
    await enterField('Alt text', 'Main temple entrance');
    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();

    expect(find.text('Upload failed: Bad state: simulated upload failure'), findsOneWidget);
    expect(repository.uploadAttempts, 1);
    expect(find.text('Save this item, then Save & Publish Website.'), findsNothing);

    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();

    expect(find.text('Image uploaded. Save this item, then Save & Publish Website.'), findsOneWidget);
    expect(repository.uploadAttempts, 2);
    await tester.tap(find.text('Save').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save & Publish Website'));
    await tester.pumpAndSettle();

    final gallery = repository.published!['gallery'] as Map<String, dynamic>;
    final items = gallery['items'] as List<dynamic>;
    expect(items, hasLength(1));
    expect(items.single, containsPair('imageUrl', 'https://cdn.example.test/gallery/uploaded.jpg'));
    expect(repository.uploadAttempts, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('oversized gallery image is rejected before upload and keeps the dialog open',
      (tester) async {
    final site = <String, dynamic>{
      'tenantId': 'tenant-1',
      'theme': {'primary': '#F57C00', 'secondary': '#8B2E1B', 'background': '#FFF4DE', 'surface': '#FFFDF8', 'accent': '#E65100'},
      'header': {'languages': ['हिन्दी']},
      'hero': {'title': 'Bade Baba Kharadi', 'imageUrl': ''},
      'about': {}, 'contact': {},
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
        imagePicker: () async => FilePickerResult([
          PlatformFile(
            name: 'too-large.jpg',
            size: 10 * 1024 * 1024 + 1,
            bytes: Uint8List(10 * 1024 * 1024 + 1),
          ),
        ]),
      ),
    ));
    await tester.pumpAndSettle();

    final listView = find.byType(ListView).first;
    final editorScrollable = find.descendant(of: listView, matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('मंदिर गैलरी'), 240, scrollable: editorScrollable);
    final galleryCard = find.ancestor(of: find.text('मंदिर गैलरी'), matching: find.byType(Card)).first;
    await tester.tap(find.descendant(of: galleryCard, matching: find.text('Add')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'title'), 'Large image');
    await tester.enterText(find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Alt text'), 'Oversized image');
    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();

    expect(find.text('Please choose an image smaller than 10 MB.'), findsOneWidget);
    expect(repository.uploadAttempts, 0);
    expect(find.text('Cancel'), findsOneWidget);
    expect(find.text('Save'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('unreadable gallery image is rejected and cancelling the picker does not upload',
      (tester) async {
    final site = <String, dynamic>{
      'tenantId': 'tenant-1',
      'theme': {'primary': '#F57C00', 'secondary': '#8B2E1B', 'background': '#FFF4DE', 'surface': '#FFFDF8', 'accent': '#E65100'},
      'header': {'languages': ['हिन्दी']},
      'hero': {'title': 'Bade Baba Kharadi', 'imageUrl': ''},
      'about': {}, 'contact': {},
      'templeDirectory': {'enabled': true, 'limit': 6},
      'events': {'enabled': true, 'items': []},
      'gallery': {'enabled': true, 'title': 'मंदिर गैलरी', 'items': []},
      'seva': {'enabled': true, 'items': []},
      'quickInfo': [],
    };
    FilePickerResult? pickerResult = FilePickerResult([
      PlatformFile(name: 'unreadable.jpg', size: 12, bytes: null),
    ]);
    final repository = RecordingWebsiteRepository(site);
    await tester.pumpWidget(MaterialApp(
      home: WebsiteEditorPage(
        repository: repository,
        tenantName: 'Bade Baba Kharadi',
        imagePicker: () async => pickerResult,
      ),
    ));
    await tester.pumpAndSettle();

    final listView = find.byType(ListView).first;
    final editorScrollable = find.descendant(of: listView, matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('मंदिर गैलरी'), 240, scrollable: editorScrollable);
    final galleryCard = find.ancestor(of: find.text('मंदिर गैलरी'), matching: find.byType(Card)).first;
    await tester.tap(find.descendant(of: galleryCard, matching: find.text('Add')));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();
    expect(find.text('Could not read the selected image.'), findsOneWidget);
    expect(repository.uploadAttempts, 0);

    pickerResult = null;
    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();
    expect(find.text('Could not read the selected image.'), findsOneWidget);
    expect(repository.uploadAttempts, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('gallery upload shows progress and disables duplicate actions until completion',
      (tester) async {
    final site = <String, dynamic>{
      'tenantId': 'tenant-1',
      'theme': {'primary': '#F57C00', 'secondary': '#8B2E1B', 'background': '#FFF4DE', 'surface': '#FFFDF8', 'accent': '#E65100'},
      'header': {'languages': ['हिन्दी']},
      'hero': {'title': 'Bade Baba Kharadi', 'imageUrl': ''},
      'about': {}, 'contact': {},
      'templeDirectory': {'enabled': true, 'limit': 6},
      'events': {'enabled': true, 'items': []},
      'gallery': {'enabled': true, 'title': 'मंदिर गैलरी', 'items': []},
      'seva': {'enabled': true, 'items': []},
      'quickInfo': [],
    };
    final repository = RecordingWebsiteRepository(site)
      ..uploadCompleter = Completer<String>();
    await tester.pumpWidget(MaterialApp(
      home: WebsiteEditorPage(
        repository: repository,
        tenantName: 'Bade Baba Kharadi',
        imagePicker: () async => FilePickerResult([
          PlatformFile(
            name: 'gallery.jpg',
            size: 4,
            bytes: Uint8List.fromList([0xff, 0xd8, 0xff, 0xd9]),
          ),
        ]),
      ),
    ));
    await tester.pumpAndSettle();

    final listView = find.byType(ListView).first;
    final editorScrollable = find.descendant(of: listView, matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('मंदिर गैलरी'), 240, scrollable: editorScrollable);
    final galleryCard = find.ancestor(of: find.text('मंदिर गैलरी'), matching: find.byType(Card)).first;
    await tester.tap(find.descendant(of: galleryCard, matching: find.text('Add')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'title'), 'Main temple');
    await tester.enterText(find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Alt text'), 'Main entrance');

    await tester.tap(find.text('Upload'));
    await tester.pump();

    expect(find.text('Uploading…'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(repository.uploadAttempts, 1);
    final uploadButton = tester.widget<OutlinedButton>(
      find.ancestor(of: find.text('Uploading…'), matching: find.byType(OutlinedButton)),
    );
    expect(uploadButton.onPressed, isNull);
    final cancelButton = tester.widget<TextButton>(find.widgetWithText(TextButton, 'Cancel'));
    expect(cancelButton.onPressed, isNull);
    final saveButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save').last);
    expect(saveButton.onPressed, isNull);

    repository.uploadCompleter!.complete('https://cdn.example.test/gallery/progress.jpg');
    await tester.pumpAndSettle();

    expect(find.text('Image uploaded. Save this item, then Save & Publish Website.'), findsOneWidget);
    expect(repository.uploadAttempts, 1);
    expect(tester.takeException(), isNull);
  });

}

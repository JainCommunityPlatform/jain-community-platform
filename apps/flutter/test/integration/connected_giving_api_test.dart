import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/io_client.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';
import 'package:jain_community_platform/features/profile/data/profile_repository.dart';
import 'package:jain_community_platform/features/profile/presentation/profile_page.dart';
import 'package:jain_community_platform/features/website/data/website_repository.dart';
import 'package:jain_community_platform/features/website/presentation/website_editor_page.dart';
import 'package:jain_community_platform/core/api/api_exception.dart';

void main() {
  // Construct the IOClient outside the widget-test zone. Flutter's widget-test
  // binding overrides HttpClient inside that zone and otherwise replaces network
  // calls with synthetic 400 responses. The pre-created client keeps real sockets.
  final connectedHttpClient = IOClient(HttpClient());

  LiveTestWidgetsFlutterBinding.ensureInitialized();

  const apiUrl = String.fromEnvironment('JCP_CONNECTED_API_URL');
  const tenantId = String.fromEnvironment(
    'JCP_CONNECTED_TENANT_ID',
    defaultValue: 'connected-giving-test',
  );
  const operatorSubject = String.fromEnvironment('JCP_CONNECTED_OPERATOR_ID');
  const approverSubject = String.fromEnvironment('JCP_CONNECTED_APPROVER_ID');
  const contentManagerSubject = String.fromEnvironment('JCP_CONNECTED_CONTENT_MANAGER_ID');

  tearDownAll(connectedHttpClient.close);

  testWidgets(
    'creates a pledge through the donor UI and verifies persisted pledge and receipt data',
    (tester) async {
      final api = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => 'connected-donor',
        tenantIdProvider: () => tenantId,
        requestTimeout: const Duration(seconds: 15),
        client: connectedHttpClient,
      );

      // Probe each endpoint before the combined widget load so an ancillary
      // endpoint failure is reported directly instead of only as a missing
      // campaign card. These requests still go through the live API/emulator.
      final campaigns = await api.getList('/api/giving/campaigns');
      final seededCampaign = campaigns.cast<Map<String, dynamic>>().singleWhere(
        (item) => item['name'] == 'Connected API receipt journey',
      );
      expect(
        seededCampaign['id'],
        isNotEmpty,
        reason: 'The live campaigns endpoint must return the seeded campaign',
      );
      final initialPledges = await api.getList('/api/giving/my-pledges');
      await api.getList('/api/giving/my-receipts');
      await api.getList('/api/notifications');
      final operatorApi = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => operatorSubject,
        tenantIdProvider: () => tenantId,
        requestTimeout: const Duration(seconds: 15),
        client: connectedHttpClient,
      );
      final approverApi = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => approverSubject,
        tenantIdProvider: () => tenantId,
        requestTimeout: const Duration(seconds: 15),
        client: connectedHttpClient,
      );

      await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: api)));
      final campaignFinder = find.text('Connected API receipt journey');
      for (var attempt = 0; attempt < 100 && campaignFinder.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(campaignFinder, findsOneWidget);

      await tester.tap(find.text('Make a pledge'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField), '0');
      await tester.tap(find.text('Confirm pledge'));
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid amount greater than zero'), findsOneWidget);
      expect(find.text('Pledge to Connected API receipt journey'), findsOneWidget);

      final pledgesAfterInvalidAmount = await api.getList('/api/giving/my-pledges');
      expect(
        pledgesAfterInvalidAmount.length,
        initialPledges.length,
        reason: 'Invalid UI amount must not create a persisted pledge',
      );

      await tester.enterText(find.byType(TextFormField), '123.45');
      await tester.tap(find.text('Confirm pledge'));
      await tester.pump();
      final createdPledgeAmount = find.text('₹123.45');
      for (var attempt = 0; attempt < 150 && createdPledgeAmount.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(createdPledgeAmount, findsOneWidget);
      expect(tester.takeException(), isNull);

      final persistedPledges = (await api.getList('/api/giving/my-pledges'))
          .cast<Map<String, dynamic>>();
      final createdPledge = persistedPledges.singleWhere((pledge) =>
          pledge['campaignId'] == seededCampaign['id'] &&
          pledge['pledgedAmountPaise'] == 12345);
      expect(
        createdPledge['id'],
        isNotEmpty,
        reason: 'The donor UI pledge must be persisted and returned by the live API',
      );

      // Continue the same UI-created pledge through the real API as a finance
      // operator and an independent approver. The receipt must belong to this
      // pledge, not merely to the separate fixture receipt seeded at server startup.
      final payment = await operatorApi.post(
        '/api/giving/pledges/${createdPledge['id']}/payments',
        body: {
          'amountPaise': 12345,
          'method': 'UPI',
          'reference': 'connected-ui-pledge-${createdPledge['id']}',
        },
        headers: {'Idempotency-Key': 'connected-ui-payment-${createdPledge['id']}'},
      );
      expect(payment['pledgeId'], createdPledge['id']);
      expect(payment['status'], 'PENDING_APPROVAL');

      final approvedPayment = await approverApi.post(
        '/api/giving/payments/${payment['id']}/approve',
      );
      expect(approvedPayment['status'], 'VERIFIED');
      expect(approvedPayment['pledgeId'], createdPledge['id']);
      expect(approvedPayment['receiptNumber'], startsWith('JCP-'));

      final persistedReceipts = (await api.getList('/api/giving/my-receipts'))
          .cast<Map<String, dynamic>>();
      final pledgeReceipts = persistedReceipts
          .where((receipt) => receipt['pledgeId'] == createdPledge['id'])
          .toList();
      expect(pledgeReceipts, hasLength(1));
      expect(pledgeReceipts.single['paymentId'], payment['id']);
      expect(pledgeReceipts.single['amountPaise'], 12345);
      expect(pledgeReceipts.single['receiptNumber'], approvedPayment['receiptNumber']);

      final reconciliation = await operatorApi.getObject('/api/giving/reports/reconciliation');
      expect(
        (reconciliation['receipts'] as Map<String, dynamic>)['isBalanced'],
        isTrue,
        reason: 'Persisted verified payments and issued receipts must reconcile',
      );

      await tester.tap(find.text('Receipts'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Refresh giving data'));
      final expectedReceiptNumber = find.text(approvedPayment['receiptNumber'] as String);
      for (var attempt = 0; attempt < 150 && expectedReceiptNumber.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      // Wait for the receipt itself, not its amount: the amount may already be
      // rendered from stale state while the asynchronous refresh is still in flight.
      expect(expectedReceiptNumber, findsOneWidget);
      expect(find.text('₹123.45'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
    skip: apiUrl.isEmpty,
  );

  testWidgets(
    'saves profile edits from Flutter and reloads them from the live API',
    (tester) async {
      final api = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => 'connected-donor',
        tenantIdProvider: () => tenantId,
        requestTimeout: const Duration(seconds: 15),
        client: connectedHttpClient,
      );

      // Seed through the same authenticated HTTP API so the widget begins
      // with persisted profile data and exercises the actual update/reload path.
      await api.patch('/api/profile', body: {
        'displayName': 'Connected Profile Member',
        'address': '42 Jain Society, Pune',
        'city': 'Pune',
        'state': 'Maharashtra',
        'postalCode': '411014',
      });

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: ProfilePage(repository: ProfileRepository(api))),
      ));
      final loadedName = find.text('Connected Profile Member');
      for (var attempt = 0; attempt < 150 && loadedName.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(loadedName, findsNWidgets(2)); // Header and editable Name field.

      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();

      final nameField = find.byWidgetPredicate(
        (widget) => widget is TextField && widget.decoration?.labelText == 'Name',
      );
      await tester.ensureVisible(nameField);
      await tester.enterText(nameField, 'Updated from Flutter');

      final cityField = find.byWidgetPredicate(
        (widget) => widget is TextField && widget.decoration?.labelText == 'City',
      );
      await tester.ensureVisible(cityField);
      await tester.enterText(cityField, 'Nashik');

      await tester.ensureVisible(find.text('Save profile'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save profile'));
      await tester.pumpAndSettle();

      expect(find.text('Profile saved.'), findsOneWidget);
      final persisted = await api.getObject('/api/profile');
      expect(persisted, containsPair('displayName', 'Updated from Flutter'));
      expect(persisted, containsPair('address', '42 Jain Society, Pune'));
      expect(persisted, containsPair('city', 'Nashik'));
      expect(persisted, containsPair('state', 'Maharashtra'));
      expect(persisted, containsPair('postalCode', '411014'));
      expect(persisted, containsPair('email', 'connected-donor@example.test'));
      expect(tester.takeException(), isNull);
    },
    skip: apiUrl.isEmpty,
  );

  testWidgets(
    'publishes website edits through Flutter and verifies persisted reload and validation failure',
    (tester) async {
      final api = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => contentManagerSubject,
        tenantIdProvider: () => tenantId,
        requestTimeout: const Duration(seconds: 15),
        client: connectedHttpClient,
      );
      final repository = WebsiteRepository(api);
      await repository.updateSite({'contact': {'phone': '+912012345678'}});
      final beforePublish = await repository.getSite();
      final originalTitle = (beforePublish['hero'] as Map<String, dynamic>)['title'];

      await tester.pumpWidget(MaterialApp(
        home: WebsiteEditorPage(
          repository: repository,
          tenantName: 'Connected giving test tenant',
        ),
      ));
      await tester.pumpAndSettle();
      // Wait for the async load to finish, then scroll the lazy ListView to the
      // hero section. Waiting alone cannot build a child that is offscreen.
      final editorTitle = find.text('Temple Website Editor');
      for (var attempt = 0; attempt < 150 && editorTitle.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(editorTitle, findsOneWidget);
      final heroSection = find.text('Hero / मुख्य भाग');
      await tester.dragUntilVisible(
        heroSection,
        find.byType(ListView).first,
        const Offset(0, -300),
      );
      await tester.pumpAndSettle();
      expect(heroSection, findsOneWidget);
      // Expand the section before locating its lazily-created text fields.
      await tester.tap(heroSection);
      await tester.pumpAndSettle();
      final heroTitle = find.byWidgetPredicate(
        (widget) => widget is TextField &&
            widget.decoration?.labelText == 'मंदिर का नाम / शीर्षक',
      );
      for (var attempt = 0; attempt < 100 && heroTitle.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(heroTitle, findsOneWidget);
      expect(tester.widget<TextField>(heroTitle).controller!.text, originalTitle);

      await tester.ensureVisible(heroTitle);
      await tester.enterText(heroTitle, 'Connected Published Website');
      await tester.tap(find.text('Save & Publish Website'));
      for (var attempt = 0; attempt < 150 &&
          find.text('वेबसाइट अपडेट प्रकाशित हो गई।').evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(find.text('वेबसाइट अपडेट प्रकाशित हो गई।'), findsOneWidget);
      expect(tester.takeException(), isNull);

      final persisted = await repository.getSite();
      expect(persisted['version'], (beforePublish['version'] as num) + 1);
      expect((persisted['hero'] as Map<String, dynamic>)['title'],
          'Connected Published Website');
      expect((persisted['contact'] as Map<String, dynamic>)['phone'],
          '+912012345678');

      await expectLater(
        repository.updateSite({'hero': {'title': '   '}}),
        throwsA(isA<ApiException>().having(
          (error) => error.statusCode,
          'statusCode',
          400,
        )),
      );
      final afterRejectedUpdate = await repository.getSite();
      expect(afterRejectedUpdate['version'], persisted['version']);
      expect((afterRejectedUpdate['hero'] as Map<String, dynamic>)['title'],
          'Connected Published Website');
      expect((afterRejectedUpdate['contact'] as Map<String, dynamic>)['phone'],
          '+912012345678');

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(MaterialApp(
        home: WebsiteEditorPage(
          repository: repository,
          tenantName: 'Connected giving test tenant',
        ),
      ));
      await tester.pumpAndSettle();
      final reloadedEditorTitle = find.text('Temple Website Editor');
      for (var attempt = 0; attempt < 150 && reloadedEditorTitle.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(reloadedEditorTitle, findsOneWidget);
      final reloadedHeroSection = find.text('Hero / मुख्य भाग');
      await tester.dragUntilVisible(
        reloadedHeroSection,
        find.byType(ListView).first,
        const Offset(0, -300),
      );
      await tester.pumpAndSettle();
      expect(reloadedHeroSection, findsOneWidget);
      await tester.tap(reloadedHeroSection);
      await tester.pumpAndSettle();
      final reloadedHeroTitle = find.byWidgetPredicate(
        (widget) => widget is TextField &&
            widget.decoration?.labelText == 'मंदिर का नाम / शीर्षक',
      );
      for (var attempt = 0; attempt < 100 && reloadedHeroTitle.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(reloadedHeroTitle, findsOneWidget);
      expect(tester.widget<TextField>(reloadedHeroTitle).controller!.text,
          'Connected Published Website');
      expect(tester.takeException(), isNull);
    },
    skip: apiUrl.isEmpty,
  );

}

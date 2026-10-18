import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/io_client.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';

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

      final persistedPledges = await api.getList('/api/giving/my-pledges');
      expect(
        persistedPledges.cast<Map<String, dynamic>>().any((pledge) =>
            pledge['campaignId'] == seededCampaign['id'] &&
            pledge['pledgedAmountPaise'] == 12345),
        isTrue,
        reason: 'A confirmed pledge must be persisted and returned by the live API',
      );

      await tester.tap(find.text('Receipts'));
      final receiptFinder = find.textContaining('JCP-');
      for (var attempt = 0; attempt < 100 && receiptFinder.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      expect(receiptFinder, findsOneWidget);
      expect(find.text('₹250.00'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
    skip: apiUrl.isEmpty,
  );
}

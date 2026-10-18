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
    'renders a Firestore-persisted receipt from the live NestJS API',
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
      expect(
        campaigns.cast<Map<String, dynamic>>().map((item) => item['name']),
        contains('Connected API receipt journey'),
        reason: 'The live campaigns endpoint must return the seeded campaign',
      );
      await api.getList('/api/giving/my-pledges');
      await api.getList('/api/giving/my-receipts');
      await api.getList('/api/notifications');

      await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: api)));
      final campaignFinder = find.text('Connected API receipt journey');
      for (var attempt = 0; attempt < 50 && campaignFinder.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(campaignFinder, findsOneWidget);

      await tester.tap(find.text('Receipts'));
      final receiptFinder = find.textContaining('JCP-');
      for (var attempt = 0; attempt < 50 && receiptFinder.evaluate().isEmpty; attempt++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      expect(receiptFinder, findsOneWidget);
      expect(find.text('₹250.00'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
    skip: apiUrl.isEmpty,
  );
}

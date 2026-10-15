import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';

void main() {
  // Use a live clock/network binding: AutomatedTestWidgetsFlutterBinding replaces
  // HttpClient with a fake 400 response and cannot verify a real local API.
  LiveTestWidgetsFlutterBinding.ensureInitialized();

  const apiUrl = String.fromEnvironment('JCP_CONNECTED_API_URL');

  testWidgets(
    'renders a Firestore-persisted receipt from the live NestJS API',
    (tester) async {
      final api = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => 'connected-donor',
        tenantIdProvider: () => 'connected-giving-test',
        requestTimeout: const Duration(seconds: 5),
      );

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

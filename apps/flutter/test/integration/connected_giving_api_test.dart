import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';

void main() {
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
      await tester.pumpAndSettle(const Duration(milliseconds: 100));

      expect(find.text('Connected API receipt journey'), findsOneWidget);

      await tester.tap(find.text('Receipts'));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));

      expect(find.textContaining('JCP-'), findsOneWidget);
      expect(find.text('₹250.00'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
    skip: apiUrl.isEmpty ? 'Set JCP_CONNECTED_API_URL to run the connected emulator journey' : false,
  );
}

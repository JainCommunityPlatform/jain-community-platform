import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/io_client.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';

void main() {
  // Construct the real socket-backed client before the widget-test zone installs
  // its default fake HttpClient. This test intentionally exercises localhost.
  final connectedHttpClient = IOClient(HttpClient());
  const apiUrl = String.fromEnvironment('JCP_CONNECTED_API_URL');

  testWidgets(
    'renders a Firestore-persisted receipt from the live NestJS API',
    (tester) async {
      addTearDown(connectedHttpClient.close);
      final api = ApiClient(
        baseUrl: Uri.parse(apiUrl),
        accessTokenProvider: () async => 'connected-donor',
        tenantIdProvider: () => 'connected-giving-test',
        requestTimeout: const Duration(seconds: 5),
        client: connectedHttpClient,
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
    skip: apiUrl.isEmpty,
  );
}

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';

void main() {
  testWidgets('donor can create a pledge from a campaign and see it in My pledges',
      (tester) async {
    final requests = <http.Request>[];
    var pledgeCreated = false;
    final client = MockClient((request) async {
      requests.add(request);
      switch ('${request.method} ${request.url.path}') {
        case 'GET /api/giving/campaigns':
          return http.Response(jsonEncode([
            {
              'id': 'campaign-1',
              'name': 'Chaturmas Seva',
              'description': 'Support temple activities',
              'targetAmountPaise': 100000,
              'status': 'ACTIVE',
            },
          ]), 200);
        case 'GET /api/giving/my-pledges':
          return http.Response(jsonEncode(pledgeCreated
              ? [
                  {
                    'id': 'pledge-1',
                    'campaignId': 'campaign-1',
                    'pledgedAmountPaise': 50000,
                    'paidAmountPaise': 0,
                    'status': 'PLEDGED',
                    'createdAt': '2026-10-13T00:00:00.000Z',
                  },
                ]
              : []), 200);
        case 'GET /api/giving/my-receipts':
        case 'GET /api/notifications':
          return http.Response('[]', 200);
        case 'POST /api/giving/pledges':
          pledgeCreated = true;
          return http.Response(jsonEncode({
            'id': 'pledge-1',
            'campaignId': 'campaign-1',
            'pledgedAmountPaise': 50000,
            'paidAmountPaise': 0,
            'status': 'PLEDGED',
            'createdAt': '2026-10-13T00:00:00.000Z',
          }), 201);
        default:
          return http.Response(jsonEncode({
            'message': 'Unexpected request: ${request.method} ${request.url.path}',
          }), 404);
      }
    });
    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      client: client,
    );

    await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: api)));
    await tester.pumpAndSettle();

    expect(find.text('Chaturmas Seva'), findsOneWidget);
    expect(find.text('Support temple activities'), findsOneWidget);

    await tester.tap(find.text('Make a pledge'));
    await tester.pumpAndSettle();
    expect(find.text('Pledge to Chaturmas Seva'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField), '500');
    await tester.tap(find.text('Confirm pledge'));
    await tester.pumpAndSettle();

    final createRequest = requests.singleWhere(
      (request) =>
          request.method == 'POST' &&
          request.url.path == '/api/giving/pledges',
    );
    expect(jsonDecode(createRequest.body), {
      'campaignId': 'campaign-1',
      'pledgedAmountPaise': 50000,
    });
    expect(createRequest.headers['Idempotency-Key'],
        startsWith('donor-pledge-campaign-1-'));
    expect(find.text('Your pledge has been recorded.'), findsOneWidget);
    expect(find.text('Chaturmas Seva'), findsOneWidget);

    await tester.tap(find.text('My pledges'));
    await tester.pumpAndSettle();
    expect(find.text('₹500.00'), findsOneWidget);
    expect(find.textContaining('Status: PLEDGED'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('donor pledge failure is shown and does not report success',
      (tester) async {
    final requests = <http.Request>[];
    final client = MockClient((request) async {
      requests.add(request);
      switch ('${request.method} ${request.url.path}') {
        case 'GET /api/giving/campaigns':
        case 'GET /api/giving/my-pledges':
        case 'GET /api/giving/my-receipts':
        case 'GET /api/notifications':
          return http.Response(
              request.url.path == '/api/giving/campaigns'
                  ? jsonEncode([
                      {
                        'id': 'campaign-1',
                        'name': 'Chaturmas Seva',
                        'description': 'Support temple activities',
                        'status': 'ACTIVE',
                      },
                    ])
                  : '[]',
              200);
        case 'POST /api/giving/pledges':
          return http.Response(jsonEncode({
            'statusCode': 403,
            'message': 'This tenant donor relationship is inactive',
            'error': 'Forbidden',
          }), 403);
        default:
          return http.Response('{}', 404);
      }
    });
    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      client: client,
    );

    await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Make a pledge'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '500');
    await tester.tap(find.text('Confirm pledge'));
    await tester.pumpAndSettle();

    expect(find.text('This tenant donor relationship is inactive'),
        findsOneWidget);
    expect(find.text('Your pledge has been recorded.'), findsNothing);
    expect(
      requests.where((request) =>
          request.method == 'POST' &&
          request.url.path == '/api/giving/pledges'),
      hasLength(1),
    );
    expect(tester.takeException(), isNull);
  });
}

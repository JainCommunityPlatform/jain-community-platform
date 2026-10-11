import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/presentation/donor_giving_page.dart';
import 'package:jain_community_platform/features/giving/presentation/finance_console_page.dart';

http.Response jsonResponse(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

ApiClient apiFor(MockClient client) => ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      tenantIdProvider: () => 'tenant-a',
      accessTokenProvider: () async => 'test-token',
      client: client,
    );

List<dynamic> emptyList() => [];

Map<String, dynamic> summaryPayload() => {
      'totals': {
        'pledgedAmountPaise': 100000,
        'receivedAmountPaise': 50000,
        'outstandingAmountPaise': 50000,
        'netReceivedAmountPaise': 35000,
      },
    };

Map<String, dynamic> reconciliationPayload() => {
      'verifiedPaymentAmountPaise': 50000,
      'approvedExpenseAmountPaise': 10000,
      'netAfterApprovedExpensesAndAdjustmentsPaise': 35000,
      'adjustments': {'approvedAmountPaise': 5000},
      'receiptDiscrepancies': <dynamic>[],
    };

void main() {
  group('Donor giving workflow', () {
    testWidgets('browses campaigns, pledge history, receipts and marks a notification read',
        (tester) async {
      var notificationRead = false;
      final client = MockClient((request) async {
        switch (request.url.path) {
          case '/api/giving/campaigns':
            return jsonResponse([
              {
                'id': 'campaign-1',
                'name': 'Temple restoration',
                'description': 'Repair the main shrine',
                'targetAmountPaise': 100000,
                'status': 'ACTIVE',
              }
            ]);
          case '/api/giving/my-pledges':
            return jsonResponse([
              {
                'id': 'pledge-1',
                'campaignId': 'campaign-1',
                'pledgedAmountPaise': 100000,
                'paidAmountPaise': 25000,
                'status': 'PARTIALLY_PAID',
              }
            ]);
          case '/api/giving/my-receipts':
            return jsonResponse([
              {
                'id': 'receipt-1',
                'receiptNumber': 'JCP-TEMPLE-2026-000001',
                'amountPaise': 25000,
                'method': 'UPI',
                'issuedAt': '2026-10-10T04:00:00.000Z',
              }
            ]);
          case '/api/notifications':
            return jsonResponse([
              {
                'id': 'notification-1',
                'type': 'PAYMENT_VERIFIED',
                'title': 'Donation payment verified',
                'body': 'Your receipt is ready.',
                'createdAt': '2026-10-10T04:00:00.000Z',
                'readAt': notificationRead ? '2026-10-10T04:10:00.000Z' : null,
              }
            ]);
          case '/api/notifications/notification-1/read':
            expect(request.method, 'POST');
            notificationRead = true;
            return jsonResponse({'id': 'notification-1', 'readAt': '2026-10-10T04:10:00.000Z'}, 201);
          default:
            return jsonResponse({'message': 'Unexpected request ' + request.method + ' ' + request.url.path}, 404);
        }
      });

      await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: apiFor(client))));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.pumpAndSettle();

      expect(find.text('Temple restoration'), findsOneWidget);
      expect(find.text('Repair the main shrine'), findsOneWidget);

      await tester.tap(find.text('My pledges'));
      await tester.pumpAndSettle();
      expect(find.text('₹250.00 paid • ₹750.00 outstanding\nStatus: PARTIALLY PAID'), findsOneWidget);

      await tester.tap(find.text('Receipts'));
      await tester.pumpAndSettle();
      expect(find.text('JCP-TEMPLE-2026-000001'), findsOneWidget);
      expect(find.text('₹250.00'), findsOneWidget);

      await tester.tap(find.text('Notifications'));
      await tester.pumpAndSettle();
      expect(find.text('Donation payment verified'), findsOneWidget);
      expect(find.byTooltip('Mark as read'), findsOneWidget);

      await tester.tap(find.byTooltip('Mark as read'));
      await tester.pumpAndSettle();
      expect(notificationRead, isTrue);
      expect(find.byTooltip('Mark as read'), findsNothing);
      expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
    });

    testWidgets('validates a pledge amount and submits paise with an idempotency key',
        (tester) async {
      var pledgeCreated = false;
      Map<String, dynamic>? postedBody;
      String? postedIdempotencyKey;
      final client = MockClient((request) async {
        if (request.url.path == '/api/giving/campaigns') {
          return jsonResponse([
            {
              'id': 'campaign-1',
              'name': 'Temple restoration',
              'description': 'Repair the main shrine',
              'targetAmountPaise': 100000,
              'status': 'ACTIVE',
            }
          ]);
        }
        if (request.url.path == '/api/giving/my-pledges') {
          return jsonResponse(pledgeCreated
              ? [
                  {
                    'id': 'pledge-2',
                    'campaignId': 'campaign-1',
                    'pledgedAmountPaise': 12550,
                    'paidAmountPaise': 0,
                    'status': 'PLEDGED',
                  }
                ]
              : emptyList());
        }
        if (request.url.path == '/api/giving/my-receipts' || request.url.path == '/api/notifications') {
          return jsonResponse(emptyList());
        }
        if (request.method == 'POST' && request.url.path == '/api/giving/pledges') {
          postedBody = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
          postedIdempotencyKey = request.headers['idempotency-key'] ?? request.headers['Idempotency-Key'];
          pledgeCreated = true;
          return jsonResponse({
            'id': 'pledge-2',
            'campaignId': 'campaign-1',
            'pledgedAmountPaise': 12550,
            'paidAmountPaise': 0,
            'status': 'PLEDGED',
          }, 201);
        }
        return jsonResponse({'message': 'Unexpected request ' + request.method + ' ' + request.url.path}, 404);
      });

      await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: apiFor(client))));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Make a pledge'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Confirm pledge'));
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid amount greater than zero'), findsOneWidget);
      expect(pledgeCreated, isFalse);

      await tester.enterText(find.byType(TextFormField), '125.50');
      await tester.tap(find.text('Confirm pledge'));
      await tester.pumpAndSettle();

      expect(pledgeCreated, isTrue);
      expect(postedBody, {'campaignId': 'campaign-1', 'pledgedAmountPaise': 12550});
      expect(postedIdempotencyKey, startsWith('donor-pledge-campaign-1-'));
      expect(find.text('Your pledge has been recorded.'), findsOneWidget);
      expect(find.text('₹125.50'), findsOneWidget);
    });

    testWidgets('shows a recoverable load error and retries successfully', (tester) async {
      var failFirstCampaignRequest = true;
      final client = MockClient((request) async {
        if (request.url.path == '/api/giving/campaigns' && failFirstCampaignRequest) {
          return jsonResponse({'message': 'Giving service temporarily unavailable'}, 503);
        }
        if (request.url.path == '/api/giving/campaigns') {
          return jsonResponse([
            {
              'id': 'campaign-1',
              'name': 'Temple restoration',
              'description': 'Repair the main shrine',
              'targetAmountPaise': 100000,
              'status': 'ACTIVE',
            }
          ]);
        }
        return jsonResponse(emptyList());
      });

      await tester.pumpWidget(MaterialApp(home: DonorGivingPage(api: apiFor(client))));
      await tester.pumpAndSettle();
      expect(find.text('Giving service temporarily unavailable'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      failFirstCampaignRequest = false;
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(find.text('Temple restoration'), findsOneWidget);
      expect(find.text('Giving service temporarily unavailable'), findsNothing);
    });
  });

  group('Finance console workflow', () {
    testWidgets('shows reconciled totals and supports switching to the reconciliation report',
        (tester) async {
      final client = MockClient((request) async {
        switch (request.url.path) {
          case '/api/giving/reports/summary':
            return jsonResponse(summaryPayload());
          case '/api/giving/reports/reconciliation':
            return jsonResponse(reconciliationPayload());
          default:
            return jsonResponse(emptyList());
        }
      });

      await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: apiFor(client))));
      await tester.pumpAndSettle();

      expect(find.text('Tenant finance overview'), findsOneWidget);
      expect(find.text('₹500.00'), findsOneWidget);
      expect(find.text('₹350.00'), findsOneWidget);
      expect(find.text('Pending payments'), findsOneWidget);

      await tester.tap(find.widgetWithText(ChoiceChip, 'Reconciliation'));
      await tester.pumpAndSettle();
      expect(find.text('Verified payments'), findsOneWidget);
      expect(find.text('Approved expenses'), findsOneWidget);
      expect(find.text('Approved adjustments'), findsOneWidget);
      expect(find.text('Receipt discrepancies'), findsOneWidget);
      expect(find.text('Operational control report only; it does not confirm bank settlement or replace a double-entry ledger.'), findsOneWidget);
    });

    testWidgets('records an expense with paise conversion and a unique idempotency key',
        (tester) async {
      Map<String, dynamic>? postedBody;
      String? postedIdempotencyKey;
      var expenseCreated = false;
      final client = MockClient((request) async {
        if (request.url.path == '/api/giving/reports/summary') return jsonResponse(summaryPayload());
        if (request.url.path == '/api/giving/reports/reconciliation') return jsonResponse(reconciliationPayload());
        if (request.url.path == '/api/giving/expenses') {
          if (request.method == 'POST') {
            postedBody = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
            postedIdempotencyKey = request.headers['idempotency-key'] ?? request.headers['Idempotency-Key'];
            expenseCreated = true;
            return jsonResponse({'id': 'expense-2', 'status': 'PENDING_APPROVAL'}, 201);
          }
          return jsonResponse(expenseCreated
              ? [
                  {'id': 'expense-2', 'category': 'Maintenance', 'description': 'Replace temple lights', 'amountPaise': 12550, 'status': 'PENDING_APPROVAL'}
                ]
              : emptyList());
        }
        return jsonResponse(emptyList());
      });

      await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: apiFor(client))));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ChoiceChip, 'Expenses'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Record'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField), 'Maintenance');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField), 'Replace temple lights');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField), '125.50');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      expect(expenseCreated, isTrue);
      expect(postedBody, {
        'category': 'Maintenance',
        'description': 'Replace temple lights',
        'amountPaise': 12550,
      });
      expect(postedIdempotencyKey, startsWith('finance-expense-'));
      expect(find.text('Expense submitted for approval.'), findsOneWidget);
      expect(find.text('Maintenance • ₹125.50'), findsOneWidget);
    });

    testWidgets('approves a pending expense, refreshes state and reports the decision',
        (tester) async {
      var expenseStatus = 'PENDING_APPROVAL';
      final calls = <String>[];
      final client = MockClient((request) async {
        calls.add(request.method + ' ' + request.url.path);
        if (request.url.path == '/api/giving/reports/summary') return jsonResponse(summaryPayload());
        if (request.url.path == '/api/giving/reports/reconciliation') return jsonResponse(reconciliationPayload());
        if (request.url.path == '/api/giving/expenses' && request.method == 'GET') {
          return jsonResponse([
            {'id': 'expense-1', 'category': 'Maintenance', 'description': 'Repair water pump', 'amountPaise': 25000, 'status': expenseStatus}
          ]);
        }
        if (request.method == 'POST' && request.url.path == '/api/giving/expenses/expense-1/approve') {
          expenseStatus = 'APPROVED';
          return jsonResponse({'id': 'expense-1', 'status': 'APPROVED'}, 201);
        }
        return jsonResponse(emptyList());
      });

      await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: apiFor(client))));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ChoiceChip, 'Expenses'));
      await tester.pumpAndSettle();
      expect(find.text('Repair water pump • PENDING_APPROVAL'), findsOneWidget);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Approve'));
      await tester.pumpAndSettle();

      expect(calls, contains('POST /api/giving/expenses/expense-1/approve'));
      expect(expenseStatus, 'APPROVED');
      expect(find.text('Decision saved.'), findsOneWidget);
      expect(find.text('Repair water pump • APPROVED'), findsOneWidget);
    });
  });
}

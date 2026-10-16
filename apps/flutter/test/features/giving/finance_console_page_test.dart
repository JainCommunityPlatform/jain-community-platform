import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/core/api/api_exception.dart';
import 'package:jain_community_platform/features/giving/presentation/finance_console_page.dart';

class FinanceCall {
  const FinanceCall(this.method, this.path, {this.body, this.headers});

  final String method;
  final String path;
  final Map<String, dynamic>? body;
  final Map<String, String>? headers;
}

class FakeFinanceApiClient extends ApiClient {
  FakeFinanceApiClient() : super(baseUrl: Uri.parse('https://example.test/'));

  final calls = <FinanceCall>[];
  int summaryFailuresRemaining = 0;

  @override
  Future<Map<String, dynamic>> getObject(String path) async {
    calls.add(FinanceCall('GET', path));
    if (path == '/api/giving/reports/summary' &&
        summaryFailuresRemaining > 0) {
      summaryFailuresRemaining--;
      throw const ApiException(
        statusCode: 503,
        message: 'Finance reports unavailable',
      );
    }
    if (path == '/api/giving/reports/summary') {
      return {
        'totals': {
          'pledgedAmountPaise': 20000,
          'receivedAmountPaise': 10000,
          'outstandingAmountPaise': 10000,
          'netReceivedAmountPaise': 9000,
        },
      };
    }
    return {
      'verifiedPaymentAmountPaise': 10000,
      'approvedExpenseAmountPaise': 1000,
      'adjustments': {'approvedAmountPaise': 0},
      'netAfterApprovedExpensesAndAdjustmentsPaise': 9000,
      'receiptDiscrepancies': <dynamic>[],
    };
  }

  @override
  Future<List<dynamic>> getList(String path) async {
    calls.add(FinanceCall('GET', path));
    return <dynamic>[];
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    calls.add(FinanceCall('POST', path, body: body, headers: headers));
    return {'id': 'created'};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    calls.add(FinanceCall('PATCH', path, body: body));
    return {'id': 'updated'};
  }
}

void main() {
  testWidgets('loads finance overview and refreshes tenant-scoped reports',
      (tester) async {
    final api = FakeFinanceApiClient();

    await tester.pumpWidget(
      MaterialApp(home: FinanceConsolePage(api: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Finance workspace'), findsOneWidget);
    expect(find.text('Tenant finance overview'), findsOneWidget);
    expect(find.text('₹100.00'), findsNWidgets(2));
    expect(
      api.calls.where((call) => call.path == '/api/giving/reports/summary'),
      hasLength(1),
    );

    await tester.tap(find.byTooltip('Refresh'));
    await tester.pumpAndSettle();

    expect(
      api.calls.where((call) => call.path == '/api/giving/reports/summary'),
      hasLength(2),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('shows a recoverable report error and retries successfully',
      (tester) async {
    final api = FakeFinanceApiClient()..summaryFailuresRemaining = 1;

    await tester.pumpWidget(
      MaterialApp(home: FinanceConsolePage(api: api)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Finance reports unavailable'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('Tenant finance overview'), findsNothing);

    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('Tenant finance overview'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('records a valid expense in paise with an idempotency key',
      (tester) async {
    final api = FakeFinanceApiClient();

    await tester.pumpWidget(
      MaterialApp(home: FinanceConsolePage(api: api)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Expenses'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Record'));
    await tester.pumpAndSettle();

    Future<void> answerPrompt(String label, String value) async {
      final field = find.byWidgetPredicate(
        (widget) =>
            widget is TextField && widget.decoration?.labelText == label,
      );
      expect(field, findsOneWidget, reason: 'Expected prompt field: $label');
      await tester.enterText(field, value);
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
    }

    await answerPrompt('Category', 'Repairs');
    await answerPrompt('Description', 'Temple lights');
    await answerPrompt('Amount in ₹', '125.50');

    expect(find.text('Expense submitted for approval.'), findsOneWidget);
    final call = api.calls.lastWhere(
      (entry) =>
          entry.method == 'POST' && entry.path == '/api/giving/expenses',
    );
    expect(call.body, containsPair('category', 'Repairs'));
    expect(call.body, containsPair('description', 'Temple lights'));
    expect(call.body, containsPair('amountPaise', 12550));
    expect(call.headers?['Idempotency-Key'], startsWith('finance-expense-'));
    expect(tester.takeException(), isNull);
  });
}

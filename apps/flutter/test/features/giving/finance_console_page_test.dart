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
  String? postFailurePath;
  final listResponses = <String, List<dynamic>>{};

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
    return listResponses[path] ?? <dynamic>[];
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    calls.add(FinanceCall('POST', path, body: body, headers: headers));
    if (path == postFailurePath) {
      throw const ApiException(statusCode: 503, message: 'Decision service unavailable');
    }
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

  testWidgets('verifies and rejects pending payments with the correct decision routes', (tester) async {
    final api = FakeFinanceApiClient()
      ..listResponses['/api/giving/payments'] = [
        {'id': 'payment-verify', 'amountPaise': 2500, 'method': 'UPI', 'status': 'PENDING_APPROVAL', 'pledgeId': 'pledge-1'},
        {'id': 'payment-reject', 'amountPaise': 1500, 'method': 'CASH', 'status': 'PENDING_APPROVAL', 'pledgeId': 'pledge-2'},
      ];

    await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Payments').first);
    await tester.pumpAndSettle();

    final menus = find.byType(PopupMenuButton<String>);
    expect(menus, findsNWidgets(2));
    await tester.tap(menus.at(0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Verify'));
    await tester.pumpAndSettle();

    expect(api.calls.any((call) => call.method == 'POST' && call.path == '/api/giving/payments/payment-verify/approve'), isTrue);
    expect(find.text('Decision saved.'), findsOneWidget);

    await tester.tap(find.byType(PopupMenuButton<String>).at(1));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), 'Duplicate payment');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    final rejection = api.calls.lastWhere((call) => call.method == 'POST' && call.path == '/api/giving/payments/payment-reject/reject');
    expect(rejection.body, containsPair('reason', 'Duplicate payment'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('approves and rejects pending expenses and includes a rejection reason', (tester) async {
    final api = FakeFinanceApiClient()
      ..listResponses['/api/giving/expenses'] = [
        {'id': 'expense-approve', 'amountPaise': 5000, 'category': 'Repairs', 'description': 'Roof repair', 'status': 'PENDING_APPROVAL'},
        {'id': 'expense-reject', 'amountPaise': 3000, 'category': 'Supplies', 'description': 'Stationery', 'status': 'PENDING_APPROVAL'},
      ];

    await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Expenses').first);
    await tester.pumpAndSettle();

    final menus = find.byType(PopupMenuButton<String>);
    expect(menus, findsNWidgets(2));
    await tester.tap(menus.at(0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Approve'));
    await tester.pumpAndSettle();

    expect(api.calls.any((call) => call.method == 'POST' && call.path == '/api/giving/expenses/expense-approve/approve'), isTrue);

    await tester.tap(find.byType(PopupMenuButton<String>).at(1));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), 'Missing receipt');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    final rejection = api.calls.lastWhere((call) => call.method == 'POST' && call.path == '/api/giving/expenses/expense-reject/reject');
    expect(rejection.body, containsPair('reason', 'Missing receipt'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('approves and rejects pending adjustments with decision reasons', (tester) async {
    final api = FakeFinanceApiClient()
      ..listResponses['/api/giving/adjustments'] = [
        {'id': 'adjustment-approve', 'amountPaise': 1200, 'kind': 'REFUND', 'reason': 'Overpayment', 'status': 'PENDING_APPROVAL'},
        {'id': 'adjustment-reject', 'amountPaise': 800, 'kind': 'REVERSAL', 'reason': 'Incorrect entry', 'status': 'PENDING_APPROVAL'},
      ];

    await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: api)));
    await tester.pumpAndSettle();
    final adjustmentsTab = find.text('Adjustments').first;
    await tester.ensureVisible(adjustmentsTab);
    await tester.pumpAndSettle();
    await tester.tap(adjustmentsTab);
    await tester.pumpAndSettle();

    final menus = find.byType(PopupMenuButton<String>);
    expect(menus, findsNWidgets(2));
    await tester.tap(menus.at(0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Approve'));
    await tester.pumpAndSettle();

    expect(api.calls.any((call) => call.method == 'POST' && call.path == '/api/giving/adjustments/adjustment-approve/approve'), isTrue);

    await tester.tap(find.byType(PopupMenuButton<String>).at(1));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), 'Unsupported adjustment');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    final rejection = api.calls.lastWhere((call) => call.method == 'POST' && call.path == '/api/giving/adjustments/adjustment-reject/reject');
    expect(rejection.body, containsPair('reason', 'Unsupported adjustment'));
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

  testWidgets('requires a rejection reason and cancellation makes no decision request', (tester) async {
    final cases = <({String tab, String listPath, String id, String action})>[
      (tab: 'Payments', listPath: '/api/giving/payments', id: 'payment-empty-reason', action: 'Verify'),
      (tab: 'Expenses', listPath: '/api/giving/expenses', id: 'expense-empty-reason', action: 'Approve'),
      (tab: 'Adjustments', listPath: '/api/giving/adjustments', id: 'adjustment-empty-reason', action: 'Approve'),
    ];

    for (final item in cases) {
      final api = FakeFinanceApiClient()
        ..listResponses[item.listPath] = [
          {
            'id': item.id,
            'amountPaise': 1000,
            'method': 'UPI',
            'category': 'Supplies',
            'description': 'Test record',
            'kind': 'REFUND',
            'reason': 'Test',
            'pledgeId': 'pledge-1',
            'status': 'PENDING_APPROVAL',
          },
        ];

      await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: api)));
      await tester.pumpAndSettle();
      final tab = find.text(item.tab).first;
      await tester.ensureVisible(tab);
      await tester.pumpAndSettle();
      await tester.tap(tab);
      await tester.pumpAndSettle();

      final menu = find.byType(PopupMenuButton<String>).first;
      await tester.tap(menu);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reject'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Required'), findsOneWidget, reason: item.tab);
      expect(api.calls.where((call) => call.method == 'POST'), isEmpty,
          reason: 'An empty rejection reason must not submit for ${item.tab}.');
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(api.calls.where((call) => call.method == 'POST'), isEmpty);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    }
  });

  testWidgets('shows decision API failure without a false success message', (tester) async {
    final api = FakeFinanceApiClient()
      ..postFailurePath = '/api/giving/payments/payment-fails/approve'
      ..listResponses['/api/giving/payments'] = [
        {
          'id': 'payment-fails',
          'amountPaise': 2500,
          'method': 'UPI',
          'status': 'PENDING_APPROVAL',
          'pledgeId': 'pledge-1',
        },
      ];

    await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Payments').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(PopupMenuButton<String>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Verify'));
    await tester.pumpAndSettle();

    expect(find.text('Decision service unavailable'), findsOneWidget);
    expect(find.text('Decision saved.'), findsNothing);
    expect(api.calls.where((call) => call.method == 'POST'), hasLength(1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('reloads finance lists after a successful approval', (tester) async {
    final api = FakeFinanceApiClient()
      ..listResponses['/api/giving/payments'] = [
        {
          'id': 'payment-refresh',
          'amountPaise': 2500,
          'method': 'UPI',
          'status': 'PENDING_APPROVAL',
          'pledgeId': 'pledge-1',
        },
      ];

    await tester.pumpWidget(MaterialApp(home: FinanceConsolePage(api: api)));
    await tester.pumpAndSettle();
    final initialListLoads = api.calls.where(
      (call) => call.method == 'GET' && call.path == '/api/giving/payments',
    ).length;

    await tester.tap(find.text('Payments').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(PopupMenuButton<String>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Verify'));
    await tester.pumpAndSettle();

    final finalListLoads = api.calls.where(
      (call) => call.method == 'GET' && call.path == '/api/giving/payments',
    ).length;
    expect(finalListLoads, greaterThan(initialListLoads));
    expect(find.text('Decision saved.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

}

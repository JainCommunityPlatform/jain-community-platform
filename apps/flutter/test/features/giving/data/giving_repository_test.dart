import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/giving/data/giving_repository.dart';

void main() {
  test('creates pledges with an idempotency key and paise amounts', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/giving/pledges');
      expect(request.headers['idempotency-key'], 'pledge-attempt-1');
      expect(request.headers['content-type'], contains('application/json'));
      expect(jsonDecode(request.body), {
        'campaignId': 'campaign-1',
        'pledgedAmountPaise': 12345,
      });
      return http.Response(jsonEncode({
        'id': 'pledge-1',
        'campaignId': 'campaign-1',
        'pledgedAmountPaise': 12345,
        'paidAmountPaise': 0,
        'status': 'PLEDGED',
        'createdAt': '2026-10-10T04:00:00.000Z',
      }), 201);
    });
    final api = ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client);
    final repository = GivingRepository(api);
    final pledge = await repository.createPledge(
      campaignId: 'campaign-1',
      pledgedAmountPaise: 12345,
      idempotencyKey: 'pledge-attempt-1',
    );
    expect(pledge.id, 'pledge-1');
    expect(pledge.outstandingAmountPaise, 12345);
  });

  test('loads only the current donor pledge and receipt endpoints', () async {
    final paths = <String>[];
    final client = MockClient((request) async {
      paths.add(request.url.path);
      if (request.url.path.endsWith('/my-pledges')) {
        return http.Response(jsonEncode([]), 200);
      }
      if (request.url.path.endsWith('/my-receipts')) {
        return http.Response(jsonEncode([]), 200);
      }
      return http.Response(jsonEncode([]), 200);
    });
    final repository = GivingRepository(ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      tenantIdProvider: () => 'tenant-1',
      client: client,
    ));
    await repository.listMyPledges();
    await repository.listMyReceipts();
    expect(paths, ['/api/giving/my-pledges', '/api/giving/my-receipts']);
  });
  test('loads donor notifications and marks them read through authenticated endpoints', () async {
    final paths = <String>[];
    final client = MockClient((request) async {
      paths.add('${request.method} ${request.url.path}');
      if (request.url.path == '/api/notifications') {
        return http.Response(jsonEncode([
          {
            'id': 'notification-1',
            'type': 'PAYMENT_VERIFIED',
            'title': 'Donation payment verified',
            'body': 'Receipt is ready.',
            'createdAt': '2026-10-10T04:00:00.000Z',
            'readAt': null,
          }
        ]), 200);
      }
      return http.Response(jsonEncode({'id': 'notification-1', 'readAt': '2026-10-10T04:10:00.000Z'}), 201);
    });
    final repository = GivingRepository(ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      tenantIdProvider: () => 'tenant-1',
      client: client,
    ));
    final notifications = await repository.listMyNotifications();
    expect(notifications.single.id, 'notification-1');
    expect(notifications.single.isRead, isFalse);
    await repository.markNotificationRead('notification-1');
    expect(paths, ['GET /api/notifications', 'POST /api/notifications/notification-1/read']);
  });

}

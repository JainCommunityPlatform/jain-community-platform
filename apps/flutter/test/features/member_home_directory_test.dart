import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/member/presentation/member_home_page.dart';

void main() {
  testWidgets('home and temple directory use central directory data, not sample records',
      (tester) async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/directory/temples') {
        return http.Response(
          jsonEncode([
            {
              'id': 'temple-live-1',
              'slug': 'live-jinalay',
              'name': 'Live Directory Jinalay',
              'hostname': 'live-jinalay.example.test',
              'city': 'Pune',
              'state': 'Maharashtra',
            },
          ]),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('{}', 200, headers: {'content-type': 'application/json'});
    });
    final api = ApiClient(
      baseUrl: Uri.parse('https://example.test/'),
      client: client,
    );

    await tester.pumpWidget(MaterialApp(home: MemberHomePage(api: api)));
    await tester.pumpAndSettle();

    expect(find.text('Live Directory Jinalay'), findsOneWidget);
    expect(find.text('Shri Adinath Jinalay'), findsNothing);
    expect(find.text('Chaturmas Pravachan Series 2026'), findsNothing);

    await tester.tap(find.text('Temples'));
    await tester.pumpAndSettle();

    expect(find.text('Live Directory Jinalay'), findsOneWidget);
    expect(find.text('Shri Parshvanath Jinalay'), findsNothing);
    expect(find.text('Shri Mahavir Swami Jinalay'), findsNothing);
  });

  testWidgets('home and temple tabs show empty-state and search no-results feedback',
      (tester) async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/directory/temples') {
        return http.Response(
          jsonEncode(<Map<String, dynamic>>[]),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('{}', 200, headers: {'content-type': 'application/json'});
    });
    final api = ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client);

    await tester.pumpWidget(MaterialApp(home: MemberHomePage(api: api)));
    await tester.pumpAndSettle();
    expect(find.text('No temples have been published in the central directory yet.'), findsOneWidget);

    await tester.tap(find.text('Temples'));
    await tester.pumpAndSettle();
    expect(find.text('No temples have been published in the central directory yet.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Pune');
    await tester.pumpAndSettle();
    expect(find.text('No temples match “Pune”.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home and temple directory retry after API failure',
      (tester) async {
    var available = false;
    var calls = 0;
    final client = MockClient((request) async {
      if (request.url.path == '/api/directory/temples') {
        calls++;
        if (!available) {
          return http.Response('temporarily unavailable', 503);
        }
        return http.Response(
          jsonEncode([
            {
              'id': 'temple-recovered',
              'slug': 'recovered-jinalay',
              'name': 'Recovered Jinalay',
              'hostname': 'recovered.example.test',
              'city': 'Nashik',
              'state': 'Maharashtra',
            },
          ]),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('{}', 200, headers: {'content-type': 'application/json'});
    });
    final api = ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client);

    await tester.pumpWidget(MaterialApp(home: MemberHomePage(api: api)));
    await tester.pumpAndSettle();
    expect(find.text('Could not load temples. Pull down to retry.'), findsOneWidget);

    available = true;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('Recovered Jinalay'), findsOneWidget);

    await tester.tap(find.text('Temples'));
    await tester.pumpAndSettle();
    expect(find.text('Could not load temples. Pull down to retry.'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('Recovered Jinalay'), findsOneWidget);
    expect(calls, greaterThanOrEqualTo(4));
    expect(tester.takeException(), isNull);
  });

  testWidgets('temple search filters by location and pull-to-refresh reloads central data',
      (tester) async {
    var temples = <Map<String, dynamic>>[
      {
        'id': 'temple-pune',
        'slug': 'pune-jinalay',
        'name': 'Pune Jinalay',
        'hostname': 'pune.example.test',
        'city': 'Pune',
        'state': 'Maharashtra',
      },
      {
        'id': 'temple-mumbai',
        'slug': 'mumbai-jinalay',
        'name': 'Mumbai Jinalay',
        'hostname': 'mumbai.example.test',
        'city': 'Mumbai',
        'state': 'Maharashtra',
      },
    ];
    var calls = 0;
    final client = MockClient((request) async {
      if (request.url.path == '/api/directory/temples') {
        calls++;
        return http.Response(
          jsonEncode(temples),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('{}', 200, headers: {'content-type': 'application/json'});
    });
    final api = ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client);

    await tester.pumpWidget(MaterialApp(home: MemberHomePage(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Temples'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Mumbai');
    await tester.pumpAndSettle();
    expect(find.text('Mumbai Jinalay'), findsOneWidget);
    expect(find.text('Pune Jinalay'), findsNothing);

    temples = [
      {
        'id': 'temple-updated',
        'slug': 'updated-jinalay',
        'name': 'Updated Nashik Jinalay',
        'hostname': 'updated.example.test',
        'city': 'Nashik',
        'state': 'Maharashtra',
      },
    ];
    await tester.enterText(find.byType(TextField), '');
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, 500));
    await tester.pumpAndSettle();

    expect(calls, greaterThanOrEqualTo(3));
    expect(find.text('Updated Nashik Jinalay'), findsOneWidget);
    expect(find.text('Mumbai Jinalay'), findsNothing);
    expect(tester.takeException(), isNull);
  });

}

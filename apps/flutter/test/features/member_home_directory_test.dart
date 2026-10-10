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
}

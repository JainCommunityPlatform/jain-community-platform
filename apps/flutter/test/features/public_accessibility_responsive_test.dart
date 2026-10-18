import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/member/presentation/member_home_page.dart';
import 'package:jain_community_platform/features/public/presentation/bade_baba_home_page.dart';

void main() {
  testWidgets('member directory remains usable on a narrow screen with larger text',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final client = MockClient((request) async {
      if (request.url.path == '/api/directory/temples') {
        return http.Response(
          jsonEncode([
            {
              'id': 'temple-long',
              'slug': 'long-name',
              'name': 'Shri Digambar Jain Atishay Kshetra Large Community Temple',
              'hostname': 'long-name.example.test',
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
    final api = ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client);

    await tester.pumpWidget(MaterialApp(
      home: MediaQuery(
        data: const MediaQueryData(
          size: Size(320, 640),
          textScaler: TextScaler.linear(1.5),
        ),
        child: MemberHomePage(api: api),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.dragUntilVisible(
      find.textContaining('Shri Digambar Jain Atishay Kshetra'),
      find.byType(ListView).first,
      const Offset(0, -300),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Shri Digambar Jain Atishay Kshetra'), findsOneWidget);
    await tester.tap(find.text('Temples'));
    await tester.pumpAndSettle();
    await tester.dragUntilVisible(
      find.textContaining('Shri Digambar Jain Atishay Kshetra'),
      find.byType(ListView).first,
      const Offset(0, -300),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Shri Digambar Jain Atishay Kshetra'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('public tenant landing page has no overflow on a narrow screen with larger text',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(MaterialApp(
      home: MediaQuery(
        data: const MediaQueryData(
          size: Size(320, 640),
          textScaler: TextScaler.linear(1.5),
        ),
        child: const BadeBabaHomePage(),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Your Jain Temple Community'), findsOneWidget);
    await tester.dragUntilVisible(
      find.text('Sign in to continue'),
      find.byType(ListView),
      const Offset(0, -300),
    );
    await tester.pumpAndSettle();
    expect(find.text('Sign in to continue'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jain_community_platform/core/api/api_client.dart';
import 'package:jain_community_platform/features/profile/data/profile_repository.dart';

void main() {
  test('loads profile and activities', () async {
    final client = MockClient((request) async {
      if (request.url.path == '/api/profile') {
        return http.Response(jsonEncode({'id':'u1','displayName':'Arpit','phoneNumbers':['9876543210'],'primaryPhone':'9876543210','needsPhoneLink':false}),200);
      }
      return http.Response(jsonEncode([{'id':'a1','eventType':'KSHAMAWANI','eventId':'k1','title':'Kshamawani 2026','participatedAt':'2026-09-05T00:00:00Z'}]),200);
    });
    final repository = ProfileRepository(ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client));
    final profile = await repository.get();
    final activities = await repository.activities();
    expect(profile.primaryPhone, '9876543210');
    expect(activities.single.title, 'Kshamawani 2026');
  });

  test('updates profile and links contact', () async {
    final client = MockClient((request) async {
      if (request.method == 'PATCH') {
        expect(request.url.path, '/api/profile');
        return http.Response(jsonEncode({'id':'u1','address':'Pune','phoneNumbers':['9876543210'],'primaryPhone':'9876543210'}),200);
      }
      expect(request.method, 'POST');
      expect(request.url.path, '/api/profile/contact');
      return http.Response(jsonEncode({'id':'u1','phoneNumbers':['9876543210'],'primaryPhone':'9876543210','needsPhoneLink':false}),200);
    });
    final repository = ProfileRepository(ApiClient(baseUrl: Uri.parse('https://example.test/'), client: client));
    expect((await repository.update(address:'Pune')).address, 'Pune');
    expect((await repository.linkContact('9876543210')).needsPhoneLink, false);
  });
}

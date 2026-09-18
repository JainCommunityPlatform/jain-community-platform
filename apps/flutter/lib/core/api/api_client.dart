import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_exception.dart';

typedef AccessTokenProvider = Future<String?> Function();

class ApiClient {
  ApiClient({
    required this.baseUrl,
    this.accessTokenProvider,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final Uri baseUrl;
  final AccessTokenProvider? accessTokenProvider;
  final http.Client _client;

  Future<List<dynamic>> getList(String path) async {
    final response = await _send('GET', path);
    final decoded = _decode(response);
    if (decoded is! List<dynamic>) {
      throw const FormatException('Expected a JSON array');
    }
    return decoded;
  }

  Future<Map<String, dynamic>> getObject(String path) async {
    final response = await _send('GET', path);
    return _decodeObject(response);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send('POST', path, body: body);
    return _decodeObject(response);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send('PATCH', path, body: body);
    return _decodeObject(response);
  }

  Future<void> delete(String path) async {
    final response = await _send('DELETE', path);
    if (response.body.isNotEmpty) {
      _decode(response);
    }
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = await accessTokenProvider?.call();
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final uri = baseUrl.resolve(path.startsWith('/') ? path.substring(1) : path);
    final encodedBody = body == null ? null : jsonEncode(body);

    final response = switch (method) {
      'GET' => await _client.get(uri, headers: headers),
      'POST' => await _client.post(uri, headers: headers, body: encodedBody),
      'PATCH' => await _client.patch(uri, headers: headers, body: encodedBody),
      'DELETE' => await _client.delete(uri, headers: headers),
      _ => throw ArgumentError('Unsupported HTTP method: $method'),
    };

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        statusCode: response.statusCode,
        message: _errorMessage(response),
      );
    }

    return response;
  }

  dynamic _decode(http.Response response) {
    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }

  Map<String, dynamic> _decodeObject(http.Response response) {
    final decoded = _decode(response);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Expected a JSON object');
    }
    return decoded;
  }

  String _errorMessage(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic> && decoded['message'] is String) {
        return decoded['message'] as String;
      }
    } catch (_) {
      // Fall through to the status text.
    }
    return response.reasonPhrase ?? 'Request failed';
  }
}

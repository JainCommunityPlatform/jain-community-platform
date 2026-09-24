import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_exception.dart';

typedef AccessTokenProvider = Future<String?> Function();
typedef UnauthorizedHandler = Future<void> Function();

class ApiClient {
  ApiClient({
    required this.baseUrl,
    this.accessTokenProvider,
    this.onUnauthorized,
    this.requestTimeout = const Duration(seconds: 20),
    http.Client? client,
  }) : _client = client ?? http.Client();

  final Uri baseUrl;
  final AccessTokenProvider? accessTokenProvider;
  final UnauthorizedHandler? onUnauthorized;
  final Duration requestTimeout;
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
    final token = accessTokenProvider == null
        ? null
        : await accessTokenProvider!.call().timeout(requestTimeout);
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final uri = baseUrl.resolve(path.startsWith('/') ? path.substring(1) : path);
    final encodedBody = body == null ? null : jsonEncode(body);

    final Future<http.Response> request = switch (method) {
      'GET' => _client.get(uri, headers: headers),
      'POST' => _client.post(uri, headers: headers, body: encodedBody),
      'PATCH' => _client.patch(uri, headers: headers, body: encodedBody),
      'DELETE' => _client.delete(uri, headers: headers),
      _ => throw ArgumentError('Unsupported HTTP method: $method'),
    };

    final response = await request.timeout(requestTimeout);

    if (response.statusCode == 401) {
      await onUnauthorized?.call();
    }
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

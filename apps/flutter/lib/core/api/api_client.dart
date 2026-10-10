import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'api_exception.dart';

typedef AccessTokenProvider = Future<String?> Function();
typedef UnauthorizedHandler = Future<void> Function();

class ApiClient {
  ApiClient({
    required this.baseUrl,
    this.accessTokenProvider,
    this.onUnauthorized,
    this.tenantIdProvider,
    this.requestTimeout = const Duration(seconds: 20),
    http.Client? client,
  }) : _client = client ?? http.Client();

  final Uri baseUrl;
  final AccessTokenProvider? accessTokenProvider;
  final UnauthorizedHandler? onUnauthorized;
  final String? Function()? tenantIdProvider;
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
    Map<String, String>? headers,
  }) async {
    final response = await _send('POST', path, body: body, additionalHeaders: headers);
    return _decodeObject(response);
  }

  Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send('PUT', path, body: body);
    return _decodeObject(response);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send('PATCH', path, body: body);
    return _decodeObject(response);
  }


  Future<Map<String, dynamic>> uploadImage(
    String path, {
    required Uint8List bytes,
    required String filename,
    String fieldName = 'file',
  }) async {
    final token = accessTokenProvider == null
        ? null
        : await accessTokenProvider!.call().timeout(requestTimeout);
    final uri = baseUrl.resolve(path.startsWith('/') ? path.substring(1) : path);
    final request = http.MultipartRequest('POST', uri);
    request.headers['Accept'] = 'application/json';
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    final tenantId = tenantIdProvider?.call();
    if (tenantId != null && tenantId.isNotEmpty) {
      request.headers['X-JCP-Tenant-ID'] = tenantId;
    }
    request.files.add(http.MultipartFile.fromBytes(
      fieldName,
      bytes,
      filename: filename,
    ));

    final streamed = await request.send().timeout(requestTimeout);
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode == 401) {
      await onUnauthorized?.call();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        statusCode: response.statusCode,
        message: _errorMessage(response),
      );
    }
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
    Map<String, String>? additionalHeaders,
  }) async {
    final token = accessTokenProvider == null
        ? null
        : await accessTokenProvider!.call().timeout(requestTimeout);
    final headers = <String, String>{'Accept': 'application/json', ...?additionalHeaders};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final tenantId = tenantIdProvider?.call();
    if (tenantId != null && tenantId.isNotEmpty) {
      headers['X-JCP-Tenant-ID'] = tenantId;
    }

    final uri = baseUrl.resolve(path.startsWith('/') ? path.substring(1) : path);
    final encodedBody = body == null ? null : jsonEncode(body);

    final Future<http.Response> request = switch (method) {
      'GET' => _client.get(uri, headers: headers),
      'POST' => _client.post(uri, headers: headers, body: encodedBody),
      'PUT' => _client.put(uri, headers: headers, body: encodedBody),
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
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'];
        if (message is String && message.isNotEmpty) return message;
        if (message is List) {
          final details = message
              .map((item) => item.toString().trim())
              .where((item) => item.isNotEmpty)
              .toList();
          if (details.isNotEmpty) return details.join('; ');
        }
        final error = decoded['error'];
        if (error is String && error.isNotEmpty) return error;
      }
    } catch (_) {
      // Fall through to the status text.
    }
    return response.reasonPhrase ?? 'Request failed';
  }
}

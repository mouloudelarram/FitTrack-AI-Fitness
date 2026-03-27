import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/food_log.dart';
import '../models/user_profile.dart';
import '../models/weight_log.dart';
import 'auth_service.dart';

const String _baseUrl = 'https://9mx7n208r4.execute-api.us-east-1.amazonaws.com/dev';
const Duration _requestTimeout = Duration(seconds: 20);

class ApiService {
  final AuthService _authService = AuthService();

  Future<UserProfile> getProfile() async {
    final data = await _requestJsonMap(
      method: 'GET',
      path: '/profile',
    );
    return UserProfile.fromJson(data);
  }

  Future<UserProfile> createProfile({
    required String email,
    required int age,
    required double height,
    required double weight,
    required String gender,
    required String activityLevel,
    int? calorieGoal,
  }) async {
    final data = await _requestJsonMap(
      method: 'POST',
      path: '/profile',
      body: {
        'email': email,
        'age': age,
        'height': height,
        'weight': weight,
        'gender': gender,
        'activity_level': activityLevel,
        if (calorieGoal != null) 'calorie_goal': calorieGoal,
      },
    );
    return UserProfile.fromJson(data);
  }

  Future<UserProfile> updateProfile({
    int? age,
    double? height,
    double? weight,
    String? gender,
    String? activityLevel,
    int? calorieGoal,
  }) async {
    final body = <String, dynamic>{};
    if (age != null) body['age'] = age;
    if (height != null) body['height'] = height;
    if (weight != null) body['weight'] = weight;
    if (gender != null) body['gender'] = gender;
    if (activityLevel != null) body['activity_level'] = activityLevel;
    if (calorieGoal != null) body['calorie_goal'] = calorieGoal;

    final data = await _requestJsonMap(
      method: 'PUT',
      path: '/profile',
      body: body,
    );
    return UserProfile.fromJson(data);
  }

  Future<Map<String, dynamic>> getFoodLogs(String date) async {
    return _requestJsonMap(
      method: 'GET',
      path: '/food-logs',
      queryParameters: {'date': date},
    );
  }

  Future<FoodLog> addFoodLog({
    required String foodName,
    required int calories,
    required String mealType,
    required String date,
    String? imageUrl,
    String? notes,
    String? servingSize,
  }) async {
    final data = await _requestJsonMap(
      method: 'POST',
      path: '/food-logs',
      body: {
        'food_name': foodName,
        'calories': calories,
        'meal_type': mealType,
        'date': date,
        if (imageUrl != null && imageUrl.isNotEmpty) 'image_url': imageUrl,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (servingSize != null && servingSize.isNotEmpty) 'serving_size': servingSize,
      },
    );
    return FoodLog.fromJson(data);
  }

  Future<void> deleteFoodLog(String logId) async {
    await _sendAuthorizedRequest(
      method: 'DELETE',
      path: '/food-logs/$logId',
    );
  }

  Future<DailyDashboard> getDashboard({
    required String date,
    bool includeWeek = false,
  }) async {
    final data = await _requestJsonMap(
      method: 'GET',
      path: '/dashboard',
      queryParameters: {
        'date': date,
        if (includeWeek) 'include_week': 'true',
      },
    );
    return DailyDashboard.fromJson(data);
  }

  Future<Map<String, dynamic>> getWeightLogs({int days = 30}) async {
    return _requestJsonMap(
      method: 'GET',
      path: '/weight-logs',
      queryParameters: {'days': days.toString()},
    );
  }

  Future<WeightLog> logWeight({
    required double weight,
    required String date,
    String unit = 'kg',
    String? notes,
  }) async {
    final data = await _requestJsonMap(
      method: 'POST',
      path: '/weight-logs',
      body: {
        'weight': weight,
        'date': date,
        'unit': unit,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
    return WeightLog.fromJson(data);
  }

  Future<Map<String, dynamic>> getUploadUrl({
    required String contentType,
    String? fileName,
    String? logId,
  }) async {
    return _requestJsonMap(
      method: 'POST',
      path: '/images/upload',
      body: {
        'content_type': contentType,
        if (fileName != null && fileName.isNotEmpty) 'file_name': fileName,
        if (logId != null && logId.isNotEmpty) 'log_id': logId,
      },
    );
  }

  Future<String> uploadImageToS3(File imageFile, String logId) async {
    final contentType = _getContentType(imageFile.path);
    final uploadData = await getUploadUrl(
      contentType: contentType,
      fileName: imageFile.uri.pathSegments.isNotEmpty ? imageFile.uri.pathSegments.last : imageFile.path,
      logId: logId,
    );

    final uploadUrl = uploadData['upload_url'] as String? ?? '';
    final uploadFields = Map<String, String>.from(uploadData['upload_fields'] as Map? ?? const {});
    final publicUrl = uploadData['public_url'] as String? ?? '';

    if (uploadUrl.isEmpty || uploadFields.isEmpty || publicUrl.isEmpty) {
      throw Exception('Image upload configuration is incomplete.');
    }

    final request = http.MultipartRequest('POST', Uri.parse(uploadUrl));
    uploadFields.forEach((key, value) => request.fields[key] = value);

    if (!request.fields.containsKey('Content-Type')) {
      request.fields['Content-Type'] = contentType;
    }

    request.files.add(await http.MultipartFile.fromPath('file', imageFile.path));

    _debugRequest(
      method: 'POST',
      uri: Uri.parse(uploadUrl),
      headers: request.headers,
      body: {
        'fields': request.fields,
        'file': imageFile.path,
      },
      note: 'S3 presigned upload',
    );

    final streamedResponse = await request.send().timeout(_requestTimeout);
    final uploadResponse = await http.Response.fromStream(streamedResponse);
    _debugResponse(uploadResponse, note: 'S3 presigned upload');

    if (uploadResponse.statusCode != 204 && uploadResponse.statusCode != 200) {
      throw Exception('Image upload failed with status ${uploadResponse.statusCode}.');
    }

    return publicUrl;
  }

  Future<Map<String, dynamic>> getImageDownloadUrl(String objectKey) async {
    return _requestJsonMap(
      method: 'GET',
      path: '/images/download',
      queryParameters: {'key': objectKey},
    );
  }

  Future<Map<String, dynamic>> _requestJsonMap({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
  }) async {
    final response = await _sendAuthorizedRequest(
      method: method,
      path: path,
      body: body,
      queryParameters: queryParameters,
    );

    final payload = _decodeBody(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_extractErrorMessage(response, payload));
    }

    if (payload == null) {
      return <String, dynamic>{};
    }

    if (payload is Map<String, dynamic>) {
      return payload;
    }

    if (payload is Map) {
      return payload.map((key, value) => MapEntry(key.toString(), value));
    }

    throw Exception('Unexpected response format from $path.');
  }

  Future<http.Response> _sendAuthorizedRequest({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
  }) async {
    final standardCandidates = await _authService.getAuthorizationCandidates();
    final refreshedCandidates = await _authService.getAuthorizationCandidates(forceRefresh: true);
    final candidateHeaders = <String>[
      ...standardCandidates,
      ...refreshedCandidates.where((candidate) => !standardCandidates.contains(candidate)),
    ];

    if (candidateHeaders.isEmpty) {
      await _authService.signOut();
      throw Exception('No valid session token is available. Please sign in again.');
    }

    http.Response? lastResponse;

    for (final authHeader in candidateHeaders) {
      final response = await _sendRequest(
        method: method,
        path: path,
        authHeader: authHeader,
        body: body,
        queryParameters: queryParameters,
      );

      lastResponse = response;
      if (response.statusCode != 401) {
        return response;
      }
    }

    await _authService.signOut();
    throw Exception(
      _extractErrorMessage(
        lastResponse,
        _decodeBody(lastResponse),
        fallback: 'Your session has expired. Please sign in again.',
      ),
    );
  }

  Future<http.Response> _sendRequest({
    required String method,
    required String path,
    required String authHeader,
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters);
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };
    final encodedBody = body == null ? null : json.encode(body);

    _debugRequest(
      method: method,
      uri: uri,
      headers: headers,
      body: body,
    );

    try {
      late final http.Response response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await http.get(uri, headers: headers).timeout(_requestTimeout);
          break;
        case 'POST':
          response = await http.post(uri, headers: headers, body: encodedBody).timeout(_requestTimeout);
          break;
        case 'PUT':
          response = await http.put(uri, headers: headers, body: encodedBody).timeout(_requestTimeout);
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers).timeout(_requestTimeout);
          break;
        default:
          throw Exception('Unsupported HTTP method: $method');
      }

      _debugResponse(response);
      return response;
    } on SocketException catch (error) {
      throw Exception('Network error while calling $uri: $error');
    } on TimeoutException {
      throw Exception('Request to $uri timed out.');
    } on http.ClientException catch (error) {
      throw Exception('HTTP client error while calling $uri: $error');
    }
  }

  Uri _buildUri(String path, Map<String, String>? queryParameters) {
    final uri = Uri.parse('$_baseUrl$path');
    if (queryParameters == null || queryParameters.isEmpty) {
      return uri;
    }

    return uri.replace(queryParameters: queryParameters);
  }

  dynamic _decodeBody(http.Response? response) {
    if (response == null || response.bodyBytes.isEmpty) {
      return null;
    }

    final body = utf8.decode(response.bodyBytes).trim();
    if (body.isEmpty) {
      return null;
    }

    try {
      return json.decode(body);
    } catch (_) {
      return body;
    }
  }

  String _extractErrorMessage(http.Response? response, dynamic payload, {String? fallback}) {
    if (payload is Map) {
      final error = payload['error'] ?? payload['message'];
      if (error is String && error.isNotEmpty) {
        return error;
      }
    }

    if (payload is String && payload.isNotEmpty) {
      return payload;
    }

    if (response?.statusCode == 401) {
      return fallback ?? 'Unauthorized. Please sign in again.';
    }

    return fallback ?? 'Request failed with status ${response?.statusCode ?? 'unknown'}.';
  }

  String _getContentType(String filePath) {
    final ext = filePath.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  void _debugRequest({
    required String method,
    required Uri uri,
    required Map<String, String> headers,
    Object? body,
    String? note,
  }) {
    if (!kDebugMode) {
      return;
    }

    debugPrint('[ApiService] --> $method $uri${note != null ? ' ($note)' : ''}');
    debugPrint('[ApiService] Headers: $headers');
    debugPrint('[ApiService] Body: ${body == null ? '<empty>' : body}');
  }

  void _debugResponse(http.Response response, {String? note}) {
    if (!kDebugMode) {
      return;
    }

    debugPrint('[ApiService] <-- ${response.statusCode} ${response.request?.url}${note != null ? ' ($note)' : ''}');
    debugPrint('[ApiService] Response body: ${response.body.isEmpty ? '<empty>' : response.body}');
  }
}

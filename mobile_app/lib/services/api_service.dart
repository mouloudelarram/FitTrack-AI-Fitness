import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/food_log.dart';
import '../models/weight_log.dart';
import '../models/user_profile.dart';
import 'auth_service.dart';

// ⚠️  IMPORTANT: Replace this URL after deploying the backend
// Run: cd backend && serverless deploy
// Then copy the API endpoint from the output and paste below
const String _baseUrl = 'https://9mx7n208r4.execute-api.us-east-1.amazonaws.com/dev';

class ApiService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> _handleResponse(http.Response response) async {
    final body = json.decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body as Map<String, dynamic>;
    } else {
      final errorMsg = (body is Map && body.containsKey('error'))
          ? body['error']
          : 'Request failed with status ${response.statusCode}';
      throw Exception(errorMsg);
    }
  }

  // ── USER PROFILE ──────────────────────────────────────────────
  Future<UserProfile> getProfile() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('$_baseUrl/profile'),
      headers: headers,
    );
    final data = await _handleResponse(response);
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
    final headers = await _getHeaders();
    final body = {
      'email': email,
      'age': age,
      'height': height,
      'weight': weight,
      'gender': gender,
      'activity_level': activityLevel,
      if (calorieGoal != null) 'calorie_goal': calorieGoal,
    };
    final response = await http.post(
      Uri.parse('$_baseUrl/profile'),
      headers: headers,
      body: json.encode(body),
    );
    final data = await _handleResponse(response);
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
    final headers = await _getHeaders();
    final body = <String, dynamic>{};
    if (age != null) body['age'] = age;
    if (height != null) body['height'] = height;
    if (weight != null) body['weight'] = weight;
    if (gender != null) body['gender'] = gender;
    if (activityLevel != null) body['activity_level'] = activityLevel;
    if (calorieGoal != null) body['calorie_goal'] = calorieGoal;

    final response = await http.put(
      Uri.parse('$_baseUrl/profile'),
      headers: headers,
      body: json.encode(body),
    );
    final data = await _handleResponse(response);
    return UserProfile.fromJson(data);
  }

  // ── FOOD LOGS ─────────────────────────────────────────────────
  Future<Map<String, dynamic>> getFoodLogs(String date) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('$_baseUrl/food-logs?date=$date'),
      headers: headers,
    );
    return _handleResponse(response);
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
    final headers = await _getHeaders();
    final body = {
      'food_name': foodName,
      'calories': calories,
      'meal_type': mealType,
      'date': date,
      if (imageUrl != null && imageUrl.isNotEmpty) 'image_url': imageUrl,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (servingSize != null && servingSize.isNotEmpty) 'serving_size': servingSize,
    };
    final response = await http.post(
      Uri.parse('$_baseUrl/food-logs'),
      headers: headers,
      body: json.encode(body),
    );
    final data = await _handleResponse(response);
    return FoodLog.fromJson(data);
  }

  Future<void> deleteFoodLog(String logId) async {
    final headers = await _getHeaders();
    final response = await http.delete(
      Uri.parse('$_baseUrl/food-logs/$logId'),
      headers: headers,
    );
    await _handleResponse(response);
  }

  // ── DASHBOARD ─────────────────────────────────────────────────
  Future<DailyDashboard> getDashboard({
    required String date,
    bool includeWeek = false,
  }) async {
    final headers = await _getHeaders();
    final weekParam = includeWeek ? '&include_week=true' : '';
    final response = await http.get(
      Uri.parse('$_baseUrl/dashboard?date=$date$weekParam'),
      headers: headers,
    );
    final data = await _handleResponse(response);
    return DailyDashboard.fromJson(data);
  }

  // ── WEIGHT LOGS ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getWeightLogs({int days = 30}) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('$_baseUrl/weight-logs?days=$days'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  Future<WeightLog> logWeight({
    required double weight,
    required String date,
    String unit = 'kg',
    String? notes,
  }) async {
    final headers = await _getHeaders();
    final body = {
      'weight': weight,
      'date': date,
      'unit': unit,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    final response = await http.post(
      Uri.parse('$_baseUrl/weight-logs'),
      headers: headers,
      body: json.encode(body),
    );
    final data = await _handleResponse(response);
    return WeightLog.fromJson(data);
  }

  // ── IMAGE UPLOAD ──────────────────────────────────────────────
  Future<Map<String, dynamic>> getUploadUrl({
    required String contentType,
    String? fileName,
    String? logId,
  }) async {
    final headers = await _getHeaders();
    final body = {
      'content_type': contentType,
      if (fileName != null) 'file_name': fileName,
      if (logId != null) 'log_id': logId,
    };
    final response = await http.post(
      Uri.parse('$_baseUrl/images/upload'),
      headers: headers,
      body: json.encode(body),
    );
    return _handleResponse(response);
  }

  Future<String> uploadImageToS3(File imageFile, String logId) async {
    final contentType = _getContentType(imageFile.path);
    final uploadData = await getUploadUrl(
      contentType: contentType,
      fileName: imageFile.path.split('/').last,
      logId: logId,
    );

    final uploadUrl = uploadData['upload_url'] as String;
    final uploadFields = Map<String, String>.from(uploadData['upload_fields'] as Map);
    final objectKey = uploadData['object_key'] as String;
    final publicUrl = uploadData['public_url'] as String;

    final request = http.MultipartRequest('POST', Uri.parse(uploadUrl));
    uploadFields.forEach((key, value) => request.fields[key] = value);
    request.files.add(await http.MultipartFile.fromPath('file', imageFile.path));

    final streamedResponse = await request.send();
    if (streamedResponse.statusCode != 204 && streamedResponse.statusCode != 200) {
      throw Exception('Image upload failed with status ${streamedResponse.statusCode}');
    }
    return publicUrl;
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
}

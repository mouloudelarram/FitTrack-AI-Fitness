class UserProfile {
  final String userId;
  final String email;
  final int age;
  final double height;
  final double weight;
  final String gender;
  final String activityLevel;
  final int calorieGoal;
  final String createdAt;
  final String updatedAt;

  UserProfile({
    required this.userId,
    required this.email,
    required this.age,
    required this.height,
    required this.weight,
    required this.gender,
    required this.activityLevel,
    required this.calorieGoal,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['user_id'] ?? '',
      email: json['email'] ?? '',
      age: _parseInt(json['age'], 30),
      height: _parseDouble(json['height'], 170.0),
      weight: _parseDouble(json['weight'], 70.0),
      gender: json['gender'] ?? 'male',
      activityLevel: json['activity_level'] ?? 'moderate',
      calorieGoal: _parseInt(json['calorie_goal'], 2000),
      createdAt: json['created_at'] ?? '',
      updatedAt: json['updated_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'email': email,
      'age': age,
      'height': height,
      'weight': weight,
      'gender': gender,
      'activity_level': activityLevel,
      'calorie_goal': calorieGoal,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  UserProfile copyWith({
    String? userId,
    String? email,
    int? age,
    double? height,
    double? weight,
    String? gender,
    String? activityLevel,
    int? calorieGoal,
    String? createdAt,
    String? updatedAt,
  }) {
    return UserProfile(
      userId: userId ?? this.userId,
      email: email ?? this.email,
      age: age ?? this.age,
      height: height ?? this.height,
      weight: weight ?? this.weight,
      gender: gender ?? this.gender,
      activityLevel: activityLevel ?? this.activityLevel,
      calorieGoal: calorieGoal ?? this.calorieGoal,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  static int _parseInt(dynamic value, int defaultValue) {
    if (value == null) return defaultValue;
    if (value is int) return value;
    if (value is double) return value.toInt();
    return int.tryParse(value.toString()) ?? defaultValue;
  }

  static double _parseDouble(dynamic value, double defaultValue) {
    if (value == null) return defaultValue;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    return double.tryParse(value.toString()) ?? defaultValue;
  }
}

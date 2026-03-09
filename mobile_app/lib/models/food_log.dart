class FoodLog {
  final String logId;
  final String userId;
  final String foodName;
  final int calories;
  final String mealType;
  final String date;
  final String imageUrl;
  final String notes;
  final String servingSize;
  final String createdAt;

  FoodLog({
    required this.logId,
    required this.userId,
    required this.foodName,
    required this.calories,
    required this.mealType,
    required this.date,
    this.imageUrl = '',
    this.notes = '',
    this.servingSize = '',
    required this.createdAt,
  });

  factory FoodLog.fromJson(Map<String, dynamic> json) {
    return FoodLog(
      logId: json['log_id'] ?? '',
      userId: json['user_id'] ?? '',
      foodName: json['food_name'] ?? '',
      calories: _parseInt(json['calories'], 0),
      mealType: json['meal_type'] ?? 'snack',
      date: json['date'] ?? '',
      imageUrl: json['image_url'] ?? '',
      notes: json['notes'] ?? '',
      servingSize: json['serving_size'] ?? '',
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'log_id': logId,
      'user_id': userId,
      'food_name': foodName,
      'calories': calories,
      'meal_type': mealType,
      'date': date,
      'image_url': imageUrl,
      'notes': notes,
      'serving_size': servingSize,
      'created_at': createdAt,
    };
  }

  static int _parseInt(dynamic value, int defaultValue) {
    if (value == null) return defaultValue;
    if (value is int) return value;
    if (value is double) return value.toInt();
    return int.tryParse(value.toString()) ?? defaultValue;
  }
}

class DailyDashboard {
  final String date;
  final int calorieGoal;
  final int totalCaloriesConsumed;
  final int remainingCalories;
  final double percentageConsumed;
  final Map<String, int> mealBreakdown;
  final List<FoodLog> foodLogs;
  final String status;
  final List<WeeklySummary> weekSummary;

  DailyDashboard({
    required this.date,
    required this.calorieGoal,
    required this.totalCaloriesConsumed,
    required this.remainingCalories,
    required this.percentageConsumed,
    required this.mealBreakdown,
    required this.foodLogs,
    required this.status,
    this.weekSummary = const [],
  });

  factory DailyDashboard.fromJson(Map<String, dynamic> json) {
    final mealBreakdownRaw = json['meal_breakdown'] as Map<String, dynamic>? ?? {};
    final mealBreakdown = mealBreakdownRaw.map(
      (key, value) => MapEntry(key, (value is int) ? value : int.tryParse(value.toString()) ?? 0),
    );

    final foodLogsRaw = json['food_logs'] as List<dynamic>? ?? [];
    final foodLogs = foodLogsRaw.map((e) => FoodLog.fromJson(e as Map<String, dynamic>)).toList();

    final weekRaw = json['week_summary'] as List<dynamic>? ?? [];
    final weekSummary = weekRaw.map((e) => WeeklySummary.fromJson(e as Map<String, dynamic>)).toList();

    return DailyDashboard(
      date: json['date'] ?? '',
      calorieGoal: _parseInt(json['calorie_goal'], 2000),
      totalCaloriesConsumed: _parseInt(json['total_calories_consumed'], 0),
      remainingCalories: _parseInt(json['remaining_calories'], 0),
      percentageConsumed: _parseDouble(json['percentage_consumed'], 0.0),
      mealBreakdown: mealBreakdown,
      foodLogs: foodLogs,
      status: json['status'] ?? 'under_goal',
      weekSummary: weekSummary,
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

class WeeklySummary {
  final String date;
  final int calories;
  final int goal;

  WeeklySummary({required this.date, required this.calories, required this.goal});

  factory WeeklySummary.fromJson(Map<String, dynamic> json) {
    return WeeklySummary(
      date: json['date'] ?? '',
      calories: (json['calories'] is int) ? json['calories'] : int.tryParse(json['calories'].toString()) ?? 0,
      goal: (json['goal'] is int) ? json['goal'] : int.tryParse(json['goal'].toString()) ?? 2000,
    );
  }
}

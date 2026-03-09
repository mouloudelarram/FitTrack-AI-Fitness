class WeightLog {
  final String logId;
  final String userId;
  final double weight;
  final double weightOriginal;
  final String unit;
  final String date;
  final String notes;
  final String createdAt;

  WeightLog({
    required this.logId,
    required this.userId,
    required this.weight,
    required this.weightOriginal,
    required this.unit,
    required this.date,
    this.notes = '',
    required this.createdAt,
  });

  factory WeightLog.fromJson(Map<String, dynamic> json) {
    return WeightLog(
      logId: json['log_id'] ?? '',
      userId: json['user_id'] ?? '',
      weight: _parseDouble(json['weight'], 0.0),
      weightOriginal: _parseDouble(json['weight_original'], 0.0),
      unit: json['unit'] ?? 'kg',
      date: json['date'] ?? '',
      notes: json['notes'] ?? '',
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'log_id': logId,
      'user_id': userId,
      'weight': weight,
      'weight_original': weightOriginal,
      'unit': unit,
      'date': date,
      'notes': notes,
      'created_at': createdAt,
    };
  }

  static double _parseDouble(dynamic value, double defaultValue) {
    if (value == null) return defaultValue;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    return double.tryParse(value.toString()) ?? defaultValue;
  }
}

class WeightStats {
  final double currentWeight;
  final double startWeight;
  final double minWeight;
  final double maxWeight;
  final double change;
  final int entriesCount;

  WeightStats({
    required this.currentWeight,
    required this.startWeight,
    required this.minWeight,
    required this.maxWeight,
    required this.change,
    required this.entriesCount,
  });

  factory WeightStats.fromJson(Map<String, dynamic> json) {
    return WeightStats(
      currentWeight: _parseDouble(json['current_weight'], 0.0),
      startWeight: _parseDouble(json['start_weight'], 0.0),
      minWeight: _parseDouble(json['min_weight'], 0.0),
      maxWeight: _parseDouble(json['max_weight'], 0.0),
      change: _parseDouble(json['change'], 0.0),
      entriesCount: (json['entries_count'] is int) ? json['entries_count'] : int.tryParse(json['entries_count'].toString()) ?? 0,
    );
  }

  static double _parseDouble(dynamic value, double defaultValue) {
    if (value == null) return defaultValue;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    return double.tryParse(value.toString()) ?? defaultValue;
  }
}

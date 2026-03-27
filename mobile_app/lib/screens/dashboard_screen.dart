import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../models/food_log.dart';
import 'add_food_screen.dart';
import 'progress_screen.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _apiService = ApiService();
  final _authService = AuthService();

  DailyDashboard? _dashboard;
  bool _isLoading = true;
  String _error = '';
  DateTime _selectedDate = DateTime.now();
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });
    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final dashboard = await _apiService.getDashboard(date: dateStr, includeWeek: true);
      if (mounted) setState(() => _dashboard = dashboard);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteLog(String logId) async {
    try {
      await _apiService.deleteFoodLog(logId);
      _loadDashboard();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _signOut() async {
    await _authService.signOut();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final screens = [
      _buildDashboardContent(theme),
      const ProgressScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: _currentIndex == 0
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.fitness_center, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  const Text('FitTrack'),
                ],
              )
            : const Text('Progress'),
        actions: [
          if (_currentIndex == 0) ...[
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () {
                setState(() => _selectedDate = _selectedDate.subtract(const Duration(days: 1)));
                _loadDashboard();
              },
            ),
            TextButton(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  setState(() => _selectedDate = picked);
                  _loadDashboard();
                }
              },
              child: Text(
                DateFormat('MMM d').format(_selectedDate),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: _selectedDate.isBefore(DateTime.now().subtract(const Duration(days: 1)))
                  ? () {
                      setState(() => _selectedDate = _selectedDate.add(const Duration(days: 1)));
                      _loadDashboard();
                    }
                  : null,
            ),
          ],
          PopupMenuButton(
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'signout', child: Row(children: [Icon(Icons.logout), SizedBox(width: 8), Text('Sign Out')])),
            ],
            onSelected: (value) {
              if (value == 'signout') _signOut();
            },
          ),
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.show_chart_outlined), selectedIcon: Icon(Icons.show_chart), label: 'Progress'),
        ],
      ),
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton.extended(
              onPressed: () async {
                final result = await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => AddFoodScreen(selectedDate: _selectedDate)),
                );
                if (result == true) _loadDashboard();
              },
              icon: const Icon(Icons.add),
              label: const Text('Add Food'),
            )
          : null,
    );
  }

  Widget _buildDashboardContent(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error.isNotEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadDashboard, child: const Text('Retry')),
          ],
        ),
      );
    }
    if (_dashboard == null) return const Center(child: Text('No data available'));

    final d = _dashboard!;
    final isToday = DateFormat('yyyy-MM-dd').format(_selectedDate) == DateFormat('yyyy-MM-dd').format(DateTime.now());
    final calorieProgress = (d.calorieGoal > 0) ? (d.totalCaloriesConsumed / d.calorieGoal).clamp(0.0, 1.0) : 0.0;
    final progressColor = d.totalCaloriesConsumed > d.calorieGoal ? Colors.red : theme.colorScheme.primary;

    return RefreshIndicator(
      onRefresh: _loadDashboard,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Calorie ring card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Text(
                    isToday ? "Today's Calories" : DateFormat('EEEE, MMM d').format(_selectedDate),
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 160, height: 160,
                        child: CircularProgressIndicator(
                          value: calorieProgress,
                          strokeWidth: 14,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${d.totalCaloriesConsumed}',
                            style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Text('of ${d.calorieGoal} kcal', style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _calStat(theme, 'Eaten', '${d.totalCaloriesConsumed}', Icons.restaurant_outlined, theme.colorScheme.primary),
                      Container(width: 1, height: 40, color: Colors.grey.shade300),
                      _calStat(
                        theme,
                        d.remainingCalories >= 0 ? 'Remaining' : 'Over',
                        '${d.remainingCalories.abs()}',
                        d.remainingCalories >= 0 ? Icons.check_circle_outline : Icons.warning_amber_outlined,
                        d.remainingCalories >= 0 ? Colors.green : Colors.red,
                      ),
                      Container(width: 1, height: 40, color: Colors.grey.shade300),
                      _calStat(theme, 'Goal', '${d.calorieGoal}', Icons.flag_outlined, Colors.orange),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Meal breakdown
          if (d.mealBreakdown.isNotEmpty) ...[
            Text('Meal Breakdown', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: d.mealBreakdown.entries.map((entry) {
                return Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                      child: Column(
                        children: [
                          Text(_mealIcon(entry.key), style: const TextStyle(fontSize: 20)),
                          const SizedBox(height: 4),
                          Text(_capitalize(entry.key), style: theme.textTheme.bodySmall),
                          Text('${entry.value}', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                          Text('kcal', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
          // Food logs list
          Text('Food Log', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (d.foodLogs.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(Icons.no_food, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No food logged yet', style: TextStyle(color: Colors.grey.shade600)),
                    const SizedBox(height: 4),
                    Text('Tap "+ Add Food" to get started', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                  ],
                ),
              ),
            )
          else
            ...d.foodLogs.map((log) => _foodLogCard(theme, log)),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _calStat(ThemeData theme, String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(value, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        Text(label, style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
      ],
    );
  }

  Widget _foodLogCard(ThemeData theme, FoodLog log) {
    return Dismissible(
      key: Key(log.logId),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => _deleteLog(log.logId),
      child: Card(
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: _mealColor(log.mealType).withValues(alpha: 0.15),
            child: Text(_mealIcon(log.mealType), style: const TextStyle(fontSize: 18)),
          ),
          title: Text(log.foodName, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(_capitalize(log.mealType) + (log.servingSize.isNotEmpty ? ' · ${log.servingSize}' : '')),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${log.calories}', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
              Text('kcal', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  String _mealIcon(String mealType) {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snack': return '🍎';
      default: return '🍴';
    }
  }

  Color _mealColor(String mealType) {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return Colors.orange;
      case 'lunch': return Colors.green;
      case 'dinner': return Colors.blue;
      case 'snack': return Colors.purple;
      default: return Colors.grey;
    }
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

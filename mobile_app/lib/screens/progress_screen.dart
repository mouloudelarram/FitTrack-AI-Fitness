import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/weight_log.dart';

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  final _apiService = ApiService();
  final _weightCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  List<WeightLog> _weightLogs = [];
  WeightStats? _stats;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String _error = '';
  int _selectedDays = 30;

  @override
  void initState() {
    super.initState();
    _loadWeightLogs();
  }

  @override
  void dispose() {
    _weightCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadWeightLogs() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });
    try {
      final data = await _apiService.getWeightLogs(days: _selectedDays);
      final logsRaw = data['weight_logs'] as List<dynamic>? ?? [];
      final logs = logsRaw.map((e) => WeightLog.fromJson(e as Map<String, dynamic>)).toList();
      WeightStats? stats;
      if (data['stats'] != null && (data['stats'] as Map).isNotEmpty) {
        stats = WeightStats.fromJson(data['stats'] as Map<String, dynamic>);
      }
      if (mounted) {
        setState(() {
          _weightLogs = logs;
          _stats = stats;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _logWeight() async {
    final weightText = _weightCtrl.text.trim();
    final weight = double.tryParse(weightText);
    if (weight == null || weight <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid weight'), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      await _apiService.logWeight(
        weight: weight,
        date: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        notes: _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
      );
      _weightCtrl.clear();
      _notesCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Weight logged!'), backgroundColor: Colors.green),
        );
      }
      _loadWeightLogs();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  List<FlSpot> _buildChartSpots() {
    if (_weightLogs.isEmpty) return [];
    return _weightLogs.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.weight);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return RefreshIndicator(
      onRefresh: _loadWeightLogs,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Log weight card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.monitor_weight_outlined, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text('Log Today\'s Weight', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _weightCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Weight',
                            suffixText: 'kg',
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _logWeight,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(80, 48),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Log'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _notesCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Notes (optional)',
                      isDense: true,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Stats cards
          if (_stats != null) ...[
            Row(
              children: [
                Expanded(child: _statCard(theme, 'Current', '${_stats!.currentWeight.toStringAsFixed(1)} kg', Icons.radio_button_checked, theme.colorScheme.primary)),
                const SizedBox(width: 8),
                Expanded(child: _statCard(theme, 'Change', '${_stats!.change >= 0 ? '+' : ''}${_stats!.change.toStringAsFixed(1)} kg', _stats!.change <= 0 ? Icons.trending_down : Icons.trending_up, _stats!.change <= 0 ? Colors.green : Colors.red)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _statCard(theme, 'Lowest', '${_stats!.minWeight.toStringAsFixed(1)} kg', Icons.arrow_downward, Colors.blue)),
                const SizedBox(width: 8),
                Expanded(child: _statCard(theme, 'Highest', '${_stats!.maxWeight.toStringAsFixed(1)} kg', Icons.arrow_upward, Colors.orange)),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Period selector
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Weight History', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              SegmentedButton<int>(
                style: SegmentedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 32),
                ),
                segments: const [
                  ButtonSegment(value: 7, label: Text('7d')),
                  ButtonSegment(value: 30, label: Text('30d')),
                  ButtonSegment(value: 90, label: Text('90d')),
                ],
                selected: {_selectedDays},
                onSelectionChanged: (s) {
                  setState(() => _selectedDays = s.first);
                  _loadWeightLogs();
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
          else if (_error.isNotEmpty)
            Center(child: Column(children: [
              Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 8),
              Text(_error, textAlign: TextAlign.center),
              TextButton(onPressed: _loadWeightLogs, child: const Text('Retry')),
            ]))
          else if (_weightLogs.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(Icons.show_chart, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No weight logs yet', style: TextStyle(color: Colors.grey.shade600)),
                    const SizedBox(height: 4),
                    Text('Log your weight above to see progress', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                  ],
                ),
              ),
            )
          else ...[
            // Chart
            if (_weightLogs.length > 1)
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
                  child: SizedBox(
                    height: 200,
                    child: LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          getDrawingHorizontalLine: (value) => FlLine(color: Colors.grey.shade200, strokeWidth: 1),
                        ),
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 42,
                              getTitlesWidget: (value, meta) => Text('${value.toStringAsFixed(0)}kg', style: const TextStyle(fontSize: 10)),
                            ),
                          ),
                          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: _buildChartSpots(),
                            isCurved: true,
                            color: theme.colorScheme.primary,
                            barWidth: 3,
                            dotData: FlDotData(show: _weightLogs.length <= 10),
                            belowBarData: BarAreaData(
                              show: true,
                              color: theme.colorScheme.primary.withOpacity(0.1),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            // Log list
            ...(_weightLogs.reversed.take(20).map((log) => Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Icon(Icons.monitor_weight_outlined, color: theme.colorScheme.primary, size: 20),
                ),
                title: Text('${log.weight.toStringAsFixed(1)} kg', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(log.notes.isNotEmpty ? log.notes : 'No notes'),
                trailing: Text(
                  DateFormat('MMM d').format(DateTime.parse(log.date)),
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
            ))),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _statCard(ThemeData theme, String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

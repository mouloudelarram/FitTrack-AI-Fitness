import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';

class AddFoodScreen extends StatefulWidget {
  final DateTime selectedDate;

  const AddFoodScreen({super.key, required this.selectedDate});

  @override
  State<AddFoodScreen> createState() => _AddFoodScreenState();
}

class _AddFoodScreenState extends State<AddFoodScreen> {
  final _formKey = GlobalKey<FormState>();
  final _foodNameCtrl = TextEditingController();
  final _caloriesCtrl = TextEditingController();
  final _servingSizeCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _apiService = ApiService();

  String _mealType = 'breakfast';
  bool _isLoading = false;
  File? _selectedImage;

  static const List<Map<String, String>> _commonFoods = [
    {'name': 'Apple (medium)', 'calories': '95'},
    {'name': 'Banana (medium)', 'calories': '105'},
    {'name': 'Boiled Egg', 'calories': '78'},
    {'name': 'Chicken Breast (100g)', 'calories': '165'},
    {'name': 'White Rice (1 cup cooked)', 'calories': '206'},
    {'name': 'Oatmeal (1 cup cooked)', 'calories': '166'},
    {'name': 'Greek Yogurt (150g)', 'calories': '100'},
    {'name': 'Salmon (100g)', 'calories': '208'},
    {'name': 'Broccoli (1 cup)', 'calories': '55'},
    {'name': 'Almonds (30g)', 'calories': '173'},
    {'name': 'Whole Milk (240ml)', 'calories': '149'},
    {'name': 'Bread Slice', 'calories': '79'},
  ];

  @override
  void dispose() {
    _foodNameCtrl.dispose();
    _caloriesCtrl.dispose();
    _servingSizeCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final source = await _showImageSourceDialog();
    if (source == null) return;

    final picked = await picker.pickImage(source: source, imageQuality: 80, maxWidth: 1024);
    if (picked != null) {
      setState(() => _selectedImage = File(picked.path));
    }
  }

  Future<ImageSource?> _showImageSourceDialog() {
    return showDialog<ImageSource>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Image Source'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  void _selectCommonFood(Map<String, String> food) {
    setState(() {
      _foodNameCtrl.text = food['name']!;
      _caloriesCtrl.text = food['calories']!;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      String? imageUrl;

      // Upload image if selected
      if (_selectedImage != null) {
        try {
          imageUrl = await _apiService.uploadImageToS3(_selectedImage!, 'pending');
        } catch (e) {
          // Image upload failed - continue without image
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Image upload skipped: $e'), backgroundColor: Colors.orange),
            );
          }
        }
      }

      await _apiService.addFoodLog(
        foodName: _foodNameCtrl.text.trim(),
        calories: int.parse(_caloriesCtrl.text.trim()),
        mealType: _mealType,
        date: DateFormat('yyyy-MM-dd').format(widget.selectedDate),
        imageUrl: imageUrl,
        notes: _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
        servingSize: _servingSizeCtrl.text.trim().isNotEmpty ? _servingSizeCtrl.text.trim() : null,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Food logged successfully!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Add Food')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Quick Select
                Text('Quick Select', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: _commonFoods.map((food) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                          label: Text(food['name']!),
                          onPressed: () => _selectCommonFood(food),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 20),
                // Food details
                Text('Food Details', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _foodNameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Food Name *',
                    prefixIcon: Icon(Icons.fastfood_outlined),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Food name is required';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _caloriesCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Calories *',
                          prefixIcon: Icon(Icons.local_fire_department_outlined),
                          suffixText: 'kcal',
                        ),
                        validator: (v) {
                          final cal = int.tryParse(v ?? '');
                          if (cal == null || cal < 0) return 'Valid calories required';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _servingSizeCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Serving Size',
                          hintText: 'e.g. 100g',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Meal type selector
                Text('Meal Type', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  children: ['breakfast', 'lunch', 'dinner', 'snack'].map((meal) {
                    final isSelected = _mealType == meal;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: GestureDetector(
                          onTap: () => setState(() => _mealType = meal),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? theme.colorScheme.primary : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? theme.colorScheme.primary : Colors.grey.shade300,
                              ),
                            ),
                            child: Column(
                              children: [
                                Text(_mealIcon(meal), style: const TextStyle(fontSize: 18)),
                                const SizedBox(height: 2),
                                Text(
                                  _capitalize(meal),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: isSelected ? Colors.white : Colors.grey.shade700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _notesCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    prefixIcon: Icon(Icons.note_outlined),
                  ),
                ),
                const SizedBox(height: 20),
                // Photo upload
                Text('Meal Photo (optional)', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    height: 150,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                    ),
                    child: _selectedImage != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(_selectedImage!, fit: BoxFit.cover),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_photo_alternate_outlined, size: 48, color: Colors.grey.shade400),
                              const SizedBox(height: 8),
                              Text('Tap to add a photo', style: TextStyle(color: Colors.grey.shade600)),
                            ],
                          ),
                  ),
                ),
                if (_selectedImage != null) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => setState(() => _selectedImage = null),
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Remove photo'),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                  ),
                ],
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: _isLoading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Log Food', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _mealIcon(String mealType) {
    switch (mealType) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snack': return '🍎';
      default: return '🍴';
    }
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

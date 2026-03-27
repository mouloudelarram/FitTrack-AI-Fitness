import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String initialEmail;

  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();
  final _authService = AuthService();

  bool _isLoading = false;
  bool _awaitingConfirmation = false;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void initState() {
    super.initState();
    _emailCtrl.text = widget.initialEmail;
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _codeCtrl.dispose();
    _newPasswordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendResetCode() async {
    final email = _emailCtrl.text.trim();
    if (!_isValidEmail(email)) {
      _showError('Enter a valid email address.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _authService.resetPassword(email);
      if (!mounted) return;
      setState(() {
        _awaitingConfirmation = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('A reset code has been sent to $email'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      _showError(e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _confirmReset() async {
    final email = _emailCtrl.text.trim();
    final code = _codeCtrl.text.trim();
    final newPassword = _newPasswordCtrl.text;
    final confirmPassword = _confirmPasswordCtrl.text;

    if (!_isValidEmail(email)) {
      _showError('Enter a valid email address.');
      return;
    }
    if (code.isEmpty) {
      _showError('Enter the confirmation code.');
      return;
    }
    if (newPassword.length < 8) {
      _showError('Password must be at least 8 characters.');
      return;
    }
    if (!newPassword.contains(RegExp(r'[A-Z]'))) {
      _showError('Password must contain an uppercase letter.');
      return;
    }
    if (!newPassword.contains(RegExp(r'[0-9]'))) {
      _showError('Password must contain a number.');
      return;
    }
    if (newPassword != confirmPassword) {
      _showError('Passwords do not match.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final result = await _authService.confirmResetPassword(
        email: email,
        newPassword: newPassword,
        confirmationCode: code,
      );

      if (!mounted) return;

      if (result.isPasswordReset) {
        Navigator.of(context).pop(email);
      } else {
        _showError('Password reset is not complete yet.');
      }
    } catch (e) {
      _showError(e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  bool _isValidEmail(String email) {
    return email.isNotEmpty && email.contains('@');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reset Password'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Icon(
                _awaitingConfirmation ? Icons.lock_reset : Icons.mark_email_read_outlined,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                _awaitingConfirmation ? 'Create a new password' : 'Forgot your password?',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                _awaitingConfirmation
                    ? 'Enter the confirmation code sent to your email and choose a new password.'
                    : 'We will send a confirmation code to your email so you can reset your password.',
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              if (_awaitingConfirmation) ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Confirmation Code',
                    prefixIcon: Icon(Icons.verified_user_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _newPasswordCtrl,
                  obscureText: _obscureNewPassword,
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureNewPassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscureNewPassword = !_obscureNewPassword),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmPasswordCtrl,
                  obscureText: _obscureConfirmPassword,
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureConfirmPassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : (_awaitingConfirmation ? _confirmReset : _sendResetCode),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        _awaitingConfirmation ? 'Reset Password' : 'Send Reset Code',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
              if (_awaitingConfirmation) ...[
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: _isLoading ? null : _sendResetCode,
                    child: const Text('Resend Code'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

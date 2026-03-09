import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';
  static const String _userEmailKey = 'user_email';

  // Sign up new user
  Future<SignUpResult> signUp({
    required String email,
    required String password,
  }) async {
    try {
      final userAttributes = {
        AuthUserAttributeKey.email: email,
      };
      final result = await Amplify.Auth.signUp(
        username: email,
        password: password,
        options: SignUpOptions(userAttributes: userAttributes),
      );
      return result;
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  // Confirm sign up with OTP
  Future<SignUpResult> confirmSignUp({
    required String email,
    required String confirmationCode,
  }) async {
    try {
      final result = await Amplify.Auth.confirmSignUp(
        username: email,
        confirmationCode: confirmationCode,
      );
      return result;
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  // Sign in
  Future<SignInResult> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final result = await Amplify.Auth.signIn(
        username: email,
        password: password,
      );

      if (result.isSignedIn) {
        await _cacheUserInfo();
      }
      return result;
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await Amplify.Auth.signOut();
      await _clearCachedUserInfo();
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  // Check if user is signed in
  Future<bool> isSignedIn() async {
    try {
      final session = await Amplify.Auth.fetchAuthSession();
      return session.isSignedIn;
    } catch (_) {
      return false;
    }
  }

  // Get current user token
  Future<String?> getToken() async {
    try {
      final session = await Amplify.Auth.fetchAuthSession(
        options: const FetchAuthSessionOptions(forceRefresh: false),
      ) as CognitoAuthSession;
      return session.userPoolTokensResult.value.accessToken.raw;
    } catch (_) {
      // Fallback to cached token
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_tokenKey);
    }
  }

  // Get current user ID (sub)
  Future<String?> getCurrentUserId() async {
    try {
      final user = await Amplify.Auth.getCurrentUser();
      return user.userId;
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_userIdKey);
    }
  }

  // Get current user email
  Future<String?> getCurrentUserEmail() async {
    try {
      final attributes = await Amplify.Auth.fetchUserAttributes();
      for (final attribute in attributes) {
        if (attribute.userAttributeKey == AuthUserAttributeKey.email) {
          return attribute.value;
        }
      }
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userEmailKey);
  }

  // Resend confirmation code
  Future<ResendSignUpCodeResult> resendConfirmationCode(String email) async {
    try {
      return await Amplify.Auth.resendSignUpCode(username: email);
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  // Reset password
  Future<ResetPasswordResult> resetPassword(String email) async {
    try {
      return await Amplify.Auth.resetPassword(username: email);
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  // Confirm reset password
  Future<ResetPasswordResult> confirmResetPassword({
    required String email,
    required String newPassword,
    required String confirmationCode,
  }) async {
    try {
      return await Amplify.Auth.confirmResetPassword(
        username: email,
        newPassword: newPassword,
        confirmationCode: confirmationCode,
      );
    } on AuthException catch (e) {
      throw Exception(e.message);
    }
  }

  Future<void> _cacheUserInfo() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = await getToken();
      if (token != null) {
        await prefs.setString(_tokenKey, token);
      }
      final userId = await getCurrentUserId();
      if (userId != null) {
        await prefs.setString(_userIdKey, userId);
      }
      final email = await getCurrentUserEmail();
      if (email != null) {
        await prefs.setString(_userEmailKey, email);
      }
    } catch (_) {}
  }

  Future<void> _clearCachedUserInfo() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userIdKey);
    await prefs.remove(_userEmailKey);
  }
}

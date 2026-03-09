# FitTrack Mobile App

Flutter calorie tracking application.

## Quick Setup

### 1. Install Flutter
```bash
# macOS (Homebrew)
brew install flutter

# Or download from: https://flutter.dev/docs/get-started/install
```

### 2. Verify Flutter installation
```bash
flutter doctor
```

Resolve any issues shown (Android Studio, Xcode, etc.)

### 3. Install dependencies
```bash
cd mobile_app
flutter pub get
```

### 4. Configure AWS (REQUIRED before running)

After deploying the backend, update these files:

**`lib/main.dart`** — Update Cognito settings:
```dart
const String cognitoUserPoolId = 'us-east-1_XXXXXXXXX';    // From deploy output
const String cognitoAppClientId = 'XXXXXXXXXXXXXXXXXX';     // From deploy output
const String cognitoRegion = 'us-east-1';
```

**`lib/services/api_service.dart`** — Update API URL:
```dart
const String _baseUrl = 'https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/dev';
```

Both values are printed when you run `./infrastructure/deploy_commands.sh`, or saved in `mobile_app/aws_config.txt`.

### 5. Run the app
```bash
# List available devices
flutter devices

# Run on connected device or emulator
flutter run

# Run on specific device
flutter run -d android
flutter run -d ios
flutter run -d chrome  # web (limited features)
```

### 6. Build for release

#### Android APK
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

#### iOS (macOS only)
```bash
flutter build ios --release
```

---

## App Features

| Feature | Screen |
|---------|--------|
| Sign Up / Login | Login & Signup screens |
| Daily calorie dashboard | Dashboard tab |
| Add food with photo | Add Food screen (FAB) |
| Weight tracking & chart | Progress tab |
| Swipe to delete food logs | Dashboard |

---

## Platform Requirements

| Platform | Minimum Version |
|----------|----------------|
| Android | API 21 (Android 5.0) |
| iOS | iOS 12.0 |
| Flutter | 3.0.0+ |
| Dart | 3.0.0+ |

---

## Troubleshooting

### "flutter: command not found"
Add Flutter to your PATH:
```bash
export PATH="$PATH:/path/to/flutter/bin"
```

### Build errors on iOS
```bash
cd ios
pod install
cd ..
flutter run
```

### Amplify configuration error
Make sure you've updated `cognitoUserPoolId` and `cognitoAppClientId` in `lib/main.dart` with your actual Cognito values.

### Network errors
Make sure you've updated `_baseUrl` in `lib/services/api_service.dart` with your actual API Gateway URL.

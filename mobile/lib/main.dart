import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'src/browser_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Color(0xFF071827),
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF071827),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const PatagoniaBrowserApp());
}

class PatagoniaBrowserApp extends StatelessWidget {
  const PatagoniaBrowserApp({super.key});

  @override
  Widget build(BuildContext context) {
    const background = Color(0xFF071827);
    const surface = Color(0xFF102B41);
    const accent = Color(0xFF50A7D8);

    return MaterialApp(
      title: 'Patagonia Browser',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: background,
        colorScheme: const ColorScheme.dark(
          primary: accent,
          secondary: Color(0xFF35D35B),
          surface: surface,
          error: Color(0xFFFF5353),
        ),
        fontFamily: 'Roboto',
        snackBarTheme: const SnackBarThemeData(
          backgroundColor: Color(0xFF17374E),
          contentTextStyle: TextStyle(color: Colors.white),
        ),
      ),
      home: const BrowserShell(),
    );
  }
}

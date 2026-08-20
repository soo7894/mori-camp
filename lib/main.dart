import 'package:flutter/material.dart';

import 'game/game_controller.dart';
import 'ui/game_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CampTycoonApp());
}

class CampTycoonApp extends StatelessWidget {
  const CampTycoonApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF2F6B4F);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: '오늘은 캠핑',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFEAF1DE),
        useMaterial3: true,
      ),
      home: GameScreen(controller: CampGameController()..start()),
    );
  }
}

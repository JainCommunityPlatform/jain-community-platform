import 'package:flutter/material.dart';

void main() {
  runApp(const JainCommunityPlatformApp());
}

class JainCommunityPlatformApp extends StatelessWidget {
  const JainCommunityPlatformApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Jain Community Platform',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7B3F00)),
        useMaterial3: true,
      ),
      home: const PlatformHomePage(),
    );
  }
}

class PlatformHomePage extends StatelessWidget {
  const PlatformHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Jain Community Platform')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: const Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.temple_hindu, size: 72),
                SizedBox(height: 24),
                Text(
                  'One Flutter application for Web, Android and iOS',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 12),
                Text(
                  'This is the initial platform foundation. Feature modules will be added behind the shared application architecture.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

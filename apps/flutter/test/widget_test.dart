import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/main.dart';

void main() {
  testWidgets('renders the platform foundation', (tester) async {
    await tester.pumpWidget(const JainCommunityPlatformApp());

    expect(find.text('Jain Community Platform'), findsOneWidget);
    expect(
      find.text('One Flutter application for Web, Android and iOS'),
      findsOneWidget,
    );
  });
}

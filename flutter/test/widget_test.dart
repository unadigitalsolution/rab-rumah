import 'package:flutter_test/flutter_test.dart';
import 'package:rab_rumahku/main.dart';

void main() {
  testWidgets('RAB Rumahku app starts', (WidgetTester tester) async {
    await tester.pumpWidget(const RabApp());

    expect(find.text('🏠 RAB Rumahku'), findsOneWidget);
    expect(find.text('BUAT RAB RUMAH'), findsOneWidget);
  });
}

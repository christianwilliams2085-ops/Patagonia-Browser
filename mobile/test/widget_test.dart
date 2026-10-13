import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('muestra la pantalla inicial de Patagonia', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Patagonia Browser'), findsWidgets);
    expect(find.text('Navegá libre. Navegá seguro.'), findsOneWidget);
    expect(find.text('Protección de privacidad activa'), findsOneWidget);
  });

  testWidgets('centra el emblema en la pantalla inicial', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pump(const Duration(milliseconds: 100));

    final logo = find.byKey(const ValueKey('start-page-logo'));
    expect(logo, findsOneWidget);
    expect(tester.getCenter(logo).dx, closeTo(195, 0.5));
  });

  testWidgets('ofrece la política de privacidad desde el menú', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.byTooltip('Menú'));
    await tester.pumpAndSettle();

    expect(find.text('Política de privacidad'), findsOneWidget);
  });

  testWidgets('abre Patagonia AI desde la barra superior', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.byTooltip('Patagonia AI'));
    await tester.pumpAndSettle();

    expect(find.text('Patagonia AI'), findsOneWidget);
    expect(
      find.text('Asistente privado • funciona en el teléfono'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('assistant-input')), findsOneWidget);
  });
}

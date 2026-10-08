import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppLanguageController extends ChangeNotifier {
  static const supported = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('mr'),
    Locale('gu'),
  ];

  AppLanguageController({Locale initialLocale = const Locale('hi')})
      : _locale = supported.any(
          (item) => item.languageCode == initialLocale.languageCode,
        )
            ? Locale(initialLocale.languageCode)
            : const Locale('hi');

  Locale _locale;
  Locale get locale => _locale;

  Future<void> load() async {
    final preferences = await SharedPreferences.getInstance();
    final code = preferences.getString('jcp.language');
    if (code != null && supported.any((item) => item.languageCode == code)) {
      _locale = Locale(code);
      notifyListeners();
    }
  }

  Future<void> setLocale(Locale locale) async {
    if (!supported.any((item) => item.languageCode == locale.languageCode) ||
        locale.languageCode == _locale.languageCode) {
      return;
    }
    _locale = Locale(locale.languageCode);
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('jcp.language', _locale.languageCode);
  }
}

class AppLanguageScope extends InheritedNotifier<AppLanguageController> {
  const AppLanguageScope({
    required AppLanguageController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static AppLanguageController? maybeOf(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<AppLanguageScope>();
    return scope?.notifier;
  }

  static AppLanguageController of(BuildContext context) {
    final controller = maybeOf(context);
    assert(
      controller != null,
      'AppLanguageScope is missing above this context.',
    );
    return controller!;
  }
}

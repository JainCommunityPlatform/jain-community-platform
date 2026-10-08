import 'package:flutter_test/flutter_test.dart';
import 'package:jain_community_platform/core/i18n/app_strings.dart';

void main() {
  test('supports all four JCP UI languages', () {
    expect(const AppStrings('en').signInGoogle, 'Continue with Google');
    expect(const AppStrings('hi').seva, 'सेवा में सहभागी बनें');
    expect(const AppStrings('mr').seva, 'सेवेत सहभागी व्हा');
    expect(const AppStrings('gu').seva, 'સેવામાં સહભાગી બનો');
  });

  test('falls back to English for an unknown language', () {
    expect(const AppStrings('xx').signIn, 'Sign in');
  });
}

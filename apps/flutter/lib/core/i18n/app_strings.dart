import 'package:flutter/material.dart';

import 'app_language.dart';

class AppStrings {
  const AppStrings(this.languageCode);

  final String languageCode;

  static AppStrings of(BuildContext context) {
    // Keep reusable widgets renderable in isolated tests/previews where the
    // application-level language scope is intentionally not mounted.
    final language = AppLanguageScope.maybeOf(context);
    return AppStrings(language?.locale.languageCode ?? 'en');
  }

  static const _values = <String, Map<String, String>>{
    'en': {
      'signIn': 'Sign in',
      'signInGoogle': 'Continue with Google',
      'signingIn': 'Signing in…',
      'explore': 'Explore without signing in',
      'language': 'Language',
      'english': 'English',
      'hindi': 'हिन्दी',
      'marathi': 'मराठी',
      'gujarati': 'ગુજરાતી',
      'temples': 'Temples',
      'findTemples': 'Find a temple',
      'searchTemple': 'Search temple name or city…',
      'noTemples': 'No temples found.',
      'seva': 'Participate in Seva',
      'pooja': 'Pooja / Worship',
      'templeSeva': 'Temple Seva',
      'foodSeva': 'Food Seva',
      'volunteer': 'Become a Volunteer',
      'serve': 'Serve',
      'support': 'Support',
      'join': 'Join',
      'retry': 'Retry',
      'siteLoadFailed': 'The temple website could not be loaded.',
      'directoryLoadFailed': 'The temple directory could not be loaded.',
      'signInFailed': 'Sign-in failed',
      'signInConnectionFailed':
          'Google sign-in completed, but JCP could not establish your session. Please check your connection and try again.',
      'googleConfigurationFailed':
          'Google Sign-In is not configured correctly for this Android build.',
      'googleCancelled': 'Google Sign-In was cancelled.',
      'googleUnknown': 'Google Sign-In failed. Please try again.',
      'technicalDetails': 'Technical details',
      'ok': 'OK',
    },
    'hi': {
      'signIn': 'साइन इन',
      'signInGoogle': 'Google से जारी रखें',
      'signingIn': 'साइन इन हो रहा है…',
      'explore': 'बिना साइन इन के देखें',
      'language': 'भाषा',
      'english': 'English',
      'hindi': 'हिन्दी',
      'marathi': 'मराठी',
      'gujarati': 'ગુજરાતી',
      'temples': 'मंदिर',
      'findTemples': 'मंदिर खोजें',
      'searchTemple': 'मंदिर का नाम या शहर खोजें…',
      'noTemples': 'कोई मंदिर नहीं मिला।',
      'seva': 'सेवा में सहभागी बनें',
      'pooja': 'पूजा / आराधना',
      'templeSeva': 'मंदिर सेवा',
      'foodSeva': 'भोजन सेवा',
      'volunteer': 'स्वयंसेवक बनें',
      'serve': 'सेवा करें',
      'support': 'सहयोग करें',
      'join': 'जुड़ें',
      'retry': 'पुनः प्रयास करें',
      'siteLoadFailed': 'मंदिर की वेबसाइट लोड नहीं हो सकी।',
      'directoryLoadFailed': 'मंदिर सूची लोड नहीं हो सकी।',
      'signInFailed': 'साइन इन विफल',
      'signInConnectionFailed':
          'Google साइन इन पूरा हो गया, लेकिन JCP आपका सत्र शुरू नहीं कर सका। कनेक्शन जांचकर फिर प्रयास करें।',
      'googleConfigurationFailed':
          'इस Android बिल्ड में Google Sign-In सही तरीके से कॉन्फ़िगर नहीं है।',
      'googleCancelled': 'Google Sign-In रद्द किया गया।',
      'googleUnknown': 'Google Sign-In विफल हुआ। कृपया फिर प्रयास करें।',
      'technicalDetails': 'तकनीकी विवरण',
      'ok': 'ठीक है',
    },
    'mr': {
      'signIn': 'साइन इन',
      'signInGoogle': 'Google ने पुढे जा',
      'signingIn': 'साइन इन होत आहे…',
      'explore': 'साइन इन न करता पहा',
      'language': 'भाषा',
      'english': 'English',
      'hindi': 'हिन्दी',
      'marathi': 'मराठी',
      'gujarati': 'ગુજરાતી',
      'temples': 'मंदिरे',
      'findTemples': 'मंदिर शोधा',
      'searchTemple': 'मंदिराचे नाव किंवा शहर शोधा…',
      'noTemples': 'मंदिर सापडले नाही.',
      'seva': 'सेवेत सहभागी व्हा',
      'pooja': 'पूजा / आराधना',
      'templeSeva': 'मंदिर सेवा',
      'foodSeva': 'भोजन सेवा',
      'volunteer': 'स्वयंसेवक बना',
      'serve': 'सेवा करा',
      'support': 'सहकार्य करा',
      'join': 'सामील व्हा',
      'retry': 'पुन्हा प्रयत्न करा',
      'siteLoadFailed': 'मंदिराची वेबसाइट लोड होऊ शकली नाही.',
      'directoryLoadFailed': 'मंदिरांची यादी लोड होऊ शकली नाही.',
      'signInFailed': 'साइन इन अयशस्वी',
      'signInConnectionFailed':
          'Google साइन इन पूर्ण झाले, पण JCP सत्र सुरू करू शकले नाही. कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
      'googleConfigurationFailed':
          'या Android बिल्डमध्ये Google Sign-In योग्यरित्या कॉन्फिगर केलेले नाही.',
      'googleCancelled': 'Google Sign-In रद्द केले.',
      'googleUnknown': 'Google Sign-In अयशस्वी. पुन्हा प्रयत्न करा.',
      'technicalDetails': 'तांत्रिक तपशील',
      'ok': 'ठीक आहे',
    },
    'gu': {
      'signIn': 'સાઇન ઇન',
      'signInGoogle': 'Google સાથે ચાલુ રાખો',
      'signingIn': 'સાઇન ઇન થઈ રહ્યું છે…',
      'explore': 'સાઇન ઇન વગર જુઓ',
      'language': 'ભાષા',
      'english': 'English',
      'hindi': 'हिन्दी',
      'marathi': 'मराठी',
      'gujarati': 'ગુજરાતી',
      'temples': 'દેરાસર',
      'findTemples': 'દેરાસર શોધો',
      'searchTemple': 'દેરાસરનું નામ અથવા શહેર શોધો…',
      'noTemples': 'કોઈ દેરાસર મળ્યું નથી.',
      'seva': 'સેવામાં સહભાગી બનો',
      'pooja': 'પૂજા / આરાધના',
      'templeSeva': 'દેરાસર સેવા',
      'foodSeva': 'ભોજન સેવા',
      'volunteer': 'સ્વયંસેવક બનો',
      'serve': 'સેવા કરો',
      'support': 'સહયોગ કરો',
      'join': 'જોડાઓ',
      'retry': 'ફરી પ્રયાસ કરો',
      'siteLoadFailed': 'દેરાસરની વેબસાઇટ લોડ થઈ શકી નથી.',
      'directoryLoadFailed': 'દેરાસરની યાદી લોડ થઈ શકી નથી.',
      'signInFailed': 'સાઇન ઇન નિષ્ફળ',
      'signInConnectionFailed':
          'Google સાઇન ઇન પૂર્ણ થયું, પરંતુ JCP સત્ર શરૂ કરી શક્યું નથી. કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.',
      'googleConfigurationFailed':
          'આ Android બિલ્ડમાં Google Sign-In યોગ્ય રીતે ગોઠવાયેલ નથી.',
      'googleCancelled': 'Google Sign-In રદ કરવામાં આવ્યું.',
      'googleUnknown': 'Google Sign-In નિષ્ફળ થયું. ફરી પ્રયાસ કરો.',
      'technicalDetails': 'તકનીકી વિગતો',
      'ok': 'બરાબર',
    },
  };

  String get(String key) =>
      _values[languageCode]?[key] ?? _values['en']![key] ?? key;

  String get signIn => get('signIn');
  String get signInGoogle => get('signInGoogle');
  String get signingIn => get('signingIn');
  String get explore => get('explore');
  String get language => get('language');
  String get english => get('english');
  String get hindi => get('hindi');
  String get marathi => get('marathi');
  String get gujarati => get('gujarati');
  String get temples => get('temples');
  String get findTemples => get('findTemples');
  String get searchTemple => get('searchTemple');
  String get noTemples => get('noTemples');
  String get seva => get('seva');
  String get pooja => get('pooja');
  String get templeSeva => get('templeSeva');
  String get foodSeva => get('foodSeva');
  String get volunteer => get('volunteer');
  String get serve => get('serve');
  String get support => get('support');
  String get join => get('join');
  String get retry => get('retry');
  String get siteLoadFailed => get('siteLoadFailed');
  String get directoryLoadFailed => get('directoryLoadFailed');
  String get signInFailed => get('signInFailed');
  String get signInConnectionFailed => get('signInConnectionFailed');
  String get googleConfigurationFailed => get('googleConfigurationFailed');
  String get googleCancelled => get('googleCancelled');
  String get googleUnknown => get('googleUnknown');
  String get technicalDetails => get('technicalDetails');
  String get ok => get('ok');

  String languageName(String code) => switch (code) {
        'hi' => hindi,
        'mr' => marathi,
        'gu' => gujarati,
        _ => english,
      };
}

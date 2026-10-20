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
      'signInProgressDetail': 'Connecting securely to JCP…',
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
      'completeProfile': 'Complete your profile',
      'linkMobileTitle': 'Link your mobile number',
      'linkMobileDescription': 'We use your mobile number to connect you with your existing Jain community profile and event participation.',
      'mobileNumber': 'Mobile number',
      'invalidMobile': 'Enter a valid 10 digit mobile number.',
      'linking': 'Linking…',
      'linkMobile': 'Link mobile number',
      'linkFailed': 'Unable to link this number. Please try again.',
      'publicHeroTitle': 'Your Jain Temple Community',
      'publicHeroSubtitle': 'Discover temples and community activities',
      'publicHeroDescription': 'Explore temple information, events, seva, registrations and community updates in one place.',
      'publicActionsHeading': 'What would you like to do?',
      'publicCommunityHeading': 'Community',
      'publicEventsTitle': 'Events & registrations',
      'publicEventsDescription': 'Join temple and community events. Your JCP identity keeps your registrations connected across activities.',
      'publicSevaTitle': 'Seva & giving',
      'publicSevaDescription': 'Support temple initiatives and keep your participation connected to your JCP account.',
      'publicStayConnectedTitle': 'Stay connected',
      'publicStayConnectedDescription': 'Get important temple updates through the communication channels configured by the temple.',
      'publicActionEvents': 'Events',
      'publicActionRegister': 'Register',
      'publicActionSeva': 'Seva',
      'publicActionTemple': 'Temple',
      'signInContinue': 'Sign in to continue',
    },
    'hi': {
      'signIn': 'साइन इन',
      'signInGoogle': 'Google से जारी रखें',
      'signingIn': 'साइन इन हो रहा है…',
      'signInProgressDetail': 'JCP से सुरक्षित रूप से कनेक्ट हो रहा है…',
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
      'completeProfile': 'अपनी प्रोफ़ाइल पूरी करें',
      'linkMobileTitle': 'अपना मोबाइल नंबर जोड़ें',
      'linkMobileDescription': 'आपके मौजूदा जैन समुदाय प्रोफ़ाइल और कार्यक्रम सहभागिता से जोड़ने के लिए मोबाइल नंबर का उपयोग किया जाता है।',
      'mobileNumber': 'मोबाइल नंबर',
      'invalidMobile': 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।',
      'linking': 'जोड़ा जा रहा है…',
      'linkMobile': 'मोबाइल नंबर जोड़ें',
      'linkFailed': 'नंबर जोड़ा नहीं जा सका। कृपया फिर प्रयास करें।',
      'publicHeroTitle': 'आपका जैन मंदिर समुदाय',
      'publicHeroSubtitle': 'जैन मंदिरों और सामुदायिक गतिविधियों को जानें',
      'publicHeroDescription': 'मंदिर की जानकारी, कार्यक्रम, सेवा, पंजीकरण और सामुदायिक अपडेट एक ही जगह देखें।',
      'publicActionsHeading': 'आप क्या करना चाहेंगे?',
      'publicCommunityHeading': 'समुदाय',
      'publicEventsTitle': 'कार्यक्रम और पंजीकरण',
      'publicEventsDescription': 'मंदिर और समुदाय के कार्यक्रमों में शामिल हों। आपकी JCP पहचान सभी गतिविधियों के पंजीकरण को आपस में जोड़ती है।',
      'publicSevaTitle': 'सेवा और दान',
      'publicSevaDescription': 'मंदिर की पहलों में सहयोग करें और अपनी भागीदारी को अपने JCP खाते से जोड़ें।',
      'publicStayConnectedTitle': 'जुड़े रहें',
      'publicStayConnectedDescription': 'मंदिर द्वारा चुने गए संचार माध्यमों से महत्वपूर्ण अपडेट प्राप्त करें।',
      'publicActionEvents': 'कार्यक्रम',
      'publicActionRegister': 'पंजीकरण',
      'publicActionSeva': 'सेवा',
      'publicActionTemple': 'मंदिर',
      'signInContinue': 'जारी रखने के लिए साइन इन करें',
    },
    'mr': {
      'signIn': 'साइन इन',
      'signInGoogle': 'Google ने पुढे जा',
      'signingIn': 'साइन इन होत आहे…',
      'signInProgressDetail': 'JCP शी सुरक्षितपणे कनेक्ट होत आहे…',
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
      'completeProfile': 'तुमची प्रोफाइल पूर्ण करा',
      'linkMobileTitle': 'तुमचा मोबाइल नंबर जोडा',
      'linkMobileDescription': 'तुमच्या विद्यमान जैन समुदाय प्रोफाइल आणि कार्यक्रम सहभागाशी जोडण्यासाठी मोबाइल नंबर वापरला जातो.',
      'mobileNumber': 'मोबाइल नंबर',
      'invalidMobile': 'कृपया 10 अंकी योग्य मोबाइल नंबर टाका.',
      'linking': 'जोडले जात आहे…',
      'linkMobile': 'मोबाइल नंबर जोडा',
      'linkFailed': 'नंबर जोडता आला नाही. पुन्हा प्रयत्न करा.',
      'publicHeroTitle': 'तुमचा जैन मंदिर समुदाय',
      'publicHeroSubtitle': 'जैन मंदिरे आणि सामुदायिक उपक्रम जाणून घ्या',
      'publicHeroDescription': 'मंदिराची माहिती, कार्यक्रम, सेवा, नोंदणी आणि समुदायातील अपडेट्स एकाच ठिकाणी पाहा.',
      'publicActionsHeading': 'तुम्हाला काय करायचे आहे?',
      'publicCommunityHeading': 'समुदाय',
      'publicEventsTitle': 'कार्यक्रम आणि नोंदणी',
      'publicEventsDescription': 'मंदिर आणि समुदायाच्या कार्यक्रमांमध्ये सहभागी व्हा. तुमची JCP ओळख सर्व उपक्रमांतील नोंदणी जोडून ठेवते.',
      'publicSevaTitle': 'सेवा आणि देणगी',
      'publicSevaDescription': 'मंदिराच्या उपक्रमांना सहकार्य करा आणि तुमचा सहभाग JCP खात्याशी जोडून ठेवा.',
      'publicStayConnectedTitle': 'संपर्कात राहा',
      'publicStayConnectedDescription': 'मंदिराने निवडलेल्या संपर्क माध्यमांद्वारे महत्त्वाचे अपडेट्स मिळवा.',
      'publicActionEvents': 'कार्यक्रम',
      'publicActionRegister': 'नोंदणी',
      'publicActionSeva': 'सेवा',
      'publicActionTemple': 'मंदिर',
      'signInContinue': 'पुढे जाण्यासाठी साइन इन करा',
    },
    'gu': {
      'signIn': 'સાઇન ઇન',
      'signInGoogle': 'Google સાથે ચાલુ રાખો',
      'signingIn': 'સાઇન ઇન થઈ રહ્યું છે…',
      'signInProgressDetail': 'JCP સાથે સુરક્ષિત રીતે કનેક્ટ થઈ રહ્યું છે…',
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
      'completeProfile': 'તમારી પ્રોફાઇલ પૂર્ણ કરો',
      'linkMobileTitle': 'તમારો મોબાઇલ નંબર જોડો',
      'linkMobileDescription': 'તમારા હાલના જૈન સમુદાય પ્રોફાઇલ અને કાર્યક્રમ ભાગીદારી સાથે જોડવા માટે મોબાઇલ નંબરનો ઉપયોગ થાય છે.',
      'mobileNumber': 'મોબાઇલ નંબર',
      'invalidMobile': 'કૃપા કરીને 10 અંકનો યોગ્ય મોબાઇલ નંબર દાખલ કરો.',
      'linking': 'જોડાઈ રહ્યું છે…',
      'linkMobile': 'મોબાઇલ નંબર જોડો',
      'linkFailed': 'નંબર જોડી શકાયો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
      'publicHeroTitle': 'તમારો જૈન મંદિર સમુદાય',
      'publicHeroSubtitle': 'જૈન મંદિરો અને સામુદાયિક પ્રવૃત્તિઓ જાણો',
      'publicHeroDescription': 'મંદિરની માહિતી, કાર્યક્રમો, સેવા, નોંધણી અને સમુદાયના અપડેટ્સ એક જ જગ્યાએ જુઓ.',
      'publicActionsHeading': 'તમે શું કરવા માંગો છો?',
      'publicCommunityHeading': 'સમુદાય',
      'publicEventsTitle': 'કાર્યક્રમો અને નોંધણી',
      'publicEventsDescription': 'મંદિર અને સમુદાયના કાર્યક્રમોમાં જોડાઓ. તમારી JCP ઓળખ વિવિધ પ્રવૃત્તિઓની નોંધણીને જોડેલી રાખે છે.',
      'publicSevaTitle': 'સેવા અને દાન',
      'publicSevaDescription': 'મંદિરની પહેલને સહયોગ આપો અને તમારી ભાગીદારીને તમારા JCP ખાતા સાથે જોડેલી રાખો.',
      'publicStayConnectedTitle': 'સંપર્કમાં રહો',
      'publicStayConnectedDescription': 'મંદિર દ્વારા પસંદ કરાયેલા સંચાર માધ્યમોથી મહત્વપૂર્ણ અપડેટ્સ મેળવો.',
      'publicActionEvents': 'કાર્યક્રમો',
      'publicActionRegister': 'નોંધણી',
      'publicActionSeva': 'સેવા',
      'publicActionTemple': 'મંદિર',
      'signInContinue': 'આગળ વધવા સાઇન ઇન કરો',
    },
  };

  String get(String key) =>
      _values[languageCode]?[key] ?? _values['en']![key] ?? key;

  String get signIn => get('signIn');
  String get signInGoogle => get('signInGoogle');
  String get signingIn => get('signingIn');
  String get signInProgressDetail => get('signInProgressDetail');
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
  String get completeProfile => get('completeProfile');
  String get linkMobileTitle => get('linkMobileTitle');
  String get linkMobileDescription => get('linkMobileDescription');
  String get mobileNumber => get('mobileNumber');
  String get invalidMobile => get('invalidMobile');
  String get linking => get('linking');
  String get linkMobile => get('linkMobile');
  String get linkFailed => get('linkFailed');
  String get publicHeroTitle => get('publicHeroTitle');
  String get publicHeroSubtitle => get('publicHeroSubtitle');
  String get publicHeroDescription => get('publicHeroDescription');
  String get publicActionsHeading => get('publicActionsHeading');
  String get publicCommunityHeading => get('publicCommunityHeading');
  String get publicEventsTitle => get('publicEventsTitle');
  String get publicEventsDescription => get('publicEventsDescription');
  String get publicSevaTitle => get('publicSevaTitle');
  String get publicSevaDescription => get('publicSevaDescription');
  String get publicStayConnectedTitle => get('publicStayConnectedTitle');
  String get publicStayConnectedDescription => get('publicStayConnectedDescription');
  String get publicActionEvents => get('publicActionEvents');
  String get publicActionRegister => get('publicActionRegister');
  String get publicActionSeva => get('publicActionSeva');
  String get publicActionTemple => get('publicActionTemple');
  String get signInContinue => get('signInContinue');

  String languageName(String code) => switch (code) {
        'hi' => hindi,
        'mr' => marathi,
        'gu' => gujarati,
        _ => english,
      };
}

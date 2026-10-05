import '../../features/profile/data/registration_context.dart';

/// Reusable profile values for any JCP registration/data-collection form.
///
/// Event-specific fields must remain in the consuming feature; this class only
/// exposes canonical JCP identity/profile values.
class RegistrationPrefill {
  const RegistrationPrefill(this.context);

  final RegistrationContext context;

  String get userId => context.profile.id;
  String? get name => context.profile.displayName;
  String? get email => context.profile.email;
  String? get mobile => context.profile.primaryPhone;
  String? get address => context.profile.address;
  String? get city => context.profile.city;
  String? get state => context.profile.state;
  String? get postalCode => context.profile.postalCode;
}

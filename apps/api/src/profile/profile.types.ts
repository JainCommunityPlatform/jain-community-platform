export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  primaryPhone?: string;
  phoneNumbers: string[];
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  needsPhoneLink: boolean;
}

export interface UserActivity {
  id: string;
  eventType: string;
  eventId: string;
  title: string;
  participatedAt: string;
  tenantId?: string;
}

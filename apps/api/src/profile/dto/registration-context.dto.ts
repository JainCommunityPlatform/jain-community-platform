export interface RegistrationContext {
  profile: {
    id: string;
    displayName?: string;
    email?: string;
    primaryPhone?: string;
    phoneNumbers: string[];
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  activities: Array<{
    id: string;
    eventType: string;
    eventId: string;
    title: string;
    participatedAt: string;
    tenantId?: string;
  }>;
}

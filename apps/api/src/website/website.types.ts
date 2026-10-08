export interface WebsiteNavItem {
  label: string;
  target: string;
}

export interface WebsiteQuickInfo {
  type: 'today' | 'timings' | 'program' | 'location';
  title: string;
  value: string;
  secondary?: string;
  actionUrl?: string;
}

export interface WebsiteEventCard {
  id: string;
  badge?: string;
  title: string;
  dateLabel?: string;
  description?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface WebsiteGalleryItem {
  id: string;
  title?: string;
  imageUrl: string;
  alt?: string;
}

export interface WebsiteSevaItem {
  id: string;
  icon: string;
  label: string;
  subtitle?: string;
  target?: string;
}

export interface WebsiteSiteConfig {
  tenantId: string;
  version: number;
  theme: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    accent: string;
  };
  header: {
    logoUrl?: string;
    navItems: WebsiteNavItem[];
    languages: string[];
  };
  hero: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaTarget?: string;
  };
  quickInfo: WebsiteQuickInfo[];
  about: {
    title: string;
    body: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaTarget?: string;
  };
  templeDirectory: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    showSearch: boolean;
    limit: number;
  };
  events: {
    enabled: boolean;
    title: string;
    items: WebsiteEventCard[];
  };
  gallery: {
    enabled: boolean;
    title: string;
    items: WebsiteGalleryItem[];
  };
  seva: {
    enabled: boolean;
    title: string;
    items: WebsiteSevaItem[];
  };
  contact: {
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    mapUrl?: string;
  };
  footer: {
    tagline?: string;
  };
}

export function defaultWebsiteConfig(tenantId: string, name: string): WebsiteSiteConfig {
  return {
    tenantId,
    version: 1,
    theme: {
      primary: '#F57C00',
      secondary: '#8B2E1B',
      background: '#FFF4DE',
      surface: '#FFFDF8',
      accent: '#E65100',
    },
    header: {
      navItems: [
        { label: 'Home', target: '/' },
        { label: 'मंदिर', target: '#temple' },
        { label: 'कार्यक्रम', target: '#events' },
        { label: 'दर्शन', target: '#darshan' },
        { label: 'गैलरी', target: '#gallery' },
        { label: 'सेवा', target: '#seva' },
        { label: 'संपर्क', target: '#contact' },
      ],
      languages: ['हिन्दी', 'मराठी', 'English'],
    },
    hero: {
      eyebrow: '॥ जय जिनेन्द्र ॥',
      title: name,
      subtitle: 'शांति, श्रद्धा और सेवा का संगम',
      description: 'अपने मंदिर की जानकारी, दर्शन, कार्यक्रम और सेवा एक ही स्थान पर पाएं।',
      ctaLabel: 'आज के दर्शन',
      ctaTarget: '#darshan',
    },
    quickInfo: [
      { type: 'today', title: 'आज की जानकारी', value: 'आज की जानकारी यहां जोड़ें' },
      { type: 'timings', title: 'मंदिर दर्शन समय', value: 'प्रातः 6:00 - 12:00', secondary: 'सायं 4:00 - 10:00' },
      { type: 'program', title: 'आज का कार्यक्रम', value: 'कार्यक्रम यहां जोड़ें' },
      { type: 'location', title: 'मंदिर का स्थान', value: 'पता यहां जोड़ें' },
    ],
    about: {
      title: name + ' भगवान',
      body: 'मंदिर के इतिहास, आराध्य देव और समुदाय के बारे में जानकारी यहां प्रकाशित करें।',
      ctaLabel: 'मंदिर के बारे में',
      ctaTarget: '#temple',
    },
    templeDirectory: {
      enabled: true,
      title: 'मंदिर खोजें',
      subtitle: 'अपने आसपास के जैन मंदिर खोजें और उनकी जानकारी देखें।',
      showSearch: true,
      limit: 6,
    },
    events: {
      enabled: true,
      title: 'चालू एवं आगामी कार्यक्रम',
      items: [],
    },
    gallery: {
      enabled: true,
      title: 'हमारे मंदिर की एक झलक',
      items: [],
    },
    seva: {
      enabled: true,
      title: 'सेवा में सहभागी बनें',
      items: [
        { id: 'puja', icon: 'local_florist', label: 'पूजा / आराधना', subtitle: 'सेवा करें' },
        { id: 'mandir', icon: 'temple_hindu', label: 'मंदिर सेवा', subtitle: 'सहयोग करें' },
        { id: 'anna', icon: 'favorite', label: 'भोजन सेवा', subtitle: 'सहयोग करें' },
        { id: 'volunteer', icon: 'groups', label: 'स्वयंसेवक बनें', subtitle: 'जुड़ें' },
      ],
    },
    contact: {},
    footer: {
      tagline: 'Warm, devotional and rich in Jain heritage.',
    },
  };
}

// Feature Flag Configuration for Sprint 5
export interface FeatureFlag {
  enabled: boolean;
  rollout: number; // 0-100 percentage
  description: string;
  mode?: string;
  features?: string[];
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Sprint 5 Features
  registration_v1: {
    enabled: true,
    rollout: 100,
    description: "Player/team registration with waivers",
    features: ['player_reg', 'guardian_consent', 'discount_codes']
  },
  
  payments_live_v1: {
    enabled: true,
    rollout: 100,
    description: "Live Stripe payments",
    mode: 'live',
    features: ['checkout', 'webhooks', 'refunds', 'receipts']
  },
  
  branding_v1: {
    enabled: true,
    rollout: 100,
    description: "Tenant theming system",
    features: ['colors', 'logos', 'favicons', 'social_cards']
  },
  
  pwa_v1: {
    enabled: true,
    rollout: 100,
    description: "Progressive Web App",
    features: ['install', 'offline', 'cache', 'manifest']
  },

  // Previous Sprint Features (for reference)
  public_portal_v1: {
    enabled: true,
    rollout: 100,
    description: "Public-facing portal with schedules and standings",
    features: ['schedules', 'standings', 'teams', 'venues']
  },

  notifications_v1: {
    enabled: true,
    rollout: 100,
    description: "Email notifications for games and updates",
    features: ['game_reminders', 'schedule_changes', 'rain_outs']
  },

  // Upcoming Features (disabled)
  mobile_app_v1: {
    enabled: false,
    rollout: 0,
    description: "Native mobile applications",
    features: ['ios', 'android', 'push_notifications']
  },

  analytics_v1: {
    enabled: false,
    rollout: 0,
    description: "Analytics and reporting dashboard",
    features: ['usage_metrics', 'revenue_reports', 'player_stats']
  }
};

// Feature flag utilities
export const isFeatureEnabled = (flagName: string, userId?: string): boolean => {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag || !flag.enabled) return false;

  // Simple rollout check (can be enhanced with user bucketing)
  if (flag.rollout < 100) {
    const bucket = userId ? hashUserId(userId) : Math.random() * 100;
    return bucket < flag.rollout;
  }

  return true;
};

export const getFeatureMode = (flagName: string): string | undefined => {
  return FEATURE_FLAGS[flagName]?.mode;
};

export const hasFeature = (flagName: string, feature: string): boolean => {
  const flag = FEATURE_FLAGS[flagName];
  return flag?.enabled && flag.features?.includes(feature) || false;
};

// Simple hash function for consistent user bucketing
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}
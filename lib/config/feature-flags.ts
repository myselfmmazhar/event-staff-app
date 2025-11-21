/**
 * Feature Flags Configuration
 * 
 * This module provides a centralized way to manage feature flags across the application.
 * Features can have different states: enabled, disabled, or coming_soon.
 * 
 * Usage:
 * 1. Add a new feature flag in the FeatureFlags interface
 * 2. Set the corresponding environment variable in .env (e.g., NEXT_PUBLIC_FEATURE_CLIENTS=enabled)
 * 3. Use getFeatureStatus('clients') to check the feature status
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_FEATURE_CLIENTS: 'enabled' | 'disabled' | 'coming_soon'
 * - NEXT_PUBLIC_FEATURE_EVENTS: 'enabled' | 'disabled' | 'coming_soon'
 * - NEXT_PUBLIC_FEATURE_USERS: 'enabled' | 'disabled' | 'coming_soon'
 * - Add more as needed...
 */

export type FeatureStatus = 'enabled' | 'disabled' | 'coming_soon';

export interface FeatureFlags {
    /** Clients feature (View Clients navigation) */
    clients: FeatureStatus;

    /** Events feature */
    events: FeatureStatus;

    /** Users management feature */
    users: FeatureStatus;

    /** Profile feature */
    profile: FeatureStatus;

    /** Dashboard feature */
    dashboard: FeatureStatus;
}

/**
 * Helper function to parse environment variable as feature status
 * Supports: 'enabled', 'disabled', 'coming_soon' (case-insensitive)
 * Also supports legacy boolean values: 'true'/'false'
 */
function parseFeatureStatus(value: string | undefined, defaultValue: FeatureStatus = 'enabled'): FeatureStatus {
    if (value === undefined) return defaultValue;

    const normalizedValue = value.toLowerCase().trim();

    // Support legacy boolean values
    if (['true', '1', 'yes', 'on'].includes(normalizedValue)) return 'enabled';
    if (['false', '0', 'no', 'off'].includes(normalizedValue)) return 'disabled';

    // Support new status values
    if (normalizedValue === 'coming_soon' || normalizedValue === 'coming-soon') return 'coming_soon';
    if (normalizedValue === 'disabled') return 'disabled';
    if (normalizedValue === 'enabled') return 'enabled';

    return defaultValue;
}

/**
 * Feature flags configuration
 * All features are enabled by default unless explicitly set via environment variables
 */
export const featureFlags: FeatureFlags = {
    clients: parseFeatureStatus(process.env.NEXT_PUBLIC_FEATURE_CLIENTS, 'enabled'),
    events: parseFeatureStatus(process.env.NEXT_PUBLIC_FEATURE_EVENTS, 'enabled'),
    users: parseFeatureStatus(process.env.NEXT_PUBLIC_FEATURE_USERS, 'enabled'),
    profile: parseFeatureStatus(process.env.NEXT_PUBLIC_FEATURE_PROFILE, 'enabled'),
    dashboard: parseFeatureStatus(process.env.NEXT_PUBLIC_FEATURE_DASHBOARD, 'enabled'),
};

/**
 * Check if we're in production environment
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Check if we're in development environment
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get the status of a feature
 */
export function getFeatureStatus(featureName: keyof FeatureFlags): FeatureStatus {
    return featureFlags[featureName];
}

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
    return featureFlags[featureName] === 'enabled';
}

/**
 * Helper function to check if a feature is coming soon
 */
export function isFeatureComingSoon(featureName: keyof FeatureFlags): boolean {
    return featureFlags[featureName] === 'coming_soon';
}

/**
 * Helper function to check if a feature is disabled
 */
export function isFeatureDisabled(featureName: keyof FeatureFlags): boolean {
    return featureFlags[featureName] === 'disabled';
}

/**
 * Log feature flags status (useful for debugging)
 * Only logs in development mode
 */
if (isDevelopment && typeof window !== 'undefined') {
    console.log('🚩 Feature Flags:', featureFlags);
}

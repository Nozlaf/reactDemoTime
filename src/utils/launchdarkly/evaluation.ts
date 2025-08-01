import { LDClient, LDContext, LDFlagValue } from 'launchdarkly-react-client-sdk';
import { initializeLaunchDarkly } from '../../config/launchdarkly/config';

// Type for variation detail response
export type VariationDetailResponse<T> = {
  value: T;
  variationIndex: number;
  reason: {
    kind: string;
    errorKind?: string;
  };
};

// Centralized evaluation function as per Rule 1
export const evaluateFlag = async <T extends LDFlagValue>(
  flagKey: string,
  defaultValue: T,
  context: LDContext
): Promise<T> => {
  try {
    const client = await initializeLaunchDarkly(context);
    return client.variation(flagKey, defaultValue);
  } catch (error) {
    console.error(`Error evaluating flag ${flagKey}:`, error);
    return defaultValue;
  }
};

// Flag evaluation with detail
export const evaluateFlagDetail = async <T extends LDFlagValue>(
  client: LDClient,
  flagKey: string,
  defaultValue: T
): Promise<VariationDetailResponse<T>> => {
  try {
    const result = await client.variationDetail(flagKey, defaultValue);
    return {
      value: result.value,
      variationIndex: result.variationIndex || 0,
      reason: result.reason || { kind: 'FALLBACK' }
    };
  } catch (error) {
    console.error(`Error evaluating flag ${flagKey}:`, error);
    return {
      value: defaultValue,
      variationIndex: 0,
      reason: { kind: 'ERROR', errorKind: 'EVALUATION_ERROR' }
    };
  }
};

// Context creation utility
export const createLDContext = (
  userId: string,
  attributes: Record<string, unknown> = {}
): LDContext => {
  return {
    kind: 'user',
    key: userId,
    name: userId,
    anonymous: false,
    custom: {
      ...attributes
    }
  };
}; 
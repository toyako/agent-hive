/**
 * ProviderAdapter — unified interface for all AI providers.
 * Each provider implements setup(), validate(), listModels().
 */

export interface ProviderAdapter {
  name: string;
  baseUrl: string;

  /** Setup the provider (save config) */
  setup(apiKey: string, baseUrl?: string): Promise<ProviderConfig>;

  /** Validate API key and connection */
  validate(apiKey: string, baseUrl: string): Promise<ValidationResult>;

  /** List available models */
  listModels(apiKey: string, baseUrl: string): Promise<string[]>;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  models: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  models?: string[];
}

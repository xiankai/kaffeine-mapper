import { get, set } from "idb-keyval";
import { DEFAULT_PREFERENCES, Preferences } from "../domain/scoring";
import { ChainDefaults, Dataset, emptyDataset } from "../domain/types";

const DATASET_KEY = "kaffeine:dataset";
const PREFERENCES_KEY = "kaffeine:preferences";

export interface Persisted {
  dataset: Dataset;
  preferences: Preferences;
}

export async function loadPersisted(): Promise<Persisted> {
  const [dataset, preferences] = await Promise.all([
    get<Dataset>(DATASET_KEY).catch(() => undefined),
    get<Preferences>(PREFERENCES_KEY).catch(() => undefined),
  ]);
  return {
    dataset: dataset?.version === 1 ? dataset : emptyDataset(),
    preferences: preferences
      ? {
          ...DEFAULT_PREFERENCES,
          ...preferences,
          weights: { ...DEFAULT_PREFERENCES.weights, ...preferences.weights },
        }
      : DEFAULT_PREFERENCES,
  };
}

export const saveDataset = async (dataset: Dataset) =>
  set(DATASET_KEY, dataset);
export const savePreferences = async (preferences: Preferences) =>
  set(PREFERENCES_KEY, preferences);

const isRecord = (value: unknown): value is Record<string, ChainDefaults> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseDatasetFile(json: unknown): Dataset {
  const candidate = json as Partial<Dataset>;
  if (candidate?.version !== 1 || !Array.isArray(candidate.places)) {
    throw new Error("Not a kaffeine-mapper export.");
  }
  const chains = isRecord(candidate.chains) ? candidate.chains : undefined;
  return { version: 1, places: candidate.places, ...(chains && { chains }) };
}

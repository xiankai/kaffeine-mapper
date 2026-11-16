import {
  ChainPreference,
  DEFAULT_PREFERENCES,
  METRIC_LABELS,
  METRICS,
} from "../domain/scoring";
import { SLOTS, Slot } from "../domain/types";
import { useStore } from "../state/store";

export function PreferencesPage() {
  const { preferences, setPreferences } = useStore();
  const toggleSlot = (slot: Slot) =>
    setPreferences({
      ...preferences,
      slots: preferences.slots.includes(slot)
        ? preferences.slots.filter((s) => s !== slot)
        : [...preferences.slots, slot],
    });

  return (
    <div className="prefs">
      <h1>Scoring</h1>
      <p className="muted">
        Each place scores 0–100 from the criteria below. A criterion with no
        data is skipped, not counted as zero, and the &ldquo;% known&rdquo;
        tells you how much of the score is real.
      </p>

      <fieldset>
        <legend>When do you go to cafés?</legend>
        <p className="muted">
          Used for &ldquo;open in my slots&rdquo;, &ldquo;seats free&rdquo; and
          &ldquo;I go there in my slots&rdquo;.
        </p>
        <div className="chips">
          {SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              aria-pressed={preferences.slots.includes(slot)}
              onClick={() => toggleSlot(slot)}
            >
              {slot.replace("-", " ")}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Chains</legend>
        <select
          aria-label="Chain preference"
          value={preferences.chain}
          onChange={(e) =>
            setPreferences({
              ...preferences,
              chain: e.target.value as ChainPreference,
            })
          }
        >
          <option value="avoid">Prefer independents</option>
          <option value="neutral">Don&apos;t care</option>
          <option value="prefer">Prefer chains</option>
        </select>
      </fieldset>

      <fieldset>
        <legend>How much each criterion matters</legend>
        {METRICS.map((metric) => (
          <label key={metric} className="weight">
            <span>{METRIC_LABELS[metric]}</span>
            <input
              type="range"
              min={0}
              max={5}
              value={preferences.weights[metric]}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  weights: {
                    ...preferences.weights,
                    [metric]: Number(e.target.value),
                  },
                })
              }
            />
            <output>{preferences.weights[metric]}</output>
          </label>
        ))}
      </fieldset>

      <button type="button" onClick={() => setPreferences(DEFAULT_PREFERENCES)}>
        Reset to defaults
      </button>
    </div>
  );
}

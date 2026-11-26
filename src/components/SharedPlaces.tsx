import { Link } from "react-router-dom";
import { displayName, findPlace } from "../domain/insights";
import { useCheckIn } from "../hooks/useCheckIn";
import { useStore } from "../state/store";
import { CheckInOutcome } from "./EvaluationSheet";

export function SharedPlaces({ ids }: { ids: string[] }) {
  const { dataset } = useStore();
  const checkIn = useCheckIn();
  const places = ids.flatMap((id) => findPlace(dataset.places, id) ?? []);
  const unique = [...new Map(places.map((p) => [p.id, p])).values()];
  if (unique.length === 0) return null;
  return (
    <section className="step shared" aria-label="Shared places">
      <h2>You shared</h2>
      <ul>
        {unique.map((place) => (
          <li key={place.id}>
            <Link to={`/place/${encodeURIComponent(place.id)}`}>
              {displayName(place)}
            </Link>{" "}
            <button type="button" onClick={() => checkIn.checkIn(place.id)}>
              Log a visit here
            </button>
          </li>
        ))}
      </ul>
      <CheckInOutcome flow={checkIn} />
    </section>
  );
}

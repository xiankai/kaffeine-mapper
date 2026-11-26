import { useCallback, useState } from "react";
import { checkinVisit, logCheckin } from "../domain/checkin";
import { recordEvaluation } from "../domain/evaluations";
import { findPlace } from "../domain/insights";
import { Evaluation, Place } from "../domain/types";
import { useStore } from "../state/store";

export type EvaluationFields = Omit<Evaluation, "at">;

interface Pending {
  id: string;
  at: Date;
  open: boolean;
}

export interface CheckedIn {
  place: Place;
  at: Date;
  open: boolean;
  save: (fields: EvaluationFields) => void;
  close: () => void;
}

export interface CheckInFlow {
  checkIn: (id: string) => void;
  current?: CheckedIn | undefined;
}

export function useCheckIn(): CheckInFlow {
  const { dataset, editPlace } = useStore();
  const [pending, setPending] = useState<Pending>();

  const checkIn = useCallback(
    (id: string) => {
      const at = new Date();
      editPlace(id, (p) => logCheckin(p, checkinVisit(at)));
      setPending({ id, at, open: true });
    },
    [editPlace],
  );

  const place = pending && findPlace(dataset.places, pending.id);
  if (!pending || !place) return { checkIn };
  const close = () => setPending({ ...pending, open: false });
  return {
    checkIn,
    current: {
      place,
      at: pending.at,
      open: pending.open,
      close,
      save: (fields) => {
        editPlace(place.id, (p) =>
          recordEvaluation(p, { at: pending.at.toISOString(), ...fields }),
        );
        close();
      },
    },
  };
}

import { useEffect, useRef, useState } from "react";
import { loadLogo } from "../services/brandLogos";

export type Logos = Record<string, string | null>;

export function useBrandLogos(qids: string[]): Logos {
  const [logos, setLogos] = useState<Logos>({});
  const askedRef = useRef(new Set<string>());
  const wanted = [...new Set(qids)].sort().join("|");
  useEffect(() => {
    const fresh = (wanted ? wanted.split("|") : []).filter(
      (qid) => !askedRef.current.has(qid),
    );
    for (const qid of fresh) {
      askedRef.current.add(qid);
      loadLogo(qid).then((logo) => {
        if (logo === undefined) {
          askedRef.current.delete(qid);
          return;
        }
        setLogos((prev) => ({ ...prev, [qid]: logo }));
      });
    }
    // stack-reviewer-ignore: a failed lookup (offline, 5xx) is deliberately retried only on the next change of the visible chain set or the next page load, never in a loop; the initials badge covers the gap
  }, [wanted]);
  return logos;
}

import { useEffect, useState } from "react";
import { loadLogo } from "../services/brandLogos";

export type Logos = Record<string, string | null>;

export function useBrandLogos(qids: string[]): Logos {
  const [logos, setLogos] = useState<Logos>({});
  const wanted = [...new Set(qids)].sort().join("|");
  useEffect(() => {
    let live = true;
    for (const qid of wanted ? wanted.split("|") : []) {
      loadLogo(qid).then((logo) => {
        if (!live || logo === undefined) return;
        setLogos((prev) =>
          prev[qid] === logo ? prev : { ...prev, [qid]: logo },
        );
      });
    }
    return () => {
      live = false;
    };
  }, [wanted]);
  return logos;
}

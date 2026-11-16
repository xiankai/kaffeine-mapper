# kaffeine-mapper

Score the cafés you've been to and the ones you've saved, on what matters for working from a café: power sockets, wi-fi (strength, time limit, fee), opening hours in your time slots, weekends, how easy it is to get a seat, and chain vs independent.

Everything runs in your browser. Your data stays in IndexedDB; only coordinates and place names are sent to OpenStreetMap (Overpass, Nominatim) for matching. No API keys.

## Use it

1. **Import** your Google Maps Timeline export (Android: Settings → Location → Location services → Timeline → Export). Visits of 20 min to 6 h at places Google didn't label home or work become candidates. Re-import newer exports any time; only new visits are added.
2. **Import** saved lists from Google Takeout: _Saved_ (one CSV per list) and _Maps (your places)_ (Starred places GeoJSON). Saved CSVs carry no coordinates, so locate them by name, then check the match.
3. **Enrich** from OpenStreetMap: finds which places are cafés and pulls `opening_hours`, `brand`, `internet_access` and `power_supply`. Progress is saved per batch; data older than 30 days is refreshed.
4. **Review** each place (café or not) and add what OSM can't know: sockets, wi-fi strength and limit, seat availability per time slot, your rating.
5. **Tune** the weights on the Scoring page. A criterion with no data is skipped rather than counted as zero, and each score shows how much of it is known.

## Develop

```bash
pnpm install
pnpm dev
pnpm run quality:all
```

See [QUALITY_GATES.md](./QUALITY_GATES.md) for the enforced gates.

# kaffeine-mapper

Score the cafés you've been to and the ones you've saved, on what matters for working from a café: power sockets, wi-fi (strength, time limit, fee), opening hours in your time slots, weekends, how easy it is to get a seat, and chain vs independent.

Everything runs in your browser. Your data stays in IndexedDB; only coordinates and place names are sent to OpenStreetMap (Overpass, Nominatim) for matching. No API keys.

## Use it

1. **Import** your Google Maps Timeline export (Android: Settings → Location → Location services → Timeline → Export). Visits of 20 min to 6 h at places Google didn't label home or work become candidates. Re-import newer exports any time; only new visits are added.
2. **Import** saved lists from Google Takeout: _Saved_ (one CSV per list) and _Maps (your places)_ (Starred places GeoJSON). Saved CSVs carry no coordinates, so locate them by name, then check the match.
3. **Enrich** from OpenStreetMap: finds which places are cafés and pulls `opening_hours`, `brand`, `internet_access` and `power_supply`. Progress is saved per batch; data older than 30 days is refreshed.
4. **Review** each place (café or not) and add what OSM can't know: sockets, wi-fi strength and limit, seat availability per time slot, your rating.
5. **Tune** the weights on the Scoring page. A criterion with no data is skipped rather than counted as zero, and each score shows how much of it is known.

## Install it

Kaffeine Mapper is an installable app (PWA): use your browser's _Install_ or _Add to Home Screen_. Once installed it works offline, and on Android and desktop Chrome it shows up in the share sheet. Share a Timeline export, a Takeout zip, a saved-list CSV or a place from Google Maps to it and it opens the Import page with the share already imported. iOS has no share target; use the file pickers there.

Each time the app opens online, places whose OpenStreetMap data is more than 30 days old are refreshed in the background.

## Pull saved places from Google

With a Google OAuth client ID configured, the Import page offers **Pull saved places from Google**, which uses the [Data Portability API](https://developers.google.com/data-portability) to fetch saved lists and starred places without a Takeout round trip. Timeline isn't available through it; keep importing the on-device export.

Setup, once, in a Google Cloud project:

1. Enable the Data Portability API.
2. Create an OAuth client of type _Web application_. Add the app's URL as an authorised JavaScript origin, and the app's full URL (for example `https://<user>.github.io/kaffeine-mapper/`) as an authorised redirect URI.
3. Add the scopes `dataportability.saved.collections` and `dataportability.maps.starred_places`, and add your own account as a test user. These are restricted scopes, so anyone else needs the app verified.
4. Build with the client ID in `GOOGLE_CLIENT_ID` (`GOOGLE_CLIENT_ID=… pnpm build`). The Pages deploy sets it in `.github/workflows/deploy.yml`. Without it the button stays hidden.

On the consent screen, pick 30 or 180 days to allow a fresh pull every 24 hours; a one-time grant needs signing in again for each pull. The export can take a while, and the app resumes waiting for it the next time you pull. If the browser can't download the archive, the page links it so you can save it and import the zip by hand.

The client lives in `src/dataPortability/` with no app imports, so other projects can copy it.

## Develop

```bash
pnpm install
pnpm dev
pnpm run quality:all
```

See [QUALITY_GATES.md](./QUALITY_GATES.md) for the enforced gates.

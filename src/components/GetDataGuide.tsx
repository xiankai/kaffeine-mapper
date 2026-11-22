import { TAKEOUT_URL } from "../domain/takeoutZip";

export function GetDataGuide() {
  return (
    <details className="guide step">
      <summary>
        <h2>Get your data from Google (5 minutes)</h2>
      </summary>

      <details className="guide-part">
        <summary>
          <h3>A. Places you&apos;ve been: Timeline, on your phone</h3>
        </summary>
        <p className="muted">
          Google keeps Timeline only on the phone that records it, so this part
          happens there.
        </p>
        <ol>
          <li>
            <strong>Android:</strong> Settings → Location → Location services →
            Timeline → <em>Export Timeline data</em>.
          </li>
          <li>
            <strong>iPhone:</strong> Google Maps → your profile picture →
            Settings → Personal content → <em>Export Timeline data</em>.
          </li>
          <li>
            Save the file somewhere you can reach from this browser (Drive, or
            send it to yourself), then pick it in step 1 below.
          </li>
        </ol>
      </details>

      <details className="guide-part">
        <summary>
          <h3>B. Places you saved: Google Takeout</h3>
        </summary>
        <a className="cta" href={TAKEOUT_URL} target="_blank" rel="noreferrer">
          Open Takeout with the right data pre-selected ↗
        </a>
        <ol className="shots">
          <li>
            <p>
              Check it says <strong>2 of 2 selected</strong> (Maps (your places)
              and Saved), then press <em>Next step</em>.
            </p>
            <img
              src="tutorial/takeout-select.jpg"
              alt="Takeout step 1 with Maps (your places) and Saved both ticked, 2 of 2 selected"
              loading="lazy"
              width={670}
              height={712}
            />
          </li>
          <li>
            <p>
              Pick <strong>Export every month for 1 year</strong> to get a fresh
              copy by email each month without coming back here.
            </p>
            <img
              src="tutorial/takeout-frequency.jpg"
              alt="Takeout step 2 frequency options, with Export every month for 1 year listed"
              loading="lazy"
              width={670}
              height={570}
            />
          </li>
          <li>
            <p>
              Leave <strong>.zip</strong> and press <em>Create export</em>. When
              the email arrives, download the zip and drop it, unopened, into
              step 2 below.
            </p>
            <img
              src="tutorial/takeout-create.jpg"
              alt="Takeout file type .zip and the Create export button"
              loading="lazy"
              width={670}
              height={380}
            />
          </li>
        </ol>
      </details>
    </details>
  );
}

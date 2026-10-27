# VistaJet Group Virtual (VJG) — Project Context

Canonical repository: https://github.com/jevin701-design/vistajetvirtual
Published site: https://vistajetvirtual.netlify.app/

## Purpose
This repository should contain the complete VistaJet Group Virtual website and its tools. The Flight Management System (FMS / Flight Desk) is a section/tool of VJG, not a separate project and must not replace the corporate homepage.

## Current repository state checked 2026-10-27
The GitHub root is the public static site (homepage, fleet, hubs, generators, calculators, pilot ranks, and shared `vjg-*.js`). Do not treat `index.html` as a Flight Desk replacement. The 2026-10-21 note that the homepage was only the FMS is obsolete.

## Operational rules
- Callsign prefix: VJT.
- Private Aviation: flight numbers 100–499.
- Cargo Operations: flight numbers 500–899.
- Charter Operations: flight numbers 900–999.
- Direction is recorded separately as OUT or RET; do not append letters to the flight number.
- Regional flight numbering is based on departure region.
- Main headquarters and primary hub: MMLO (Silao, Guanajuato, Mexico).
- Alternate hub for large aircraft unable to use MMLO: MMQT.
- Other established hubs: KLAX, EGLL, WSSS, VHHH, YSSY.
- Each flight leg and aircraft log entry is recorded independently.
- An aircraft continues from its arrival airport unless an operational plan specifies otherwise.

## Website expectations
- Maintain a corporate homepage and FMS/Flight Desk integrated within the same VJG site.
- Build/maintain bilingual Spanish and English content.
- Include fleet and hubs pages/sections, aircraft specifications and arrival dates where established, and existing VJG tools.
- Avoid duplicate A380 IF-JNPB specifications.
- Use correct local time zones and 24-hour Zulu (UTC) time where operationally appropriate; never use AM/PM for Zulu time.
- Visual identity: scarlet red #E31837, charcoal #17191D, silver #C7CBD1; use the continuous red side line to the footer where appropriate.
- Preserve existing navigation, fleet, hubs, numbering, missions, and functionality unless the user explicitly asks for a change.

## Language (confirmed 2026-10-27)
Spanish and English are explicit on each page: visible copy uses `.vjg-es` / `.vjg-en`, and script-generated text uses `VJGLang.t(es, en)`. The choice is stored in `localStorage` key `vjg-lang` and sets `document.documentElement.lang`. Do not add another translator, a DOM dictionary, or a MutationObserver. ICAO codes, VJT numbers, and registrations stay unchanged.
Default language is Spanish until the visitor chooses English.

## Editing and deployment rules
- Inspect current files before editing.
- Never overwrite the corporate homepage with the FMS.
- Standing order from the user (2026-10-27): every requested change in this project is done here, pushed to GitHub `jevin701-design/vistajetvirtual` branch `main`, and published to Netlify site `vistajetvirtual` (`7d79a95d-c15c-4708-8372-bf595653f6d4`, https://vistajetvirtual.netlify.app/). Do not ask the user to upload files or drag a folder into Netlify.
- After publish, tell the user when the public page is ready. Do not claim a commit or deploy succeeded until it is verified.
- Supabase (project `cgrczmsjhauheibprtge`) is used from the browser. This chat cannot open the Supabase dashboard. Table, RLS, and Auth changes need SQL the user runs there.
- Commit intended site sections coherently and verify the resulting file tree and deployment.
- Update this file when confirmed project decisions change.

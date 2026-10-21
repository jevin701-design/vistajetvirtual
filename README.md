# VistaJet Group Virtual (VJG)

VJG is a virtual aviation organization for Infinite Flight. The website brings the corporate overview and operational tools into one project.

## Website
- Corporate homepage: `index.html`
- Fleet directory: `fleet.html`
- Hubs and operational time rules: `hubs.html`
- Flight number rules and generator portal: `generador-vuelos.html`
- Preserved Flight Desk / FMS: `fms.html`
- Cross-chat project instructions: `VJG_PROJECT_CONTEXT.md`

Published site: https://vistajetvirtual.netlify.app/
Repository: https://github.com/jevin701-design/vistajetvirtual

## Flight numbering
- Private Aviation: VJT 100–499
- Cargo Operations: VJT 500–899
- Charter Operations: VJT 900–999
- OUT / RET is stored separately from the number.
- Private Aviation and Cargo numbering is based on departure region.

## Hubs
- MMLO: primary headquarters and hub
- MMQT: alternate for large aircraft that cannot operate from MMLO
- KLAX, EGLL, WSSS, VHHH, YSSY: international hubs

## Important notes
The current FMS was preserved as `fms.html` before the corporate homepage was restored to `index.html`. Fleet/hub pages have been reintroduced with confirmed registrations and hubs; unverified aircraft specifications and arrival dates are explicitly marked pending rather than invented. The generator page documents the rules and links to the integrated Flight Desk tool.

Netlify publication depends on the existing deployment configuration. Verify the live site after the hosting build completes; repository commits alone do not prove deployment success.

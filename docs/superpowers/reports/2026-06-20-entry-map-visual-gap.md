# Entry Map Route-Scene Visual Gap Report

Branch: `feat/entry-map-enrichment`
Date: 2026-06-20

This report records the visual gaps from the route-scene review plan and the patch evidence for each
route. Screenshots are stored in [`./entry-map-playtest-reviewed/`](./entry-map-playtest-reviewed/) so
reviewers can inspect them without running the game locally.

## Route: Spawn -> Crossroads

Current camera impression: Dense village road with a visible roadside nook.

What still feels same: The route already had the strongest "home road" composition before this pass.

What should become visible: A distinct fork/payoff beat in the manifest, not just generic nearby interest.

What route choice is missing: None after this pass; the existing nook is now tracked as a fork beat.

What story motif is missing: None required for this pass; the homeward-road motif is represented by village
to waymarker to Crossroads.

Screenshot: [after-02-village-reststop.png](./entry-map-playtest-reviewed/after-02-village-reststop.png)

## Route: Crossroads -> Coast

Current camera impression: Previously a mostly vertical descent into a decorated beach.

What still feels same: The beach remains broad by design.

What should become visible: A fork before the beach, with Ferry Shrine and shoreline/jetty as separate choices.

What route choice is missing: Fixed with `coast-ferry-fork`, `coast-shrine-landing`, and `coast-tidepool-pocket`.

What story motif is missing: Fixed with shrine, torii, net, driftwood, fisherman, boat, tidepool, and jetty.

Screenshots: [before Ferry Shrine](./entry-map-playtest-reviewed/before-05-coast-ferry-shrine.png),
[after fork](./entry-map-playtest-reviewed/after-04-coast-fork.png),
[after tidepool and jetty](./entry-map-playtest-reviewed/after-06-coast-jetty-tidepool.png)

## Route: Crossroads -> Mistfen

Current camera impression: Previously eerie but basin-like.

What still feels same: Mistfen remains quiet and low-density by design.

What should become visible: A safe S-curve, hidden pool pocket, and fog gradient toward Witchwood Gate.

What route choice is missing: Fixed with `mistfen-hidden-pool-pocket` and reed walls.

What story motif is missing: Fixed with denser gate fog and stronger poison/gate approach cues.

Screenshots: [before marsh](./entry-map-playtest-reviewed/07-mistfen-marsh.png),
[after marsh](./entry-map-playtest-reviewed/after-07-mistfen-marsh.png),
[after Witchwood Gate](./entry-map-playtest-reviewed/after-08-witchwood-gate.png)

## Route: Crossroads -> Silverpine

Current camera impression: Previously shrine-themed but too straight.

What still feels same: Shrine terrace remains the calm final reveal.

What should become visible: A bent ascent and an optional side grove.

What route choice is missing: Fixed with `silverpine-side-grove-floor` and moved `silverpine-tonic`.

What story motif is missing: The shrine/sealed-threshold motif is present; dedicated bell art is deferred by
the no-new-art constraint.

Screenshots: [before climb](./entry-map-playtest-reviewed/09-silverpine-climb.png),
[after climb](./entry-map-playtest-reviewed/after-09-silverpine-climb.png),
[after shrine gate](./entry-map-playtest-reviewed/after-10-silverpine-shrine-gate.png)

## Route: Crossroads -> Wildwood

Current camera impression: Previously dangerous near the cave, but the threshold and side secret were weak.

What still feels same: Combat route and slime encounter IDs are preserved.

What should become visible: Forest threshold, side clearing, hidden cache screen, and cave escalation.

What route choice is missing: Fixed with `wildwood-side-clearing`, `wildwood-cache-brush-screen`, and
`wildwood-cache-tree-cover`.

What story motif is missing: Fixed with stronger threshold and cave danger composition.

Screenshots: [before grove](./entry-map-playtest-reviewed/11-wildwood-grove.png),
[after threshold/grove](./entry-map-playtest-reviewed/after-11-wildwood-threshold-grove.png),
[after cave danger](./entry-map-playtest-reviewed/after-12-wildwood-danger-approach.png)

## Crossroads Hub

Current camera impression: Previously a hub, but directional exit language was uneven.

What still feels same: Waystone and market nook remain the center anchors.

What should become visible: Coast, Mistfen, Silverpine, Wildwood, and Castle Gate exit motifs from one center
camera.

What route choice is missing: Fixed with directional motif clusters placed near exits rather than in the
plaza center.

What story motif is missing: Dedicated white-line art is deferred; `crossroads-white-line` approximates it
with existing terrain.

Screenshot: [after Crossroads hub](./entry-map-playtest-reviewed/after-03-crossroads-hub.png)

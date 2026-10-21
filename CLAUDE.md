# CLAUDE.md

Read `README.md`, `CONTRIBUTING.md` and `docs/plan.md` first. Follow `CONTRIBUTING.md` strictly: this
is an open-source project and the code should read like one.

- `jakubsz123/learnarr-legacy` is the old Sub-Optimal fork. Use it as a reference for logic worth
  porting (the subtitle parser, the Plex/Jellyfin clients, the AI connectors, the OpenSubtitles client,
  secrets encryption). Rewrite what you port; don't copy its comments or structure. Say in the commit
  message when something is ported.
- Mobile-first: the app is used mostly on a phone. Nothing that only works on hover.
- Ask before adding a dependency, an external service or an API key that isn't in the plan.

# Dispatch Agent Notes

See `CLAUDE.md` for the full project guide.

## Important config rule

Dispatch loads configuration from:
1. `config.local.json` when present
2. otherwise `config.json`

In this checkout, **`config.local.json` is the effective source of truth** for repo paths and file locations.

Do not assume `config.json` reflects the active local repo set.

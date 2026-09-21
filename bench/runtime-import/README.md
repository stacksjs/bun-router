# Runtime import diagnostic

This diagnostic compares the complete package root with the narrow router
runtime after the normal production build:

```bash
bun run build
bun run bench:runtime-import -- --pairs=30
```

Each variant runs in a fresh Bun process and verifies the same serving symbols.
Order alternates by pair. The JSON result retains every import-time and RSS
sample plus medians and paired ratios. It also records every statically
reachable built JavaScript file and the byte delta between entries. RSS is read
after a forced garbage collection and a short settling period.

Results from developer machines and hosted runners are diagnostic evidence,
not publishable rankings. Record a host-load policy and dedicated hardware
separately before using these numbers as a public benchmark.

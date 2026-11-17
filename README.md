# Token Launch Radar — make.fun bounty `token-radar-01`

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Wiliyantoro/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Wiliyantoro/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A pre-token protocol radar: ranks 200 protocols (every one of the 40 on the snapshot's watchlist plus 160 early rows below the $50M floor) by an implied value computed only from the sealed DefiLlama snapshot — TVL × category-comparables multiple × dampened 7-day growth × age-with-no-token — with a concrete farm plan per protocol and a sortable, filterable dashboard. Built by an AI agent for make.fun's "Build the best token launch radar" bounty ($1,325 USDC pool).

## Run locally

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Reads `/input/snapshot.json`, writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`. Node 22, standard library only, no network.

# Evidence library verification record

Date: 2026-10-29
Command: npm run verify:evidence -- ssc2026=<pdf> idsa2026=<pdf> ncdc2025=<pdf>
Result: 42 of 42 passages verified word for word.

PDFs checked (SHA-256 fingerprint, so the same files can be used to repeat the check):

| Guideline | File | SHA-256 |
| --- | --- | --- |
| ssc2026 | `ssc2026.pdf` on the `sources` branch (88 pages) | `dca23d7cee07f61c4710a5ab8b2cb53d40b2552c73d17622bb53b08137ecbee0` |
| idsa2026 | `idsa2026.pdf` on the `sources` branch (52 pages) | `a0cb87b6c4eb1125043adfee4c179ef2b3aa0d49efd5cfafee9a1f71e60c7f6d` |
| ncdc2025 | amr17.pdf on the `sources` branch (157 pages) | `61b260a9eec33945026b59413b510ec8a32fd19de183b6b03c94086d06173df2` |

## AWaRe groups (`drug_spectrum.csv`)

Date: 2026-10-29
Command: `python3 scripts/verify-aware.py <who-aware2023.xlsx>`
Result: 33 of 33 AWaRe groups match the WHO spreadsheet (3 drugs not in the 2023 list, left empty).
File: `who-aware2023.xlsx` on the `sources` branch, SHA-256 `23ecb3aa66f6a7b7f72d4df01427a4c645e6d991563abb58fc56a7a69bbab8c9`

# Verification record

Checked locally on Windows, October 25, 2026, using Node 24.22.1, Python 3.12.10, MCP SDK 1.30.0, and Playwright Chromium. This verifies the current working copy, not the submission-deadline version.

| Check | Result |
| --- | --- |
| `npm run check` | Passed TypeScript validation |
| `npm run lint` | Passed, warnings denied |
| `npm test` | 125 tests passed, including atlas/assets/interaction validation and offline evidence regression |
| `python backend/test_backend.py` | Four checks passed: health, text analysis, generated PDF upload, and chat |
| `python -m unittest backend.test_mcp -v` | Seven tests passed: handshake/discovery, evidence/navigation, capabilities/isolation, pairing/revocation, expiry/bounds, HTTP guards, and fallback semantics |
| `python -m backend.smoke_mcp http://127.0.0.1:8011/mcp` | Independent official-SDK client negotiated 2025-11-25, discovered nine tools, created a synthetic report, asked a question, verified an anatomy request, and deleted its session |
| `npm run test:companion` | Passed the real two-browser workflow: sample, MCP connection, question, atlas navigation, pairing, companion question, doctor prompts, mobile scrolling/width, revocation, deletion; no uncaught page errors |
| `npm run build` | Production build and PWA validation passed; bundler reports a large-chunk advisory |
| Desktop and mobile screenshots | Inspected after browser verification; tabs fit and mobile controls scroll into view |
| Judge documentation review | Nine Markdown files checked for local link targets, heading anchors, and closed code fences; no errors |
| Live localhost follow-up | SDK smoke command repeated against port 8000 after the judge-guide update; nine tools, report interaction, anatomy request, and session deletion passed |

Reproduction commands and environment setup are in the [README](../../README.md#verification). The browser check starts its own backend and frontend and does not require paid inference.

## Limits of this verification

- No authenticated Groq call was made. Live model quality, translation quality, latency, and model availability remain to be checked with the team's own key.
- Microphone capture, physical speakers, multilingual voice quality, and physical-device pairing were not tested. Automated browser input is typed.
- No live Echo/Alexa+ integration, AWS service, cloud deployment, or marketplace connection was tested or claimed.
- The initial companion implementation check used Chromium. The subsequent [CI follow-up](CI.md) also runs the full Chromium viewer lifecycle suite and corrects GPU cleanup and stale layout selectors. WebKit remains unverified in this pass.
- Passing tests does not establish clinical accuracy, production security, competition eligibility, or correctness of the already-submitted video.

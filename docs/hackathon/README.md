# SehatSetu review pack

**Alexa+ primary-track prototype: a voice-first report companion with verified 3D anatomy and a real Streamable HTTP MCP server.**

[Watch the team demo](https://www.youtube.com/watch?v=teRzrT49HVo) · [Project README](../../README.md) · [Local demo](http://localhost:3016/?demo=1)

The local link works after starting the two services on your own computer. No public hosted application is claimed. The linked video is team-provided; its content and runtime have not been independently verified.

## Choose a review path

| Goal | Read this | Result |
| --- | --- | --- |
| Understand the product and try it | [Judge's guide](JUDGE_GUIDE.md) | Five-minute evaluation with clicks, prompts, and expected behavior |
| Start from a fresh checkout | [Local setup](../../README.md#run-locally) | Browser on 3016 and Python API/MCP on 8000 |
| Inspect the implementation | [Architecture review](TECHNICAL_REVIEW.md) | Components, protocol flow, data boundaries, tool inputs, and source links |
| Resolve setup/demo issues | [Troubleshooting](TROUBLESHOOTING.md) | Symptom-based fixes and readiness checks |
| Review a short presentation | [Demo walkthrough](DEMO_WALKTHROUGH.md) | Suggested current-version sequence under three minutes |
| Check test evidence | [Verification record](VERIFICATION.md) | Recorded results and what remains untested |
| Review developer experience | [Product feedback](PRODUCT_FEEDBACK.md) | Tools actually used, observed friction, and feature requests |
| Check version and submission scope | [Submission status](SUBMISSION_STATUS.md) | Dated additions, inherited functionality, and unverified submission details |
| Inspect the original atlas and licenses | [Atlas technical guide](../../README-technical.md), [asset attribution](../../public/ATTRIBUTION.md) | Source provenance and applicable licenses |

## What to expect

The core evaluation needs no login, Alexa hardware, AWS account, or paid inference. Typed questions work without a microphone. No-key mode returns English report excerpts; conversational reasoning and translation require a configured Groq provider. A separate browser tab can demonstrate pairing without another physical device.

The current implementation and documentation include October 25, 2026 post-submission work. Review the version notice in the main README before comparing the repository with the original submitted entry.

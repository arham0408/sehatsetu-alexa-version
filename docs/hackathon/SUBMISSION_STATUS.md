# Development history and submission status

## What this checkout establishes

The original workspace was inspected and updated on **October 25, 2026 (IST)** without `.git` metadata. The team subsequently identified [cavemansatyn-design/SehatSetu](https://github.com/cavemansatyn-design/SehatSetu) as the publication repository and requested that these changes be pushed there. This checkout is now connected to that repository, preserving its existing history; the remote base inspected before publication was `7e6cf2d0f52526d06f364c0e10d3cc3eb2f1f231` on `main`.

The exact deadline commit and Devpost entry remain unverified. The team supplied a [demo video URL](https://www.youtube.com/watch?v=teRzrT49HVo); retrieval did not expose its footage, transcript, or runtime. No claims are made about the deadline commit, earlier contribution dates, or the video's contents.

The checkout already contained the React/Three.js atlas, PDF/report analysis, deterministic extraction, Groq integration, multilingual chat, browser voice support, and anatomy verification. These are existing capabilities, not work authored in this implementation pass.

## Added October 25, 2026

- Official-SDK MCP server: protocol 2025-11-25, Streamable HTTP JSON responses, FastAPI hosting.
- Temporary report sessions, scoped follow-ups, report excerpts, anatomy-request state, and clinician-discussion prompts.
- Labeled Alexa+ simulation that actually initializes, discovers, and calls MCP tools.
- Companion-browser pairing, separate capabilities, single-use invitations, expiry, and revocation.
- Host/origin checks, request-size bounds, session limits, and periodic expiry cleanup.
- Report-grounded backend fallback replacing fixed sample diagnoses; actual provider labels.
- Protocol tests, an independent SDK client check, and a two-browser workflow check.
- Judge-focused README, demo walkthrough, and observed feedback; earlier technical guide preserved.

These are **post-submission additions**. Do not backdate them, alter history to imply earlier completion, or treat them as evidence that an earlier video demonstrated an implemented server.

## Timing and publishing

The [official rules](https://amazonappdev2026.devpost.com/rules) give a cutoff of **October 23, 2026, 12 p.m. Pacific**, equivalent to **October 24, 2026, 12:30 a.m. IST**. Section 5 prohibits changes to the submission afterward, except limited organizer-permitted modifications that remain substantively the same. Continuing development does not automatically make it part of the judged entry.

The publication update is a separate, normally dated Git commit that retains the previous repository history. Publishing continued development does not establish that it belongs to the judged submission. The team should identify the actual deadline version and clarify the organizers' treatment of later changes. This work does not modify Devpost, replace the submitted video, or contact organizers.

## Verify against the submitted entry

| Requirement | Current evidence / remaining verification |
| --- | --- |
| Alexa+ technology | Current MCP and simulation source exists; deadline-version evidence is unverified |
| GitHub repository/access | Publication repository linked above; verify it is the submitted URL and that public-license or private-reviewer access meets the rules |
| Source, assets, run instructions | Current local source and instructions exist; verify all model assets are included remotely |
| Public English demo under three minutes | Team-provided video linked; independently check rights, visibility, language, duration, accuracy, and version correspondence |
| Description and track | Current wording is in README; compare with the locked Devpost entry |
| Product feedback | Current observations are separately dated; verify feedback actually submitted during the event |
| Significant updates to an existing project | Attribute inherited viewer/atlas work and establish event-period changes using actual commits |
| AWS Builder | No qualifying AWS integration or Kiro Crew use verified |
| Open Source mini challenge | Code license exists; contribution timing, URLs, and GitHub username remain unverified |
| Friction-log bonus | Current log is post-submission and does not establish timely bonus eligibility |

Reviewer identities and full access requirements are in the [official FAQ](https://amazonappdev2026.devpost.com/details/faqs). Public repositories with the required license do not need private collaborator invitations.

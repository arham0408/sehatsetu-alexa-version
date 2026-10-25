# GitHub validation and optional Pages deployment

The workflow [deploy-pages.yml](../../.github/workflows/deploy-pages.yml) validates every push and pull request targeting `main`.

The October 25 run for commit `0b28faa` passed dependency installation, TypeScript, lint, and all 125 project tests. It then failed at **Configure Pages** because this private repository had no configured GitHub Pages site. That run never reached the browser checks or deployment.

The follow-up browser run also exposed retained GPU buffers after closing a located anatomy selection and stale test selectors from the older header layout. Dropped highlights now release their individual GPU buffers while keeping CPU geometry available for raycasting and later re-selection. The browser regression revisits the same organ to check that reuse still works. The offline test now uses the current About button and dashboard model-count label. No browser checks were removed.

## Current behavior

1. Install dependencies, check types, lint, and run project tests.
2. On pushes/manual runs, query the repository's Pages configuration with the workflow token.
3. If Pages is configured, load its deployment metadata. If GitHub returns 404, emit a notice and skip only Pages-specific setup/upload/deployment. Other HTTP errors still fail the check.
4. Install Chromium and run the full viewer/browser suite, including lifecycle, graphics recovery, responsive interaction, and offline reopening.
5. Build and validate the production PWA in either case.
6. Deploy to Pages only when the repository has a configured Pages site and the run targets `main` outside a pull request.

Skipping Pages does not skip project checks, publish the site somewhere else, or deploy the Python/MCP backend.

## Enable Pages later

A repository administrator can configure **Settings → Pages → Build and deployment → Source: GitHub Actions**, if Pages is available for the repository/account plan. The next push or manual workflow run detects the configured site automatically. The workflow does not change repository visibility or enable Pages by itself.

GitHub Pages serves the frontend's static files. The complete voice/MCP experience still needs a running Python backend as explained in the [project README](../../README.md#run-locally).

Reference: [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

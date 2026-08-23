# Copilot Instructions

## Deployment automation

- `.github/workflows/ci.yml` in this repo is responsible only for lint/typecheck/build and publishing images to GHCR on `master`.
- `fantasy-web-ui` must not mutate `fantasy-infra` from CI.
- Argo CD Image Updater is the source of truth for deployment image updates and owns digest write-back in `fantasy-infra`.

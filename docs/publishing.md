# Publishing to npm

The npm organization `smykla-skalski` owns `@smykla-skalski/sui`. Version `0.2.0` was published with an npm account. Later versions use the GitHub Actions trusted publisher connected to `smykla-skalski/sui` and `publish.yml` with direct publish permission.

## Release

1. Bump the version in `package.json` and `package-lock.json`, and update `CHANGELOG.md`.
2. Push a signed commit to `main` through a PR and wait for CI.
3. Create a GitHub Release from that commit with tag `v<package version>`.
4. The `Publish` workflow checks the tag, runs package checks, and publishes to npm using OIDC. It skips prereleases.
5. Verify the version with `npm view @smykla-skalski/sui version` and inspect the npm provenance badge.

Do not reuse a version already published to npm, even if it is no longer available for installation.

## Trusted publisher settings

| Field                | Value                |
| -------------------- | -------------------- |
| Organization or user | `smykla-skalski`     |
| Repository           | `sui`                |
| Workflow filename    | `publish.yml`        |
| Environment          | Empty                |
| Allowed actions      | Direct `npm publish` |

The workflow uses GitHub's OIDC identity, so it needs no npm token or repository secret. For this public repository and package, npm generates provenance automatically. The workflow filename is case-sensitive.

Sources: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [npm trust CLI](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [npm provenance](https://docs.npmjs.com/generating-provenance-statements/).

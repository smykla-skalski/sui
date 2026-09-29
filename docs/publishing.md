# Publishing to npm

The public package is `@smykla-skalski/sui`. npm and GitHub organizations are separate accounts. This repository's package name and public access are already configured in `package.json`.

## First publication

1. Sign in to [npm](https://www.npmjs.com/) with a personal account and enable two-factor authentication.
2. From the profile menu, choose **Add an Organization**. Name it `smykla-skalski` and select the free **Unlimited public packages** plan. If that name belongs to another npm account, resolve ownership before publishing; do not rename this package silently.
3. Ensure your npm account has permission to publish under the new organization.
4. On a clean checkout of `main`, run:

   ```sh
   mise install
   mise exec -- npm login
   mise exec -- npm whoami
   mise exec -- npm ci
   mise exec -- npm run format:check
   mise exec -- npm run check
   mise exec -- npm test
   mise exec -- npm pack --dry-run
   mise exec -- npm publish --access public
   ```

The initial publish uses your npm login and two-factor authentication. Local publishes cannot include provenance. The published version cannot be overwritten; bump the version for every later release.

## Connect GitHub trusted publishing

After the package exists on npm, configure its trusted publisher on npm under **Package settings → Trusted Publisher → GitHub Actions**:

| Field                | Value                       |
| -------------------- | --------------------------- |
| Organization or user | `smykla-skalski`            |
| Repository           | `sui`                       |
| Workflow filename    | `publish.yml`               |
| Environment          | Leave empty                 |
| Allowed actions      | Enable direct `npm publish` |

The workflow filename is case-sensitive. Alternatively, with npm CLI 11.15 or newer and an authenticated account with two-factor authentication:

```sh
mise exec -- npm trust github @smykla-skalski/sui --repo smykla-skalski/sui --file publish.yml --allow-publish
```

The workflow uses GitHub's OIDC identity and needs no npm token or repository secret. For this public repository and package, npm generates provenance automatically.

## Later releases

1. Bump the version in `package.json` and `package-lock.json`, update the changelog, and push a signed commit to `main`.
2. Wait for CI to pass. Create a GitHub Release tagged `v<package version>` from that commit.
3. The `Publish` workflow checks the tag against `package.json`, runs the package checks, and publishes to npm. It skips prereleases.
4. Verify the published version with `npm view @smykla-skalski/sui version` and inspect its npm provenance badge.

Do not create a GitHub Release for the manually published initial version: npm does not accept publishing the same version twice.

Sources: [npm organization setup](https://docs.npmjs.com/creating-an-organization/), [organization package publishing](https://docs.npmjs.com/creating-and-publishing-an-organization-scoped-package/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/), [npm trust CLI](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [provenance](https://docs.npmjs.com/generating-provenance-statements/).

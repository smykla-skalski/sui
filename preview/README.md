# PR previews

Every pull request that changes `src/` or `vite.config.ts` gets its kitchen sink at `https://sui.smyklot.com/pr-<number>`, linked from the pull request as the `preview` deployment. The root lists every live preview. Only members of the `smykla-skalski` organization can open them.

All previews share one Fly machine. [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) is the whole server: it signs visitors in with GitHub, checks the organization, and serves the static builds from a 1 GB volume. The machine stops when nobody looks, so the idle cost is the volume and the stopped root filesystem, about $0.20 a month. One preview is about 1.3 MB.

The [Preview workflow](../.github/workflows/preview.yml) builds the site with `BASE_PATH=/pr-<number>` and pipes it as a tarball into [`previews`](previews.sh) over `fly ssh console`. That script installs it and removes every preview whose pull request is closed, so a missed close is cleaned up by the next run. Pull requests from forks get no secrets and no preview.

## Setup

Do this once.

1. Create an OAuth app owned by the organization at <https://github.com/organizations/smykla-skalski/settings/applications/new>, with the homepage `https://sui.smyklot.com` and the callback `https://sui.smyklot.com/oauth2/callback`. It must be an OAuth app, not a GitHub App: oauth2-proxy checks the organization with `GET /user/orgs`, which [returns an empty list](https://docs.github.com/en/rest/orgs/orgs#list-organizations-for-the-authenticated-user) for GitHub App tokens. An app the organization owns is not held back by its third-party access policy.
2. Create the Fly app, give it the OAuth app's credentials and a cookie secret, and deploy it:

   ```sh
   fly apps create sui-previews
   fly secrets set --app sui-previews --stage \
     OAUTH2_PROXY_CLIENT_ID=<client id> \
     OAUTH2_PROXY_CLIENT_SECRET=<client secret> \
     OAUTH2_PROXY_COOKIE_SECRET="$(openssl rand -base64 32 | tr -- '+/' '-_')"
   fly deploy preview --ha=false
   ```

3. Point the domain at the app. `fly certs add` prints the records to create: `CNAME sui.smyklot.com -> sui-previews.fly.dev`, and the `_acme-challenge.sui.smyklot.com` `CNAME` that proves the domain is yours. Wait for `fly certs check` to report the certificate ready:

   ```sh
   fly certs add sui.smyklot.com --app sui-previews
   fly certs check sui.smyklot.com --app sui-previews
   ```

4. Give the workflow a deploy token that only reaches this app:

   ```sh
   fly tokens create deploy --app sui-previews | gh secret set FLY_API_TOKEN
   ```

After a change in this directory, run `fly deploy preview` again. The volume keeps the previews.

# The alpine variant, because `fly ssh` needs a shell and tar to install previews.
FROM quay.io/oauth2-proxy/oauth2-proxy:v7.15.5-alpine@sha256:8e4bec4f9fe4de10de63070209204075e4407503170aa19893d6e8d99f083d1b
COPY --chmod=755 previews.sh /usr/local/bin/previews

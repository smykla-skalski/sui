# The alpine variant, because `fly ssh` needs a shell and tar to install previews.
FROM quay.io/oauth2-proxy/oauth2-proxy:v7.15.5-alpine
COPY --chmod=755 previews.sh /usr/local/bin/previews

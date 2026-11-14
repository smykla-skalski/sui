# The alpine variant, because `fly ssh` needs a shell and tar to install previews.
FROM quay.io/oauth2-proxy/oauth2-proxy:v7.15.5-alpine@sha256:8e4bec4f9fe4de10de63070209204075e4407503170aa19893d6e8d99f083d1b
# oauth2-proxy's own file server answers a missing file with a bare text 404, so busybox httpd
# serves the files behind it and answers with main's 404 page instead.
RUN apk add --no-cache busybox-extras
COPY httpd.conf /etc/httpd.conf
COPY --chmod=755 previews.sh /usr/local/bin/previews
# ponytail: httpd runs unsupervised, so if it dies every page answers 502 until the machine restarts.
ENTRYPOINT ["sh", "-c", "mkdir -p /data/previews && httpd -p 127.0.0.1:8080 -h /data/previews -c /etc/httpd.conf && exec /bin/oauth2-proxy"]

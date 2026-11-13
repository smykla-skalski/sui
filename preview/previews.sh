#!/bin/sh
# Installs the site piped in as a gzipped tarball, then removes every preview whose pull
# request is not in the open list, so a missed close is cleaned up by the next run.
# `main` is installed at the root, beside the previews, and `-` installs nothing.
# Each open pull request comes as <number>:<base64 of its JSON picker entry>, and the entries
# of those with a preview make previews.json, the list the sink's preview picker reads.
#
# Usage: previews <pr|main|-> [open-pr:entry...]
set -eu

install=${1:?usage: previews <pr|main|-> [open-pr:entry...]}
shift
numbers=
for pr; do numbers="$numbers ${pr%%:*}"; done

cd "${PREVIEWS_DATA:-/data}"
mkdir -p previews incoming
# Runs for main and each pull request can overlap, so one waits for the other: otherwise a run
# that read the previews earlier could publish its list over a newer one.
exec 9>previews.lock
flock 9

case $install in
  -) ;;
  main)
    rm -rf incoming/main
    mkdir incoming/main
    tar -xzf - -C incoming/main
    find previews -mindepth 1 -maxdepth 1 ! -name 'pr-*' -exec rm -rf {} \;
    find incoming/main -mindepth 1 -maxdepth 1 -exec mv {} previews/ \;
    rmdir incoming/main
    ;;
  *)
    rm -rf "incoming/pr-$install"
    mkdir "incoming/pr-$install"
    tar -xzf - -C "incoming/pr-$install"
    rm -rf "previews/pr-$install"
    mv "incoming/pr-$install" previews/
    ;;
esac

for dir in previews/pr-*; do
  [ -d "$dir" ] || continue
  case "$numbers " in
    *" ${dir#previews/pr-} "*) ;;
    *) rm -rf "$dir" ;;
  esac
done

{
  printf '['
  comma=
  for pr; do
    # A run from a branch older than the picker passes bare numbers, with no entry to list.
    case $pr in *:*) ;; *) continue ;; esac
    [ -d "previews/pr-${pr%%:*}" ] || continue
    printf '%s' "$comma"
    printf '%s' "${pr#*:}" | base64 -d
    comma=,
  done
  printf ']\n'
} > incoming/previews.json
mv incoming/previews.json previews/previews.json

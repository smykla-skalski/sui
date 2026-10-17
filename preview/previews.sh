#!/bin/sh
# Installs the site piped in as a gzipped tarball, then removes every preview whose pull
# request is not in the open list, so a missed close is cleaned up by the next run.
# `main` is installed at the root, beside the previews, and `-` installs nothing.
#
# Usage: previews <pr|main|-> [open-pr...]
set -eu

install=${1:?usage: previews <pr|main|-> [open-pr...]}
shift

cd "${PREVIEWS_DATA:-/data}"
mkdir -p previews incoming

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
  case " $* " in
    *" ${dir#previews/pr-} "*) ;;
    *) rm -rf "$dir" ;;
  esac
done

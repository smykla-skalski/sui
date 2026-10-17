#!/bin/sh
# Installs the preview piped in as a gzipped tarball, then removes every preview whose pull
# request is not in the open list, so a missed close is cleaned up by the next run.
#
# Usage: previews <pr|-> [open-pr...]
set -eu

install=${1:?usage: previews <pr|-> [open-pr...]}
shift

cd "${PREVIEWS_DATA:-/data}"
mkdir -p previews incoming

if [ "$install" != - ]; then
  rm -rf "incoming/pr-$install"
  mkdir "incoming/pr-$install"
  tar -xzf - -C "incoming/pr-$install"
  rm -rf "previews/pr-$install"
  mv "incoming/pr-$install" previews/
fi

for dir in previews/pr-*; do
  [ -d "$dir" ] || continue
  case " $* " in
    *" ${dir#previews/pr-} "*) ;;
    *) rm -rf "$dir" ;;
  esac
done

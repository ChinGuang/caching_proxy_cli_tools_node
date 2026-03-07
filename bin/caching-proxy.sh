#!/bin/sh
node --use-system-ca "$(dirname "$0")/../dist/index.js" "$@"

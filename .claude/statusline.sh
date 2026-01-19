#!/bin/bash
# Get directory name - Windows compatible
DIR="${PWD##*/}"
# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
printf "%s | %s" "$DIR" "$BRANCH"

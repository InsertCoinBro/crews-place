#!/bin/sh
# Double-click this file on macOS, or run: sh start.command
cd -- "$(dirname -- "$0")" || exit 1

# Use a regular Node installation first; Codex's bundled runtime also works.
if ! command -v node >/dev/null 2>&1; then
  crews_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
  if [ -x "$crews_runtime/node/bin/node" ]; then
    PATH="$crews_runtime/node/bin:$crews_runtime/bin/fallback:$PATH"
    export PATH
  fi
fi

if command -v pnpm >/dev/null 2>&1; then
  if [ ! -d node_modules/three ]; then pnpm install || exit 1; fi
  exec pnpm dev
elif command -v npm >/dev/null 2>&1; then
  if [ ! -d node_modules/three ]; then npm install || exit 1; fi
  exec npm run dev
else
  printf '%s\n' 'Install Node.js 22.12+ and npm, then run this launcher again.'
  exit 1
fi

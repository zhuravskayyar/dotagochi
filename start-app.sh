#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$project_root/.tools/bin:$PATH"
server_url="http://127.0.0.1:3001/api/health"
client_url="http://127.0.0.1:5173"
studio_url="${client_url}/animation-studio"
no_browser=false
open_game=false

for argument in "$@"; do
  case "$argument" in
    --no-browser) no_browser=true ;;
    --game) open_game=true ;;
    *)
      echo "Unknown argument: $argument" >&2
      echo "Usage: ./start-app.sh [--no-browser] [--game]" >&2
      exit 2
      ;;
  esac
done

cd "$project_root"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Checking GitHub for team updates..."
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Local changes found. Automatic pull was skipped to protect your work." >&2
  elif ! GIT_TERMINAL_PROMPT=0 git pull --ff-only origin main; then
    echo "Could not receive GitHub updates. Starting the current local version." >&2
  fi
fi

echo "Checking and installing project dependencies..."
npm install --no-audit --no-fund
npm run sync:animations

check_endpoint() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --max-time 2 "$url" >/dev/null 2>&1
  else
    node -e \
      'fetch(process.argv[1]).then(r => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))' \
      "$url"
  fi
}

if ! check_endpoint "$server_url"; then
  echo "Starting backend..."
  nohup npm run dev:server \
    >"$project_root/runtime-server-linux.out.log" \
    2>"$project_root/runtime-server-linux.err.log" &
else
  echo "Backend is already running on port 3001."
fi

if ! check_endpoint "$client_url"; then
  echo "Starting client..."
  nohup npm run dev:client \
    >"$project_root/runtime-client-linux.out.log" \
    2>"$project_root/runtime-client-linux.err.log" &
else
  echo "Client is already running on port 5173."
fi

deadline=$((SECONDS + 45))
until check_endpoint "$client_url"; do
  if (( SECONDS >= deadline )); then
    echo "Client did not become available on port 5173 within 45 seconds." >&2
    exit 1
  fi
  sleep 1
done

if [[ "$no_browser" == false ]]; then
  launch_url="$studio_url"
  if [[ "$open_game" == true ]]; then
    launch_url="$client_url"
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$launch_url" >/dev/null 2>&1 &
  elif command -v gio >/dev/null 2>&1; then
    gio open "$launch_url" >/dev/null 2>&1 &
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$launch_url" >/dev/null 2>&1 &
  else
    echo "Open in a browser: $launch_url"
  fi
fi

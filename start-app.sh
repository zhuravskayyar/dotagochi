#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$project_root/.tools/bin:$PATH"
server_url="http://127.0.0.1:3001/api/health"
client_url="http://127.0.0.1:5173"
studio_url="${client_url}/animation-studio"
no_browser=false
open_game=false

node_is_supported() {
  command -v node >/dev/null 2>&1 &&
    command -v npm >/dev/null 2>&1 &&
    [[ "$(node -p 'const major = Number(process.versions.node.split(`.`)[0]); major >= 20 && major < 27')" == "true" ]]
}

load_node_environment() {
  if node_is_supported; then
    return
  fi

  export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # The desktop launcher starts a non-interactive shell, so nvm is not loaded automatically.
    # shellcheck disable=SC1090
    source "${NVM_DIR}/nvm.sh"
    nvm use --lts >/dev/null 2>&1 || true
  fi

  if ! node_is_supported; then
    echo "Не знайдено сумісний Node.js 20–26." >&2
    echo "Повторно запустіть Linux-інсталятор із сайту." >&2
    exit 1
  fi
}

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

load_node_environment
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

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

local_commit="$(git rev-parse --short HEAD 2>/dev/null || printf 'unknown')"
local_instance="$(
  node -e \
    'const {createHash}=require("node:crypto"); const fs=require("node:fs"); const root=fs.realpathSync(process.argv[1]); process.stdout.write(createHash("sha256").update(root).digest("hex").slice(0,16))' \
    "$project_root"
)"

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

read_server_metadata() {
  local metadata
  if ! metadata="$(
    node -e \
      'fetch(process.argv[1]).then(async r=>{const d=await r.json();if(d.app!=="dota-tamagotchi"||!d.instance||!d.commit||!d.pid)process.exit(2);process.stdout.write(`${d.instance}\n${d.commit}\n${d.pid}`)}).catch(()=>process.exit(1))' \
      "$server_url"
  )"; then
    return 1
  fi
  mapfile -t server_metadata <<<"$metadata"
}

if check_endpoint "$server_url"; then
  if ! read_server_metadata; then
    echo "Port 3001 is occupied by an old or unknown server. Stop it once and run Studio again." >&2
    exit 1
  fi
  if [[ "${server_metadata[0]}" != "$local_instance" ]]; then
    echo "Port 3001 is used by another Dota Tamagotchi project. Stop it before starting this copy." >&2
    exit 1
  fi
  if [[ ! "${server_metadata[2]}" =~ ^[0-9]+$ ]]; then
    echo "The running backend returned an invalid process ID." >&2
    exit 1
  fi

  echo "Stopping the backend before database synchronization..."
  kill "${server_metadata[2]}"
  restart_deadline=$((SECONDS + 10))
  while check_endpoint "$server_url"; do
    if (( SECONDS >= restart_deadline )); then
      echo "The backend did not stop within 10 seconds." >&2
      exit 1
    fi
    sleep 1
  done
fi

echo "Backing up and synchronizing the local database..."
npm run prepare:database
npm run migrate

echo "Checking the GitHub account..."
npm run github:connect || true

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

#!/usr/bin/env bash
set -uo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
state_directory="${XDG_STATE_HOME:-${HOME}/.local/state}/dota-tamagotchi"
launch_log="${state_directory}/studio-launch.log"

mkdir -p -- "${state_directory}"

{
  echo
  echo "=== Dota Tamagotchi Studio · $(date --iso-8601=seconds 2>/dev/null || date) ==="
  "${project_root}/start-app.sh" "$@"
} 2>&1 | tee -a "${launch_log}"
launch_status=${PIPESTATUS[0]}

if (( launch_status != 0 )); then
  echo
  echo "Studio не запустилася. Повний лог збережено тут:"
  echo "  ${launch_log}"
  echo
  if [[ -t 0 ]]; then
    read -r -p "Натисніть Enter, щоб закрити це вікно…" _
  fi
fi

exit "${launch_status}"

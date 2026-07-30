#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
launcher_name="dota-tamagotchi-studio.desktop"
shortcut_home="${DOTA_TAMAGOTCHI_SHORTCUT_HOME:-${HOME}}"
applications_dir="${XDG_DATA_HOME:-${shortcut_home}/.local/share}/applications"
applications_launcher="${applications_dir}/${launcher_name}"
icon_path="${project_root}/packages/client/public/assets/ui/egg/ancient-egg-v1.png"
launcher_script="${project_root}/launch-studio.sh"

if [[ "${project_root}" == *$'\n'* ]]; then
  echo "Шлях до проєкту не може містити перенесення рядка." >&2
  exit 1
fi

chmod +x "${project_root}/start-app.sh" "${launcher_script}"

if [[ ! -f "${icon_path}" ]]; then
  icon_path="applications-development"
fi

write_launcher() {
  local destination="$1"

  cat >"${destination}" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Dota Tamagotchi Studio
Comment=Оновити Git, синхронізувати базу й відкрити Animation Studio
Exec="${launcher_script}"
TryExec=${launcher_script}
Path=${project_root}
Icon=${icon_path}
Terminal=true
Categories=Development;Game;
StartupNotify=true
EOF

  chmod +x "${destination}"
}

mkdir -p -- "${applications_dir}"
write_launcher "${applications_launcher}"

desktop_dir=""
if [[ -z "${DOTA_TAMAGOTCHI_SHORTCUT_HOME:-}" ]] &&
  command -v xdg-user-dir >/dev/null 2>&1; then
  desktop_dir="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
fi

if [[ -z "${desktop_dir}" ]]; then
  desktop_dir="${shortcut_home}/Desktop"
fi

if [[ -n "${desktop_dir}" && "${desktop_dir}" != "${shortcut_home}" ]]; then
  mkdir -p -- "${desktop_dir}"
  desktop_launcher="${desktop_dir}/Dota Tamagotchi Studio.desktop"
  write_launcher "${desktop_launcher}"

  if command -v gio >/dev/null 2>&1; then
    gio set "${desktop_launcher}" metadata::trusted true >/dev/null 2>&1 || true
  fi

  echo "✓ Ярлик Studio створено на робочому столі:"
  echo "  ${desktop_launcher}"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${applications_dir}" >/dev/null 2>&1 || true
fi

echo "✓ Dota Tamagotchi Studio додано до меню програм."

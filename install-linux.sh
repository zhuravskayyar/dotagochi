#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/zhuravskayyar/dotagochi.git"
readonly ARCHIVE_URL="https://codeload.github.com/zhuravskayyar/dotagochi/tar.gz/refs/heads/main"
readonly NVM_VERSION="v0.40.3"

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="${script_dir}/dota-tamagotchi"
browser_project_dir="${script_dir}/dota-tamagotchi-source"
project_archive="${script_dir}/dota-tamagotchi-source.tar.gz"
temporary_dir=""

cleanup() {
  if [[ -n "${temporary_dir}" && -d "${temporary_dir}" ]]; then
    rm -rf -- "${temporary_dir}"
  fi
}

on_error() {
  local exit_code=$?
  echo
  echo "Інсталяцію зупинено через помилку." >&2
  echo "Скопіюйте цей текст і створіть звернення:" >&2
  echo "https://github.com/zhuravskayyar/dotagochi/issues/new" >&2
  exit "${exit_code}"
}

trap cleanup EXIT
trap on_error ERR

download_file() {
  local url="$1"
  local destination="$2"

  if command -v curl >/dev/null 2>&1; then
    curl --fail --location --retry 3 --progress-bar \
      --output "${destination}" "${url}"
  elif command -v wget >/dev/null 2>&1; then
    wget --tries=3 --output-document="${destination}" "${url}"
  else
    echo "Потрібна команда curl або wget." >&2
    echo "Ubuntu/Debian: sudo apt update && sudo apt install -y curl" >&2
    exit 1
  fi
}

node_is_supported() {
  command -v node >/dev/null 2>&1 &&
    command -v npm >/dev/null 2>&1 &&
    [[ "$(node -p 'Number(process.versions.node.split(`.`)[0]) >= 18')" == "true" ]]
}

run_as_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "Для встановлення Git потрібні права адміністратора або команда sudo." >&2
    exit 1
  fi
}

install_git() {
  if command -v git >/dev/null 2>&1; then
    echo "✓ Git $(git --version | awk '{print $3}') уже готовий."
    return
  fi

  echo "Встановлюю Git для синхронізації Studio..."
  if command -v apt-get >/dev/null 2>&1; then
    run_as_root apt-get update
    run_as_root apt-get install -y git
  elif command -v dnf >/dev/null 2>&1; then
    run_as_root dnf install -y git
  elif command -v yum >/dev/null 2>&1; then
    run_as_root yum install -y git
  elif command -v pacman >/dev/null 2>&1; then
    run_as_root pacman -Sy --needed --noconfirm git
  elif command -v zypper >/dev/null 2>&1; then
    run_as_root zypper --non-interactive install git
  elif command -v apk >/dev/null 2>&1; then
    run_as_root apk add git
  else
    echo "Не вдалося визначити пакетний менеджер. Встановіть Git і запустіть інсталятор ще раз." >&2
    exit 1
  fi

  if ! command -v git >/dev/null 2>&1; then
    echo "Git не встановлено. Запустіть інсталятор ще раз після ручного встановлення Git." >&2
    exit 1
  fi
}

install_node() {
  if node_is_supported; then
    echo "✓ Node.js $(node --version) і npm $(npm --version) уже готові."
    return
  fi

  echo "Встановлюю актуальну LTS-версію Node.js у профіль користувача..."
  temporary_dir="$(mktemp -d "${TMPDIR:-/tmp}/dota-tamagotchi.XXXXXX")"
  local nvm_installer="${temporary_dir}/install-nvm.sh"
  download_file \
    "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" \
    "${nvm_installer}"

  export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
  PROFILE=/dev/null bash "${nvm_installer}"

  # shellcheck disable=SC1091
  source "${NVM_DIR}/nvm.sh"
  nvm install --lts
  nvm use --lts

  if ! node_is_supported; then
    echo "Не вдалося підготувати Node.js 18 або новіший." >&2
    exit 1
  fi
}

prepare_project() {
  if [[ -f "${project_dir}/package.json" ]]; then
    echo "✓ Проєкт уже є у ${project_dir}"
    return
  fi

  if [[ -e "${project_dir}" ]]; then
    echo "Папка ${project_dir} вже існує, але не схожа на цей проєкт." >&2
    echo "Перейменуйте або приберіть її та запустіть інсталятор ще раз." >&2
    exit 1
  fi

  if [[ -f "${browser_project_dir}/package.json" ]] &&
    [[ "$(cat "${browser_project_dir}/.download-complete" 2>/dev/null || true)" == "complete" ]]; then
    echo "Готую файли, завантажені браузером..."
    mv -- "${browser_project_dir}" "${project_dir}"
    return
  fi

  mkdir -p -- "${project_dir}"

  if [[ -s "${project_archive}" ]]; then
    echo "Розпаковую завантажений комплект..."
    tar -xzf "${project_archive}" --strip-components=1 -C "${project_dir}"
    return
  fi

  if command -v git >/dev/null 2>&1; then
    echo "Завантажую проєкт із GitHub..."
    rmdir -- "${project_dir}"
    git clone --depth 1 "${REPOSITORY_URL}" "${project_dir}"
    return
  fi

  echo "Завантажую архів проєкту..."
  temporary_dir="$(mktemp -d "${TMPDIR:-/tmp}/dota-tamagotchi.XXXXXX")"
  local downloaded_archive="${temporary_dir}/project.tar.gz"
  download_file "${ARCHIVE_URL}" "${downloaded_archive}"
  tar -xzf "${downloaded_archive}" --strip-components=1 -C "${project_dir}"
}

prepare_git_repository() {
  if [[ -d "${project_dir}/.git" ]]; then
    return
  fi

  echo "Підключаю локальні файли до GitHub для pull і push..."
  rm -f -- "${project_dir}/.download-complete"
  git -C "${project_dir}" init
  git -C "${project_dir}" remote add origin "${REPOSITORY_URL}"
  git -C "${project_dir}" fetch --depth 1 origin main
  git -C "${project_dir}" reset --mixed FETCH_HEAD
  git -C "${project_dir}" branch -M main
}

echo
echo "Dota Tamagotchi — автоматичне встановлення для Linux"
echo "====================================================="
echo

install_node
install_git
prepare_project
prepare_git_repository

cd -- "${project_dir}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "✓ Створено локальний файл налаштувань .env"
fi

echo "Встановлюю залежності проєкту..."
npm install --no-audit --no-fund

echo "Готую локальну базу даних..."
npm run migrate

chmod +x start-app.sh

echo
echo "✓ Готово. Проєкт встановлено у:"
echo "  ${project_dir}"
echo
echo "Запускаю застосунок. Наступного разу використовуйте:"
echo "  cd \"${project_dir}\" && ./start-app.sh"
echo

exec ./start-app.sh

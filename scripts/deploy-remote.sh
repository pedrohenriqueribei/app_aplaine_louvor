#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/applane}"
PM2_APP="${PM2_APP:-applane}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:3005}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_SHA="${GIT_SHA:-}"

HEALTHCHECK_ATTEMPTS=15
HEALTHCHECK_DELAY=2

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

cd "$APP_DIR"

BACKUP_DIR="$APP_DIR/.next.previous"
PREVIOUS_SHA="$(git rev-parse HEAD)"

log() {
  printf '\n==> %s\n' "$1"
}

restore_build() {
  rm -rf "$APP_DIR/.next"
  if [ -d "$BACKUP_DIR" ]; then
    mv "$BACKUP_DIR" "$APP_DIR/.next"
  fi
}

reload_app() {
  pm2 reload "$PM2_APP" --update-env || pm2 restart "$PM2_APP"
}

rollback() {
  trap - ERR
  log "Rollback para $PREVIOUS_SHA"
  git reset --hard "$PREVIOUS_SHA" || log "AVISO: git reset falhou"
  restore_build
  npm ci --include=dev || log "AVISO: npm ci falhou no rollback, node_modules pode estar inconsistente"
  reload_app || log "AVISO: pm2 reload falhou"
  log "Rollback concluido"
  exit 1
}

trap rollback ERR

log "Commit atual: $PREVIOUS_SHA"

if [ -d "$APP_DIR/.next" ]; then
  log "Guardando build anterior"
  rm -rf "$BACKUP_DIR"
  cp -a "$APP_DIR/.next" "$BACKUP_DIR"
fi

log "Buscando origin/$GIT_BRANCH"
git fetch origin "$GIT_BRANCH"

TARGET_SHA="${GIT_SHA:-$(git rev-parse "origin/$GIT_BRANCH")}"
log "Publicando $TARGET_SHA"
git reset --hard "$TARGET_SHA"

log "Instalando dependencias"
npm ci --include=dev

log "Buildando"
npm run build

log "Recarregando $PM2_APP"
reload_app
pm2 save

log "Health check em $HEALTHCHECK_URL"
attempt=1
while [ "$attempt" -le "$HEALTHCHECK_ATTEMPTS" ]; do
  if curl -fsS -o /dev/null --max-time 10 "$HEALTHCHECK_URL"; then
    rm -rf "$BACKUP_DIR"
    log "Deploy concluido: $TARGET_SHA"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep "$HEALTHCHECK_DELAY"
done

log "Health check falhou apos $HEALTHCHECK_ATTEMPTS tentativas"
rollback

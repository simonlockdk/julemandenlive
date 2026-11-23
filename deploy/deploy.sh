#!/usr/bin/env bash
# Bygger et nyt image og genstarter Nordpolens Kontrolcentral.
# Kør fra projektmappen:  ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ Bygger image …"
podman build --format docker -t localhost/nordpolen:latest .
if [[ "${1:-}" == "--build-only" ]]; then
  echo "✔ Image bygget (servicen er ikke genstartet)."
  exit 0
fi

echo "▸ Genstarter service …"
systemctl --user daemon-reload
systemctl --user restart nordpolen

echo "▸ Venter på at serveren svarer …"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3200/api/health >/dev/null 2>&1; then
    echo "✔ Nordpolens Kontrolcentral kører."
    podman image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 1
done
echo "✘ Serveren svarer ikke. Se loggen:  journalctl --user -u nordpolen -n 50"
exit 1

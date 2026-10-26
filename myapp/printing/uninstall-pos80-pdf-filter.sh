#!/bin/bash
# Remove PDF support from the POS-80 CUPS queue and restore the previous PPD.
# Run with sudo: sudo ./uninstall-pos80-pdf-filter.sh
set -euo pipefail

QUEUE="POS-80"
FILTER_DST="/usr/lib/cups/filter/pdf-to-pos80"
BACKUP_DIR="/var/backups/pos80-pdf"

if [ "$(id -u)" -ne 0 ]; then
  echo "This uninstaller must run as root:"
  echo "  sudo $0"
  exit 1
fi

LATEST_PPD="$(ls -1t "${BACKUP_DIR}/${QUEUE}.ppd."* 2>/dev/null | head -1 || true)"

if [ -n "$LATEST_PPD" ]; then
  lpadmin -p "$QUEUE" -P "$LATEST_PPD"
  echo "Restored PPD: $LATEST_PPD"
else
  echo "No PPD backup found in ${BACKUP_DIR}." >&2
  echo "Remove the application/pdf *cupsFilter2 line from ${QUEUE}'s PPD manually." >&2
fi

rm -f "$FILTER_DST"

systemctl reload cups 2>/dev/null || systemctl restart cups 2>/dev/null || true

echo "PDF filter removed from queue '${QUEUE}'."

#!/bin/bash
# Install PDF support on the existing POS-80 CUPS queue.
# Run with sudo: sudo ./install-pos80-pdf-filter.sh
set -euo pipefail

QUEUE="POS-80"
PPD="/etc/cups/ppd/${QUEUE}.ppd"
FILTER_DST="/usr/lib/cups/filter/pdf-to-pos80"
BACKUP_DIR="/var/backups/pos80-pdf"
STAMP="$(date +%Y%m%d-%H%M%S)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FILTER_SRC="${SCRIPT_DIR}/pdf-to-pos80"

if [ "$(id -u)" -ne 0 ]; then
  echo "This installer must run as root:"
  echo "  sudo $0"
  exit 1
fi

[ -f "$FILTER_SRC" ] || { echo "Missing filter source: $FILTER_SRC" >&2; exit 1; }
[ -f "$PPD" ] || { echo "PPD not found: $PPD" >&2; exit 1; }
command -v pdftotext >/dev/null || {
  echo "pdftotext is missing. Install it first: sudo apt install poppler-utils" >&2
  exit 1
}

if grep -q 'pdf-to-pos80' "$PPD"; then
  echo "PDF filter is already present in $PPD; nothing to do."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
cp -a "$PPD" "${BACKUP_DIR}/${QUEUE}.ppd.${STAMP}"
if [ -f "$FILTER_DST" ]; then
  cp -a "$FILTER_DST" "${BACKUP_DIR}/pdf-to-pos80.${STAMP}"
fi

install -o root -g root -m 0755 "$FILTER_SRC" "$FILTER_DST"

TMP_PPD="$(mktemp /tmp/pos80-pdf-ppd.XXXXXX)"
trap 'rm -f "$TMP_PPD"' EXIT

# A single *cupsFilter2 hides every *cupsFilter line, so add a cupsFilter2
# rule for PDF. The destination type is the printer's final/native type.
# Older PPDs without cupsFilter2 get a legacy cupsFilter rule instead.
if grep -q '^\*cupsFilter2:' "$PPD"; then
  awk '
    BEGIN { inserted = 0 }
    !inserted && /^\*cupsFilter2:/ {
      print "*cupsFilter2: \"application/pdf application/vnd.pos80 0 pdf-to-pos80\""
      inserted = 1
    }
    { print }
  ' "$PPD" > "$TMP_PPD"
elif grep -q '^\*cupsFilter:' "$PPD"; then
  awk '
    BEGIN { inserted = 0 }
    !inserted && /^\*cupsFilter:/ {
      print "*cupsFilter: \"application/pdf 0 pdf-to-pos80\""
      inserted = 1
    }
    { print }
  ' "$PPD" > "$TMP_PPD"
else
  echo "No *cupsFilter or *cupsFilter2 line found in $PPD." >&2
  exit 1
fi

if ! grep -q 'pdf-to-pos80' "$TMP_PPD"; then
  echo "Could not add the PDF filter to the PPD." >&2
  exit 1
fi

if ! cupstestppd -q "$TMP_PPD"; then
  echo "The modified PPD failed validation; nothing was installed." >&2
  exit 1
fi

lpadmin -p "$QUEUE" -P "$TMP_PPD"
lpadmin -p "$QUEUE" -o SendFF=False -o Pagination=False || \
  echo "Warning: could not set SendFF/Pagination options." >&2

systemctl reload cups 2>/dev/null || systemctl restart cups 2>/dev/null || \
  echo "Warning: reload/restart CUPS manually if the filter is not picked up." >&2

echo
echo "PDF support installed on queue '${QUEUE}'."
echo "PPD backup: ${BACKUP_DIR}/${QUEUE}.ppd.${STAMP}"
echo
echo "Test with:"
echo "  lp -d ${QUEUE} /tmp/opencode/browser-print.pdf"
echo "  lpstat -W completed -l -o ${QUEUE} | head"

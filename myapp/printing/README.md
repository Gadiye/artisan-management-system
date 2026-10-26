# POS-80 PDF support for CUPS

The POS-80 queue uses the **Generic Text-Only Printer** PPD, which accepts
`text/plain` but not `application/pdf`. Browsers print PDF, so CUPS rejects
their jobs with:

```
client-error-document-format-not-supported
```

This directory adds a CUPS filter that accepts PDF, extracts its text with
`pdftotext -layout -enc ASCII7`, and sends CRLF-terminated ASCII to the printer.

## What it changes

- Installs `/usr/lib/cups/filter/pdf-to-pos80`.
- Adds one `*cupsFilter2` line to the existing `POS-80` PPD.
- Backs up the old PPD under `/var/backups/pos80-pdf/`.
- Does **not** modify the web application.

## Install

```bash
sudo ./install-pos80-pdf-filter.sh
```

Requires `poppler-utils` (`pdftotext`), which is already installed here.

## Test

```bash
lp -d POS-80 /tmp/opencode/browser-print.pdf
lpstat -W completed -l -o POS-80 | head
```

Or print the web app page from a browser running **on the same machine as
CUPS** and choose the `POS-80` queue.

## Remove

```bash
sudo ./uninstall-pos80-pdf-filter.sh
```

## Limitations

- Text extraction only: borders, logos, fonts, and images are not printed.
- The browser must send the job to **this** CUPS server. A browser on another
  computer normally prints to its own local CUPS; install/share the `POS-80`
  queue over IPP there if you want it to use this filter.
- This does not fix the web app's own `/api/print` route inside its container.
  That route needs `cups-client` and the CUPS socket, which is a separate change.

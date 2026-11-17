#!/bin/sh
# OCR one scan page into word positions (TSV). Args: page-number, pages dir, out dir.
[ -s "$3/$1.tsv" ] || tesseract "$2/$1.jpg" "$3/$1" --psm 11 tsv >/dev/null 2>&1

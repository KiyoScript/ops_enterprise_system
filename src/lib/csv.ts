// Minimal RFC 4180 CSV parser. Handles quoted fields, "" escapes, and
// newlines inside quotes — required because legacy Status History cells are
// multiline. No streaming: sheet exports are a few MB at most.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    switch (ch) {
      case '"':
        inQuotes = true;
        break;
      case ",":
        row.push(field);
        field = "";
        break;
      case "\r":
        break; // handled by the following \n (or ignored if bare)
      case "\n":
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        break;
      default:
        field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const escapeValue = (value: string | number): string => {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
};

export const toCsv = (headers: string[], rows: (string | number)[][]): string => {
  const lines: string[] = [];
  lines.push(headers.map(escapeValue).join(","));
  rows.forEach((row) => {
    lines.push(row.map(escapeValue).join(","));
  });
  return lines.join("\n");
};

export const parseCsv = (raw: string): string[][] => {
  if (!raw.trim()) {
    return [];
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;
  let fieldQuoted = false;

  const pushField = () => {
    const nextValue = fieldQuoted ? value : value.trim();
    row.push(nextValue);
    value = "";
    fieldQuoted = false;
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (inQuotes) {
      if (char === "\"") {
        const nextChar = raw[i + 1];
        if (nextChar === "\"") {
          value += "\"";
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      value += char;
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      fieldQuoted = true;
      continue;
    }

    if (char === ",") {
      pushField();
      continue;
    }

    if (char === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (char === "\r") {
      if (raw[i + 1] === "\n") {
        i += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    value += char;
  }

  pushField();
  pushRow();
  return rows;
};

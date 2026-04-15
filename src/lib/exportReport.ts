export interface ReportColumn {
  key: string;
  label: string;
  format: string;
}

export interface ReportData {
  title: string;
  company: string;
  period: string;
  columns: ReportColumn[];
  rows: any[];
  summary: any;
}

function formatValue(value: any, format: string): string {
  if (value == null || value === "") return "";
  const num = parseFloat(value);
  switch (format) {
    case "date":
      return new Date(value).toLocaleDateString("de-DE");
    case "number":
      return isNaN(num) ? String(value) : String(num);
    case "currency":
      return isNaN(num) ? "" : num.toFixed(2);
    case "percent":
      return isNaN(num) ? "" : `${num.toFixed(1)}%`;
    case "delta":
      return isNaN(num) ? "" : String(num);
    case "text":
      return value === "lead" ? "Lead-Post" : value === "content" ? "Content-Post" : String(value);
    default:
      return String(value);
  }
}

export function exportToCSV(report: ReportData) {
  const separator = ";"; // German Excel compatibility
  const header = report.columns.map(c => c.label).join(separator);
  const rows = report.rows.map(row =>
    report.columns.map(col => {
      const val = formatValue(row[col.key], col.format);
      // Escape values containing separator or quotes
      if (val.includes(separator) || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(separator)
  );

  // Add summary row
  if (report.summary) {
    const summaryRow = report.columns.map((col, i) => {
      if (i === 0) return `Summe (${report.summary.days_tracked} Tage)`;
      if (i === 1) return "";
      return formatValue(report.summary[col.key], col.format);
    }).join(separator);
    rows.push(summaryRow);
  }

  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const csv = bom + `${report.title}\n${report.company}\n\n${header}\n${rows.join("\n")}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `KPI_Report_${report.period.replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(report: ReportData) {
  // Build a printable HTML document
  const colsPerPage = report.columns.length;
  
  const headerCells = report.columns
    .map(c => `<th style="padding:4px 6px;border:1px solid #ddd;font-size:9px;white-space:nowrap;background:#f5f5f5">${c.label}</th>`)
    .join("");

  const bodyRows = report.rows
    .map(row => {
      const cells = report.columns
        .map(col => {
          const val = formatValue(row[col.key], col.format);
          return `<td style="padding:3px 6px;border:1px solid #eee;font-size:9px;white-space:nowrap">${val}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  let summaryRow = "";
  if (report.summary) {
    const cells = report.columns
      .map((col, i) => {
        if (i === 0) return `<td style="padding:3px 6px;border:1px solid #ddd;font-size:9px;font-weight:bold;background:#f0f0f0">Σ ${report.summary.days_tracked} Tage</td>`;
        if (i === 1) return `<td style="padding:3px 6px;border:1px solid #ddd;font-size:9px;background:#f0f0f0">–</td>`;
        const val = formatValue(report.summary[col.key], col.format);
        return `<td style="padding:3px 6px;border:1px solid #ddd;font-size:9px;font-weight:bold;background:#f0f0f0">${val}</td>`;
      })
      .join("");
    summaryRow = `<tr>${cells}</tr>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${report.title}</title>
      <style>
        @page { size: landscape; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
        h1 { font-size: 16px; margin: 0 0 4px 0; }
        h2 { font-size: 12px; color: #666; margin: 0 0 16px 0; font-weight: normal; }
        table { border-collapse: collapse; width: 100%; }
        .meta { font-size: 10px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>${report.title}</h1>
      <h2>${report.company}</h2>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}${summaryRow}</tbody>
      </table>
      <p class="meta">Erstellt am ${new Date().toLocaleDateString("de-DE")} – ContentLeads KPI Tracker</p>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

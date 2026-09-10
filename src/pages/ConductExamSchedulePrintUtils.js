import global1 from "./global1";

const safe = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const valueOf = (row, field) => {
  if (field === "examdate") return row.examdate ? String(row.examdate).slice(0, 10) : "";
  return row[field] ?? "";
};

export const normalizeInstitution = (institution = {}) => ({
  logo: institution.logolink || institution.logo || global1.logo || "",
  name: institution.institutionname || institution.insname || institution.name || global1.insname || "Institution",
  address: institution.address || global1.address || "",
  phone: institution.phone || institution.mobileno || global1.phone || "",
  email: institution.email || global1.email || "",
  website: institution.website || ""
});

const tableHtml = (rows = [], columns = []) => `
  <table>
    <thead>
      <tr>
        <th style="width:34px">Sr</th>
        ${columns.map((col) => `<th>${safe(col.headerName || col.label || col.field)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.length ? rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          ${columns.map((col) => `<td>${safe(valueOf(row, col.field))}</td>`).join("")}
        </tr>
      `).join("") : `<tr><td colspan="${columns.length + 1}" style="text-align:center">No records found</td></tr>`}
    </tbody>
  </table>
`;

export const printExamSchedule = ({ title, institution, meta = {}, sections = [] }) => {
  const inst = normalizeInstitution(institution);
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    alert("Popup blocked. Please allow popups for print preview.");
    return;
  }
  const metaRows = Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== "");
  win.document.write(`<!doctype html>
    <html>
      <head>
        <title>${safe(title)}</title>
        <style>
          *{box-sizing:border-box}
          body{margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif}
          .actions{padding:10px 14px;background:#f3f4f6;border-bottom:1px solid #bbb}
          .actions button{margin-right:8px;padding:7px 14px;border:1px solid #111;background:#fff;color:#000;cursor:pointer}
          .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm;background:#fff}
          .header{position:relative;text-align:center;border-bottom:2px solid #111;padding:0 90px 9px;margin-bottom:10px;min-height:70px}
          .logo{position:absolute;left:0;top:0;max-width:75px;max-height:68px;object-fit:contain}
          h1{font-size:20px;line-height:1.2;margin:0 0 4px;font-weight:900}
          h2{font-size:16px;margin:8px 0 0;text-transform:uppercase;letter-spacing:.35px}
          .inst-line{font-size:11.5px;line-height:1.35}
          .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 12px;font-size:10.5px}
          .meta div{border:1px solid #111;padding:5px;min-height:34px}
          .meta strong{display:block;font-size:10px;text-transform:uppercase}
          .section-title{font-size:13px;font-weight:900;margin:12px 0 5px}
          table{width:100%;border-collapse:collapse;font-size:9.2px;line-height:1.25;margin-bottom:12px}
          th,td{border:1px solid #111;padding:4px 4px;vertical-align:top;text-align:left;word-break:break-word}
          th{background:#eee;font-weight:800}
          thead{display:table-header-group}
          tr{break-inside:avoid;page-break-inside:avoid}
          .summary{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px;font-size:10.5px}
          .summary span{border:1px solid #111;padding:5px 8px}
          .signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px;font-size:11px;text-align:center}
          .sig{padding-top:30px;border-top:1px solid #111}
          @page{size:A4 portrait;margin:8mm}
          @media print{
            .actions{display:none}
            .page{width:auto;min-height:auto;margin:0;padding:0}
          }
        </style>
      </head>
      <body>
        <div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
        <div class="page">
          <div class="header">
            ${inst.logo ? `<img class="logo" src="${safe(inst.logo)}" alt="Logo" />` : ""}
            <h1>${safe(inst.name)}</h1>
            <div class="inst-line">${safe(inst.address)}</div>
            <div class="inst-line">${safe([inst.phone, inst.email, inst.website].filter(Boolean).join(" | "))}</div>
            <h2>${safe(title)}</h2>
          </div>
          ${metaRows.length ? `<div class="meta">${metaRows.map(([key, value]) => `<div><strong>${safe(key)}</strong>${safe(value)}</div>`).join("")}</div>` : ""}
          ${sections.map((section) => `
            <div class="section-title">${safe(section.title)}</div>
            ${section.summary?.length ? `<div class="summary">${section.summary.map((item) => `<span>${safe(item.label)}: <b>${safe(item.value)}</b></span>`).join("")}</div>` : ""}
            ${tableHtml(section.rows || [], section.columns || [])}
          `).join("")}
          <div class="signatures">
            <div class="sig">Prepared By</div>
            <div class="sig">Checked By</div>
            <div class="sig">Controller of Examinations</div>
            <div class="sig">Principal / Director</div>
          </div>
        </div>
      </body>
    </html>`);
  win.document.close();
  win.focus();
};

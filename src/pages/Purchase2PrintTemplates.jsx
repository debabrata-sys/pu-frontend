import React from "react";
import * as ReactDOMServer from "react-dom/server";
import global1 from "./global1";

const value = (input, fallback = "-") => {
  if (input === 0) return "0";
  if (input === false) return "No";
  return input === undefined || input === null || String(input).trim() === "" ? fallback : String(input);
};

const pick = (source = {}, fields = [], fallback = "-") => {
  for (const field of fields) {
    if (source[field] !== undefined && source[field] !== null && String(source[field]).trim() !== "") return source[field];
  }
  return fallback;
};

const formatDate = (input) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return value(input);
  return date.toLocaleDateString("en-IN");
};

const formatDateTime = (input) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return value(input);
  return date.toLocaleString("en-IN");
};

const formatQty = (input) => {
  const number = Number(input);
  if (Number.isNaN(number)) return value(input);
  return number.toLocaleString("en-IN", { maximumFractionDigits: 3 });
};

const formatCurrency = (input) => {
  const number = Number(input || 0);
  return number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const amountInWords = (amount) => {
  const number = Math.round(Number(amount || 0));
  if (!number) return "Zero only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n) => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  const three = (n) => `${n > 99 ? `${ones[Math.floor(n / 100)]} Hundred ` : ""}${n % 100 ? two(n % 100) : ""}`.trim();
  const parts = [];
  let n = number;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${three(lakh)} Lakh`);
  if (thousand) parts.push(`${three(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return `${parts.join(" ")} only`;
};

const defaultInstitution = (config = {}) => ({
  institutionname: config.institutionname || config.nameofinstitution || global1.insname || global1.collegename || global1.institution || "Institution",
  address: config.address || config.address1 || global1.address || "",
  phone: config.phone || config.mobile || config.contact || config.contactusdetails || global1.phone || "",
  email: config.email || config.emailid || global1.email || "",
  gst: config.gst || config.gstin || "",
  website: config.website || "",
  logolink: config.logolink || config.logo || global1.logo || ""
});

const getTotal = (items = []) => items.reduce((sum, item) => sum + Number(pick(item, ["total", "amount", "estimatedtotal"], 0) || 0), 0);
const getTax = (items = []) => items.reduce((sum, item) => sum + Number(pick(item, ["tax", "taxamount", "gstamount"], 0) || 0), 0);
const getDiscount = (items = []) => items.reduce((sum, item) => sum + Number(pick(item, ["discount", "discountamount"], 0) || 0), 0);

function Header({ title, institution }) {
  const inst = defaultInstitution(institution);
  return (
    <header className="doc-header">
      {inst.logolink && <img className="doc-logo" src={inst.logolink} alt="Institution logo" />}
      <div className="doc-inst">
        <div className="doc-inst-name">{inst.institutionname}</div>
        {inst.address && <div>{inst.address}</div>}
        <div className="doc-meta-line">
          {[inst.phone && `Phone: ${inst.phone}`, inst.email && `Email: ${inst.email}`, inst.gst && `GST: ${inst.gst}`, inst.website && `Website: ${inst.website}`].filter(Boolean).join(" | ")}
        </div>
      </div>
      <h1>{title}</h1>
    </header>
  );
}

function InfoGrid({ items }) {
  return (
    <section className="info-grid">
      {items.filter((item) => item.value !== undefined).map((item) => (
        <div className="info-item" key={item.label}>
          <span>{item.label}</span>
          <strong>{value(item.value)}</strong>
        </div>
      ))}
    </section>
  );
}

function Table({ columns, rows }) {
  return (
    <table className="item-table">
      <thead>
        <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {(rows || []).length ? rows.map((row, index) => (
          <tr key={row._id || `${index}-${row.itemcode || row.itemname}`}>
            {columns.map((column) => <td key={column.key}>{column.render ? column.render(row, index) : value(row[column.key])}</td>)}
          </tr>
        )) : (
          <tr><td colSpan={columns.length} className="empty-row">No items available</td></tr>
        )}
      </tbody>
    </table>
  );
}

function Remarks({ children }) {
  return <section className="remarks"><strong>Remarks / Terms</strong><div>{value(children, "")}</div></section>;
}

function Signatures({ labels }) {
  return (
    <section className="signatures">
      {labels.map((entry) => {
        const label = typeof entry === "string" ? entry : entry.label;
        const image = typeof entry === "string" ? "" : entry.image;
        const name = typeof entry === "string" ? "" : entry.name;
        return (
        <div className="signature" key={`${label}-${name || ""}`}>
          {image ? <img src={image} alt={label} /> : <div />}
          {name && <span>{name}</span>}
          <strong>{label}</strong>
        </div>
      );})}
    </section>
  );
}

function Totals({ items, header = {} }) {
  const hasHeaderAmount = header.amount !== undefined || header.price !== undefined;
  const subtotal = hasHeaderAmount ? Number(pick(header, ["amount", "price"], 0) || 0) : getTotal(items);
  const tax = header.gst !== undefined && header.gst !== "" ? subtotal * (Number(header.gst || 0) / 100) : getTax(items);
  const discount = header.discount !== undefined && header.discount !== "" ? Number(header.discount || 0) : getDiscount(items);
  const grand = header.actualAmount !== undefined || header.netprice !== undefined ? Number(pick(header, ["actualAmount", "netprice"], 0) || 0) : subtotal + tax - discount;
  return (
    <section className="totals">
      <div className="amount-words"><strong>Amount in Words:</strong><br />{amountInWords(grand)}</div>
      <table>
        <tbody>
          <tr><td>Sub Total</td><td>{formatCurrency(subtotal)}</td></tr>
          <tr><td>Total Tax</td><td>{formatCurrency(tax)}</td></tr>
          <tr><td>Discount</td><td>{formatCurrency(discount)}</td></tr>
          <tr><th>Grand Total</th><th>{formatCurrency(grand)}</th></tr>
        </tbody>
      </table>
    </section>
  );
}

export function Purchase2IndentPrint({ header = {}, items = [], institution = {} }) {
  return (
    <PrintShell>
      <Header title="MATERIAL INDENT / INDENT REQUEST" institution={institution} />
      <InfoGrid items={[
        { label: "Indent No", value: pick(header, ["indentNumber", "indentno", "requestno", "reqid", "_id"]) },
        { label: "Date", value: formatDate(pick(header, ["reqdate", "requestdate", "createdAt"])) },
        { label: "Department", value: pick(header, ["departmentname", "department"]) },
        { label: "Requested By", value: pick(header, ["faculty", "requestedby", "name"]) },
        { label: "User ID", value: pick(header, ["facultyid", "requestedbyemail", "user"]) },
        { label: "Store", value: pick(header, ["storename", "store"]) },
        { label: "Approval Type", value: pick(header, ["approvalOption", "approvaltype"]) },
        { label: "Status", value: pick(header, ["reqstatus", "status"]) }
      ]} />
      <Table columns={[
        { key: "sr", label: "Sr No", render: (_, i) => i + 1 },
        { key: "itemcode", label: "Item Code" },
        { key: "itemname", label: "Item Name" },
        { key: "category", label: "Category/Type", render: (row) => [row.category, row.type || row.itemtype].filter(Boolean).join(" / ") },
        { key: "unit", label: "Unit" },
        { key: "quantity", label: "Requested Qty", render: (row) => formatQty(row.quantity) },
        { key: "issuedquantity", label: "Approved/Issued Qty", render: (row) => formatQty(pick(row, ["issuedquantity", "approvedquantity"], "")) },
        { key: "remarks", label: "Remarks" }
      ]} rows={items} />
      <Remarks>{pick(header, ["remarks", "comment", "comments", "note", "description"], "")}</Remarks>
      <Signatures labels={[
        { label: "Requester Signature", name: pick(header, ["requestedby", "faculty", "name"], ""), image: pick(header, ["requestersignature", "creatorSignature"], "") },
        { label: "HOD/HOI Approval", name: pick(header, ["approvedby", "hoiapprovername", "approvername"], ""), image: pick(header, ["approversignature"], "") },
        { label: "Store In-charge", name: pick(header, ["allottedby"], ""), image: pick(header, ["storesignature"], "") }
      ]} />
    </PrintShell>
  );
}

export function Purchase2PrPrint({ header = {}, items = [], institution = {} }) {
  return (
    <PrintShell>
      <Header title="PURCHASE REQUISITION" institution={institution} />
      <InfoGrid items={[
        { label: "PR No", value: pick(header, ["prnumber", "prno", "requestno"]) },
        { label: "PR Date", value: formatDateTime(pick(header, ["reqdate", "requestdate", "createdAt"])) },
        { label: "Store", value: pick(header, ["storename", "store"]) },
        { label: "Department", value: pick(header, ["departmentname", "department"]) },
        { label: "Requested By", value: pick(header, ["requestedby", "name"]) },
        { label: "User Email", value: pick(header, ["requestedbyemail", "user"]) },
        { label: "Status", value: pick(header, ["reqstatus", "status"]) }
      ]} />
      <Table columns={[
        { key: "sr", label: "Sr No", render: (_, i) => i + 1 },
        { key: "itemcode", label: "Item Code" },
        { key: "itemname", label: "Item Name" },
        { key: "category", label: "Category" },
        { key: "itemtype", label: "Type", render: (row) => value(row.itemtype || row.type) },
        { key: "unit", label: "Unit" },
        { key: "quantity", label: "Quantity", render: (row) => formatQty(row.quantity) },
        { key: "estimatedprice", label: "Approx Rate", render: (row) => formatCurrency(row.estimatedprice) },
        { key: "estimatedtotal", label: "Approx Amount", render: (row) => formatCurrency(row.estimatedtotal || Number(row.estimatedprice || 0) * Number(row.quantity || 0)) },
        { key: "budgethead", label: "Budget Head" },
        { key: "remarks", label: "Remarks" }
      ]} rows={items} />
      <Remarks>{pick(header, ["remarks", "comment", "comments", "note", "description"], "")}</Remarks>
      <Signatures labels={["Store In-charge", "Purchase Cell", "Approval Authority"]} />
    </PrintShell>
  );
}

function PoLikePrint({ header = {}, items = [], institution = {}, title, omitChecked = false }) {
  return (
    <PrintShell landscape={items.length > 6}>
      <Header title={title} institution={institution} />
      <section className="boxed">
        <strong>To,</strong>
        <div className="vendor-block">
          <strong>{pick(header, ["vendor", "vendorname", "vendorName"])}</strong>
          <div>{pick(header, ["vendoraddress", "address"], "")}</div>
          <div>{pick(header, ["vendorcontact", "mobileno", "phone"], "")}</div>
          <div>GST/PAN: {pick(header, ["vendorgst", "gst", "pan"], "-")}</div>
        </div>
      </section>
      <InfoGrid items={[
        { label: "PO No", value: pick(header, ["poid", "pono", "localpono"]) },
        { label: "PO Date", value: formatDateTime(pick(header, ["podate", "updatedate", "createdAt"])) },
        { label: "PR No", value: pick(header, ["prnumber", "prno"], "") },
        { label: "Store", value: pick(header, ["storename", "store"]) },
        { label: "Department", value: pick(header, ["departmentname", "department"]) },
        { label: "Delivery Location", value: pick(header, ["deliverylocation", "deliveryLocation", "storename"]) },
        { label: "Payment Terms", value: pick(header, ["paymentterms", "paymentTerms", "payterm"]) },
        { label: "Delivery Schedule", value: pick(header, ["deliveryschedule", "deliveryType", "deliveryType"]) },
        { label: "Status", value: pick(header, ["postatus", "approvalStatus", "status"]) }
      ]} />
      <p><strong>Subject:</strong> Supply of Material</p>
      <p>Dear Sir/Madam,<br />We are pleased to place the order for the following material.</p>
      <Table columns={[
        { key: "sr", label: "Sr No", render: (_, i) => i + 1 },
        { key: "itemcode", label: "Item Code" },
        { key: "itemname", label: "Item Name" },
        { key: "description", label: "Description/Specification", render: (row) => pick(row, ["description", "specification", "itemname"]) },
        { key: "unit", label: "Unit" },
        { key: "quantity", label: "Quantity", render: (row) => formatQty(row.quantity) },
        { key: "price", label: "Rate", render: (row) => formatCurrency(pick(row, ["price", "rate", "estimatedprice"], 0)) },
        { key: "discount", label: "Discount", render: (row) => formatCurrency(row.discount) },
        { key: "gst", label: "Tax/GST", render: (row) => value(row.gst || row.tax || row.taxamount) },
        { key: "total", label: "Amount", render: (row) => formatCurrency(row.total || Number(pick(row, ["price", "rate", "estimatedprice"], 0)) * Number(row.quantity || 0)) }
      ]} rows={items} />
      <Totals items={items} header={header} />
      <Remarks>{pick(header, ["remarks", "terms", "generalterms", "paymentterms", "description"], "No additional terms.")}</Remarks>
      <Signatures labels={[
        { label: "Prepared By", name: pick(header, ["creatorName", "preparedby"], ""), image: pick(header, ["creatorSignature"], "") },
        ...((header.approvalhistory || []).map((item) => ({ label: `Approved L${item.level || ""}`, name: item.approvername, image: item.signaturelink }))),
        ...(omitChecked ? [] : ["Checked By"]),
        "Vendor Acceptance"
      ]} />
    </PrintShell>
  );
}

export function Purchase2PoPrint(props) {
  return <PoLikePrint {...props} title="PURCHASE ORDER" />;
}

export function Purchase2LocalPoPrint(props) {
  return <PoLikePrint {...props} title="LOCAL PURCHASE ORDER" omitChecked />;
}

export function Purchase2GatePassPrint({ header = {}, items = [], institution = {} }) {
  return (
    <PrintShell>
      <Header title="GATE PASS" institution={institution} />
      <InfoGrid items={[
        { label: "Gate Pass No", value: pick(header, ["gatepassno", "gatePassNumber"]) },
        { label: "Gate Pass Date", value: formatDateTime(pick(header, ["receiveddate", "gatepassdate", "createdAt"])) },
        { label: "PO No", value: pick(header, ["poid"]) },
        { label: "Vendor Name", value: pick(header, ["vendorname", "vendor"]) },
        { label: "Store", value: pick(header, ["storename", "store"]) },
        { label: "Department", value: pick(header, ["departmentname", "department"]) },
        { label: "Vehicle No", value: pick(header, ["vehicle", "vehicleno"]) },
        { label: "Driver Name", value: pick(header, ["drivername"], "") },
        { label: "Driver Contact", value: pick(header, ["drivercontact"], "") },
        { label: "DC/Invoice No", value: pick(header, ["invoiceno", "challanno", "dcInvoiceNo"]) },
        { label: "Gate Pass Type", value: pick(header, ["direction", "gatepasstype", "type"], "Inward") },
        { label: "Source Type", value: pick(header, ["sourcetype"], "") },
        { label: "Remark Type", value: pick(header, ["remarktype"], "") },
        { label: "Status", value: pick(header, ["status"]) }
      ]} />
      <Table columns={[
        { key: "sr", label: "Sr No", render: (_, i) => i + 1 },
        { key: "itemcode", label: "Item Code" },
        { key: "itemname", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "orderedquantity", label: "PO Qty", render: (row) => formatQty(row.orderedquantity || row.quantity) },
        { key: "receivedquantity", label: "Gate Pass Qty", render: (row) => formatQty(row.receivedquantity || row.gatepassquantity || row.quantity) },
        { key: "package", label: "Package/Box" },
        { key: "remarks", label: "Remarks" }
      ]} rows={items} />
      {pick(header, ["attachmentlink"], "") && <Remarks>Attachment: {pick(header, ["attachmentlink"], "")}</Remarks>}
      <Remarks>{pick(header, ["remarks", "comment", "comments", "note"], "")}</Remarks>
      <Signatures labels={["Security Signature", "Store In-charge", "Receiver Signature"]} />
    </PrintShell>
  );
}

export function Purchase2QualityCheckPrint({ header = {}, items = [], institution = {} }) {
  return (
    <PrintShell landscape={items.length > 6}>
      <Header title="QUALITY CHECK REPORT" institution={institution} />
      <InfoGrid items={[
        { label: "QC No", value: pick(header, ["qcno"]) },
        { label: "QC Date", value: formatDateTime(pick(header, ["checkdate", "createdAt"])) },
        { label: "Gate Pass No", value: pick(header, ["gatepassno"]) },
        { label: "PO No", value: pick(header, ["poid"]) },
        { label: "Vendor Name", value: pick(header, ["vendorname", "vendor"]) },
        { label: "Store", value: pick(header, ["storename", "store"]) },
        { label: "Checked By", value: pick(header, ["checkedby", "name"]) },
        { label: "Inspection Date", value: formatDate(pick(header, ["inspectiondate", "checkdate"])) },
        { label: "Bill No", value: pick(header, ["billno"], "") },
        { label: "Bill Date", value: formatDate(pick(header, ["billdate"], "")) },
        { label: "Challan No", value: pick(header, ["challanno"], "") },
        { label: "Challan Date", value: formatDate(pick(header, ["challandate"], "")) },
        { label: "Return Category", value: pick(header, ["returncategory"], "") },
        { label: "Status", value: pick(header, ["status"]) }
      ]} />
      <Table columns={[
        { key: "sr", label: "Sr No", render: (_, i) => i + 1 },
        { key: "itemcode", label: "Item Code" },
        { key: "itemname", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "orderedquantity", label: "PO Qty", render: (row) => formatQty(row.orderedquantity || row.poquantity || row.quantity) },
        { key: "receivedquantity", label: "Gate Pass Qty", render: (row) => formatQty(row.gatepassquantity || row.receivedquantity) },
        { key: "approvedquantity", label: "Approved Qty", render: (row) => formatQty(row.approvedquantity) },
        { key: "rejectedquantity", label: "Rejected Qty", render: (row) => formatQty(row.rejectedquantity) },
        { key: "returnedquantity", label: "Returned Qty", render: (row) => formatQty(row.returnedquantity) },
        { key: "status", label: "QC Status" },
        { key: "remarks", label: "Remarks" }
      ]} rows={items} />
      {pick(header, ["attachmentlink"], "") && <Remarks>Attachment: {pick(header, ["attachmentlink"], "")}</Remarks>}
      <Remarks>{pick(header, ["remarks", "reason", "comment", "comments", "note"], "")}</Remarks>
      <Signatures labels={["QC Done By", "Store In-charge", "Approval Authority"]} />
    </PrintShell>
  );
}

export function Purchase2GrnPrint({ header = {}, items = [], institution = {} }) {
  return (
    <PrintShell landscape={items.length > 6}>
      <Header title="GOODS RECEIPT NOTE / GRN" institution={institution} />
      <InfoGrid items={[
        { label: "GRN No", value: pick(header, ["grnNo", "grnno"]) },
        { label: "GRN Date", value: formatDateTime(pick(header, ["grnDate", "grndate", "createdAt"])) },
        { label: "PO No", value: pick(header, ["poid"]) },
        { label: "PO Date", value: formatDate(pick(header, ["podate"], "")) },
        { label: "Vendor Name", value: pick(header, ["vendorName", "vendorname", "vendor"]) },
        { label: "Vendor Invoice/DC No", value: pick(header, ["dcInvoiceNo", "invoiceno", "challanno"]) },
        { label: "Gate Pass No", value: pick(header, ["gatePassNumber", "gatepassno"]) },
        { label: "QC No", value: pick(header, ["qcno", "remarks"], "") },
        { label: "Store", value: pick(header, ["storeName", "storename", "store"]) },
        { label: "Received By", value: pick(header, ["receivedBy", "receivedby", "name"]) },
        { label: "Status", value: pick(header, ["status"]) }
      ]} />
      <Table columns={[
        { key: "sr", label: "Sr No", render: (_, i) => i + 1 },
        { key: "itemcode", label: "Item Code" },
        { key: "itemname", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "quantity", label: "PO Qty", render: (row) => formatQty(row.quantity || row.orderedquantity) },
        { key: "receivedquantity", label: "Received Qty", render: (row) => formatQty(row.receivedquantity || row.acceptedquantity) },
        { key: "acceptedquantity", label: "Accepted Qty", render: (row) => formatQty(row.acceptedquantity || row.approvedquantity) },
        { key: "rejectedquantity", label: "Rejected Qty", render: (row) => formatQty(row.rejectedquantity) },
        { key: "rate", label: "Rate", render: (row) => formatCurrency(row.rate || row.price) },
        { key: "total", label: "Amount", render: (row) => formatCurrency(row.total) },
        { key: "remarks", label: "Remarks" }
      ]} rows={items} />
      <Remarks>{pick(header, ["remarks"], "")}</Remarks>
      <Signatures labels={["Received By", "Store In-charge", "Accounts/Purchase Verification", "Authorized Signature"]} />
    </PrintShell>
  );
}

function PrintShell({ children, landscape = false }) {
  return <main className={`print-sheet ${landscape ? "landscape" : ""}`}>{children}</main>;
}

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f4f6; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .screen-actions { max-width: 1120px; margin: 16px auto 0; display: flex; gap: 8px; justify-content: flex-end; }
  .screen-actions button { border: 1px solid #111; background: #fff; color: #000; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 700; }
  .print-sheet { width: 210mm; min-height: 297mm; margin: 14px auto; padding: 14mm; background: #fff; color: #000; box-shadow: 0 8px 24px rgba(15,23,42,.14); }
  .print-sheet.landscape { width: 297mm; min-height: 210mm; }
  .doc-header { text-align: center; border: 1.5px solid #000; padding: 10px 14px; margin-bottom: 10px; position: relative; }
  .doc-logo { position: absolute; left: 14px; top: 10px; width: 64px; height: 64px; object-fit: contain; }
  .doc-inst { padding: 0 70px; min-height: 38px; }
  .doc-inst-name { font-size: 22px; font-weight: 900; line-height: 1.1; }
  .doc-meta-line { font-size: 11px; margin-top: 2px; }
  h1 { font-size: 18px; text-decoration: underline; margin: 10px 0 0; letter-spacing: .02em; }
  .info-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid #000; border-bottom: 0; margin: 10px 0; }
  .info-item { min-height: 38px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 7px; font-size: 11px; }
  .info-item:nth-child(4n) { border-right: 0; }
  .info-item span { display: block; font-weight: 700; margin-bottom: 2px; }
  .info-item strong { font-size: 12px; overflow-wrap: anywhere; }
  .boxed { border: 1px solid #000; padding: 12px; margin: 10px 0; min-height: 86px; }
  .vendor-block { margin: 8px 0 0 36px; line-height: 1.28; }
  p { margin: 8px 0; font-size: 12px; }
  .item-table { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: fixed; }
  .item-table th, .item-table td { border: 1px solid #000; padding: 6px 7px; font-size: 11px; vertical-align: top; overflow-wrap: anywhere; color: #000; }
  .item-table th { font-size: 11px; font-weight: 900; background: #fff; text-align: left; }
  .empty-row { text-align: center; height: 42px; }
  .totals { display: grid; grid-template-columns: 1.35fr .85fr; border: 1px solid #000; border-top: 0; margin-top: -10px; }
  .amount-words { padding: 10px; font-size: 12px; border-right: 1px solid #000; min-height: 76px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals td, .totals th { border-bottom: 1px solid #000; padding: 5px 8px; font-size: 12px; text-align: right; }
  .totals tr:last-child td, .totals tr:last-child th { border-bottom: 0; }
  .totals td:first-child, .totals th:first-child { text-align: left; }
  .remarks { border: 1px solid #000; min-height: 54px; padding: 8px; margin: 12px 0; font-size: 12px; white-space: pre-wrap; }
  .remarks strong { text-decoration: underline; display: block; margin-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; margin-top: 34px; page-break-inside: avoid; }
	  .signature div { border-top: 1px solid #000; height: 1px; margin-bottom: 6px; }
	  .signature img { max-width: 120px; max-height: 42px; object-fit: contain; display: block; margin-bottom: 4px; }
	  .signature span { display: block; font-size: 11px; margin-bottom: 2px; }
  .signature strong { font-size: 12px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  @page { size: A4 portrait; margin: 10mm; }
  .print-sheet.landscape { page: landscape; }
  @page landscape { size: A4 landscape; margin: 10mm; }
  @media print {
    body { background: #fff; }
    .screen-actions { display: none !important; }
    .print-sheet, .print-sheet.landscape { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
  }
`;

const templates = {
  indent: Purchase2IndentPrint,
  pr: Purchase2PrPrint,
  po: Purchase2PoPrint,
  localPo: Purchase2LocalPoPrint,
  gatePass: Purchase2GatePassPrint,
  qualityCheck: Purchase2QualityCheckPrint,
  grn: Purchase2GrnPrint
};

export function openPurchase2PrintWindow(type, props = {}) {
  const Template = templates[type];
  if (!Template) return;
  const html = ReactDOMServer.renderToStaticMarkup(<Template {...props} />);
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${value(props.title || type)} Print</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="screen-actions">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
        ${html}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
}

export const purchase2PrintUtils = {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatQty,
  value,
  pick
};

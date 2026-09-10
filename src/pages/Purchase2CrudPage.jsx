import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Add, ArrowBack, Delete, Download, Edit, Refresh, Save, Search, UploadFile } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import ep1 from "../api/ep1";
import global1 from "./global1";
import PlacementCoordinatorShell from "./PlacementCoordinatorShell";

const commonFields = [
  { field: "name", label: "Name", required: true },
  { field: "user", label: "User", required: true }
];

const configs = {
  departmentindentds: {
    title: "Department indent",
    fields: [
      { field: "departmentname", label: "Department", required: true },
      { field: "creatorname", label: "Creator Name" },
      { field: "creatoruserid", label: "Creator User ID" },
      { field: "hoiapprovername", label: "HOI Approver Name" },
      { field: "hoiapproveruserid", label: "HOI Approver User ID" },
      { field: "ahoiapprovername", label: "Assistant HOI Approver Name" },
      { field: "ahoiapproveruserid", label: "Assistant HOI Approver User ID" },
      { field: "institution", label: "Institution" },
      { field: "institutionshort", label: "Institution Short" },
      { field: "isfrozen", label: "Is Frozen" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  itemunitds2: {
    title: "Item unit",
    fields: [
      { field: "unitname", label: "Unit Name", required: true },
      { field: "unitcode", label: "Unit Code", required: true },
      { field: "description", label: "Description" },
      { field: "status", label: "Status", required: true }
    ]
  },
  itemtypeds2: {
    title: "Item type",
    fields: [
      { field: "itemtype", label: "Item Type", required: true },
      { field: "description", label: "Description" },
      { field: "status", label: "Status", required: true }
    ]
  },
  itemcategoryds2: {
    title: "Item category",
    fields: [
      { field: "categoryname", label: "Category", required: true },
      { field: "description", label: "Description" },
      { field: "status", label: "Status", required: true }
    ]
  },
  itemmasterds2: {
    title: "Item master",
    fields: [
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "category", label: "Category" },
      { field: "itemtype", label: "Type" },
      { field: "unit", label: "Unit" },
      { field: "description", label: "Description" },
      { field: "approxprice", label: "Approx Price", type: "number" },
      { field: "status", label: "Status" }
    ]
  },
  storecashaccountds2: {
    title: "Store cash account",
    fields: [
      { field: "storeid", label: "Store ID", required: true },
      { field: "storeName", label: "Store Name", required: true },
      { field: "approvalThreshold", label: "Approval Threshold", type: "number" },
      { field: "balance", label: "Balance", type: "number" },
      { field: "allocatedBy", label: "Allocated By", required: true },
      { field: "lastRefillDate", label: "Last Refill Date", type: "date" },
      { field: "transactions", label: "Transactions JSON", type: "json" }
    ]
  },
  storeitemds2: {
    title: "Store items",
    fields: [
      ...commonFields,
      { field: "storeid", label: "Store ID" },
      { field: "storename", label: "Store Name" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "type", label: "Type" },
      { field: "status", label: "Status" },
      { field: "category", label: "Category" },
      { field: "unit", label: "Unit" }
    ]
  },
  storeitemsds2: {
    title: "Store items",
    fields: [
      ...commonFields,
      { field: "storeid", label: "Store ID" },
      { field: "storename", label: "Store Name" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "type", label: "Type" },
      { field: "status", label: "Status" },
      { field: "category", label: "Category" },
      { field: "unit", label: "Unit" }
    ]
  },
  storemasterds2: {
    title: "Store master",
    fields: [
      ...commonFields,
      { field: "storename", label: "Store Name" },
      { field: "location", label: "Location" },
      { field: "phone", label: "Phone" },
      { field: "storemanager", label: "Store Manager" }
    ]
  },
  storepoapprovalds2: {
    title: "Store PO approval",
    fields: [
      { field: "poid", label: "PO ID", required: true },
      { field: "stepNumber", label: "Step Number", type: "number", required: true },
      { field: "approverEmail", label: "Approver Email", required: true },
      { field: "action", label: "Action" },
      { field: "actionDate", label: "Action Date", type: "date" },
      { field: "user", label: "User" }
    ]
  },
  storepoitemsds2: {
    title: "Store PO items",
    fields: [
      ...commonFields,
      { field: "year", label: "Year" },
      { field: "poid", label: "PO ID" },
      { field: "vendor", label: "Vendor" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "price", label: "Price", type: "number" },
      { field: "description", label: "Description" },
      { field: "reqdate", label: "Req Date", type: "date" },
      { field: "postatus", label: "PO Status" },
      { field: "itemid", label: "Item ID" },
      { field: "itemname", label: "Item Name" },
      { field: "storeid", label: "Store ID" },
      { field: "storename", label: "Store Name" },
      { field: "category", label: "Category" },
      { field: "itemtype", label: "Item Type" },
      { field: "unit", label: "Unit" },
      { field: "gst", label: "GST", type: "number" },
      { field: "sgst", label: "SGST", type: "number" },
      { field: "cgst", label: "CGST", type: "number" },
      { field: "igst", label: "IGST", type: "number" },
      { field: "total", label: "Total", type: "number" },
      { field: "unitPriceWithTax", label: "Unit Price With Tax", type: "number" },
      { field: "departmentname", label: "Department" },
      { field: "status1", label: "Status 1" },
      { field: "comments", label: "Comments" },
      { field: "storereqid", label: "Store Req ID" },
      { field: "gateReceivedQuantity", label: "Gate Received Qty", type: "number" },
      { field: "acceptedQuantity", label: "Accepted Qty", type: "number" },
      { field: "rejectedQuantity", label: "Rejected Qty", type: "number" }
    ]
  },
  storepoorderds2: {
    title: "Store PO order",
    fields: [
      ...commonFields,
      { field: "year", label: "Year" },
      { field: "vendor", label: "Vendor" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "poid", label: "PO ID" },
      { field: "storeid", label: "Store ID" },
      { field: "storename", label: "Store Name" },
      { field: "price", label: "Price", type: "number" },
      { field: "description", label: "Description" },
      { field: "returnamount", label: "Return Amount", type: "number" },
      { field: "netprice", label: "Net Price", type: "number" },
      { field: "updatedate", label: "Update Date", type: "date" },
      { field: "currentStep", label: "Current Step", type: "number" },
      { field: "approvalStatus", label: "Approval Status" },
      { field: "doclink", label: "Doc Link" },
      { field: "creatorName", label: "Creator Name" },
      { field: "postatus", label: "PO Status" },
      { field: "deliveryType", label: "Delivery Type" },
      { field: "poType", label: "PO Type" },
      { field: "approxAmount", label: "Approx Amount", type: "number" },
      { field: "actualAmount", label: "Actual Amount", type: "number" },
      { field: "localOrderType", label: "Local Order Type" },
      { field: "departmentname", label: "Department" }
    ]
  },
  storerequisationds2: {
    title: "Store requisition",
    fields: [
      ...commonFields,
      { field: "year", label: "Year" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "store", label: "Store" },
      { field: "storeid", label: "Store ID" },
      { field: "reqdate", label: "Req Date", type: "date" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "orderedQuantity", label: "Ordered Quantity", type: "number" },
      { field: "reqstatus", label: "Req Status" },
      { field: "poid", label: "PO ID" },
      { field: "prnumber", label: "PR Number" },
      { field: "assignedTo", label: "Assigned To" },
      { field: "assignedToName", label: "Assigned To Name" },
      { field: "unit", label: "Unit" },
      { field: "itemid", label: "Item ID" },
      { field: "category", label: "Category" },
      { field: "itemtype", label: "Item Type" },
      { field: "departmentname", label: "Department" },
      { field: "currentStep", label: "Current Step", type: "number" },
      { field: "approvalStatus", label: "Approval Status" },
      { field: "remarks", label: "Remarks" },
      { field: "make", label: "Make" },
      { field: "prRemarks", label: "PR Remarks" },
      { field: "holdreason", label: "Hold Reason" },
      { field: "rejectreason", label: "Reject Reason" }
    ]
  },
  storeuserds2: {
    title: "Store users",
    fields: [
      ...commonFields,
      { field: "storeuser", label: "Store User" },
      { field: "userid", label: "User ID" },
      { field: "storeid", label: "Store ID" },
      { field: "store", label: "Store" },
      { field: "level", label: "Level" }
    ]
  },
  storeusersds2: {
    title: "Store users",
    fields: [
      ...commonFields,
      { field: "storeuser", label: "Store User" },
      { field: "userid", label: "User ID" },
      { field: "storeid", label: "Store ID" },
      { field: "store", label: "Store" },
      { field: "level", label: "Level" }
    ]
  },
  storerequisitionds2: {
    title: "Store requisition",
    fields: [
      ...commonFields,
      { field: "year", label: "Year" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "store", label: "Store" },
      { field: "storeid", label: "Store ID" },
      { field: "reqdate", label: "Req Date", type: "date" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "orderedQuantity", label: "Ordered Quantity", type: "number" },
      { field: "reqstatus", label: "Req Status" },
      { field: "prnumber", label: "PR Number" },
      { field: "assignedTo", label: "Assigned To" },
      { field: "departmentname", label: "Department" },
      { field: "approvalStatus", label: "Approval Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storerequisitionitemsds2: {
    title: "Store requisition items",
    fields: [
      ...commonFields,
      { field: "requisitionid", label: "Requisition ID" },
      { field: "reqid", label: "Req ID" },
      { field: "itemid", label: "Item ID" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "category", label: "Category" },
      { field: "unit", label: "Unit" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "approvedquantity", label: "Approved Qty", type: "number" },
      { field: "issuedquantity", label: "Issued Qty", type: "number" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storeprrequestds2: {
    title: "Store PR request",
    fields: [
      ...commonFields,
      { field: "prnumber", label: "PR Number" },
      { field: "storeid", label: "Store ID" },
      { field: "storename", label: "Store Name" },
      { field: "departmentname", label: "Department" },
      { field: "requestdate", label: "Request Date", type: "date" },
      { field: "requestedby", label: "Requested By" },
      { field: "requestedbyemail", label: "Requested By Email" },
      { field: "priority", label: "Priority" },
      { field: "totalamount", label: "Total Amount", type: "number" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storeprrequestitemsds2: {
    title: "Store PR request items",
    fields: [
      ...commonFields,
      { field: "prnumber", label: "PR Number" },
      { field: "prrequestid", label: "PR Request ID" },
      { field: "itemid", label: "Item ID" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "category", label: "Category" },
      { field: "unit", label: "Unit" },
      { field: "quantity", label: "Quantity", type: "number" },
      { field: "estimatedprice", label: "Estimated Price", type: "number" },
      { field: "estimatedtotal", label: "Estimated Total", type: "number" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "vendorname", label: "Vendor Name" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storepoassignmentds2: {
    title: "Store PO assignment",
    fields: [
      ...commonFields,
      { field: "requestid", label: "Request ID" },
      { field: "prnumber", label: "PR Number" },
      { field: "assignedto", label: "Assigned To" },
      { field: "assignedtoemail", label: "Assigned To Email" },
      { field: "assignedby", label: "Assigned By" },
      { field: "assignedbyemail", label: "Assigned By Email" },
      { field: "assigneddate", label: "Assigned Date", type: "date" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  purchase2mailconfigds2: {
    title: "Purchase 2 mail configuration",
    fields: [
      { field: "eventname", label: "Event", required: true },
      { field: "managername", label: "Purchase Manager Name" },
      { field: "manageremail", label: "Purchase Manager Email", required: true },
      { field: "ccemail", label: "CC Email" },
      { field: "subjecttemplate", label: "Subject Template" },
      { field: "bodytemplate", label: "Body Template" },
      { field: "active", label: "Active Yes/No" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  vendords2: {
    title: "Vendors",
    fields: [
      ...commonFields,
      { field: "vendorname", label: "Vendor Name" },
      { field: "pan", label: "PAN" },
      { field: "gst", label: "GST" },
      { field: "address", label: "Address" },
      { field: "state", label: "State" },
      { field: "city", label: "City" },
      { field: "mobileno", label: "Mobile No" },
      { field: "email", label: "Email" },
      { field: "type", label: "Type" },
      { field: "payterm", label: "Pay Term" },
      { field: "doclink", label: "Doc Link" }
    ]
  },
  vendorsds2: {
    title: "Vendors",
    fields: [
      ...commonFields,
      { field: "vendorname", label: "Vendor Name" },
      { field: "pan", label: "PAN" },
      { field: "gst", label: "GST" },
      { field: "address", label: "Address" },
      { field: "state", label: "State" },
      { field: "city", label: "City" },
      { field: "mobileno", label: "Mobile No" },
      { field: "email", label: "Email" },
      { field: "type", label: "Type" },
      { field: "payterm", label: "Pay Term" },
      { field: "doclink", label: "Doc Link" }
    ]
  },
  vendoritemds2: {
    title: "Vendor items",
    fields: [
      ...commonFields,
      { field: "vendorname", label: "Vendor Name" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "itemid", label: "Item ID" },
      { field: "item", label: "Item" },
      { field: "price", label: "Price", type: "number" },
      { field: "discount", label: "Discount", type: "number" },
      { field: "status", label: "Status" },
      { field: "type", label: "Type" },
      { field: "unit", label: "Unit" },
      { field: "unitcode", label: "Unit Code" },
      { field: "gst", label: "GST", type: "number" },
      { field: "sgst", label: "SGST", type: "number" },
      { field: "cgst", label: "CGST", type: "number" },
      { field: "igst", label: "IGST", type: "number" },
      { field: "total", label: "Total", type: "number" },
      { field: "category", label: "Category" }
    ]
  },
  vendoritemsds2: {
    title: "Vendor items",
    fields: [
      ...commonFields,
      { field: "vendorname", label: "Vendor Name" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "itemid", label: "Item ID" },
      { field: "item", label: "Item" },
      { field: "price", label: "Price", type: "number" },
      { field: "discount", label: "Discount", type: "number" },
      { field: "status", label: "Status" },
      { field: "type", label: "Type" },
      { field: "unit", label: "Unit" },
      { field: "gst", label: "GST", type: "number" },
      { field: "total", label: "Total", type: "number" },
      { field: "category", label: "Category" }
    ]
  },
  vendorpayschds: {
    title: "Vendor payment schedule",
    fields: [
      ...commonFields,
      { field: "vendorname", label: "Vendor Name" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "isadvance", label: "Is Advance" },
      { field: "isdeliverylinked", label: "Is Delivery Linked" },
      { field: "deliverytype", label: "Delivery Type" },
      { field: "paymenttype", label: "Payment Type" },
      { field: "deliverydesc", label: "Delivery Description" },
      { field: "paymentdesc", label: "Payment Description" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  vendorpaymentscheduleds2: {
    title: "Vendor payment schedule",
    fields: [
      ...commonFields,
      { field: "vendorname", label: "Vendor Name" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "isadvance", label: "Is Advance" },
      { field: "isdeliverylinked", label: "Is Delivery Linked" },
      { field: "deliverytype", label: "Delivery Type" },
      { field: "paymenttype", label: "Payment Type" },
      { field: "deliverydesc", label: "Delivery Description" },
      { field: "paymentdesc", label: "Payment Description" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storegatepassds2: {
    title: "Store gate pass",
    fields: [
      ...commonFields,
      { field: "gatepassno", label: "Gate Pass No" },
      { field: "poid", label: "PO ID" },
      { field: "vendorid", label: "Vendor ID" },
      { field: "vendorname", label: "Vendor Name" },
      { field: "receiveddate", label: "Received Date", type: "date" },
      { field: "receivedby", label: "Received By" },
      { field: "vehicle", label: "Vehicle" },
      { field: "challanno", label: "Challan No" },
      { field: "invoiceno", label: "Invoice No" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storegatepassitemsds2: {
    title: "Store gate pass items",
    fields: [
      ...commonFields,
      { field: "gatepassno", label: "Gate Pass No" },
      { field: "poid", label: "PO ID" },
      { field: "itemid", label: "Item ID" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "orderedquantity", label: "Ordered Qty", type: "number" },
      { field: "receivedquantity", label: "Received Qty", type: "number" },
      { field: "unit", label: "Unit" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storequalitycheckds2: {
    title: "Store quality check",
    fields: [
      ...commonFields,
      { field: "qcno", label: "QC No" },
      { field: "gatepassno", label: "Gate Pass No" },
      { field: "grnno", label: "GRN No" },
      { field: "poid", label: "PO ID" },
      { field: "checkedby", label: "Checked By" },
      { field: "checkedbyemail", label: "Checked By Email" },
      { field: "checkdate", label: "Check Date", type: "date" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storequalitycheckitemsds2: {
    title: "Store quality check items",
    fields: [
      ...commonFields,
      { field: "qcno", label: "QC No" },
      { field: "itemid", label: "Item ID" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "receivedquantity", label: "Received Qty", type: "number" },
      { field: "approvedquantity", label: "Approved Qty", type: "number" },
      { field: "rejectedquantity", label: "Rejected Qty", type: "number" },
      { field: "returnedquantity", label: "Returned Qty", type: "number" },
      { field: "reason", label: "Reason" },
      { field: "status", label: "Status" }
    ]
  },
  grnds2: {
    title: "GRN",
    fields: [
      ...commonFields,
      { field: "grnNo", label: "GRN No" },
      { field: "gatePassNumber", label: "Gate Pass Number" },
      { field: "poid", label: "PO ID" },
      { field: "vendorName", label: "Vendor Name" },
      { field: "vendorAddress", label: "Vendor Address" },
      { field: "partyName", label: "Party Name" },
      { field: "storeId", label: "Store ID" },
      { field: "storeName", label: "Store Name" },
      { field: "receivedBy", label: "Received By" },
      { field: "grnDate", label: "GRN Date", type: "date" },
      { field: "dcInvoiceNo", label: "DC/Invoice No" },
      { field: "lrNo", label: "LR No" },
      { field: "vehicleNo", label: "Vehicle No" },
      { field: "billAmount", label: "Bill Amount", type: "number" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storegrnds2: {
    title: "Store GRN",
    fields: [
      ...commonFields,
      { field: "grnNo", label: "GRN No" },
      { field: "gatePassNumber", label: "Gate Pass Number" },
      { field: "poid", label: "PO ID" },
      { field: "vendorName", label: "Vendor Name" },
      { field: "vendorAddress", label: "Vendor Address" },
      { field: "partyName", label: "Party Name" },
      { field: "storeId", label: "Store ID" },
      { field: "storeName", label: "Store Name" },
      { field: "receivedBy", label: "Received By" },
      { field: "grnDate", label: "GRN Date", type: "date" },
      { field: "dcInvoiceNo", label: "DC/Invoice No" },
      { field: "lrNo", label: "LR No" },
      { field: "vehicleNo", label: "Vehicle No" },
      { field: "billAmount", label: "Bill Amount", type: "number" },
      { field: "status", label: "Status" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  grnitemsds2: {
    title: "GRN items",
    fields: [
      ...commonFields,
      { field: "grnno", label: "GRN No" },
      { field: "grnid", label: "GRN ID" },
      { field: "poid", label: "PO ID" },
      { field: "itemid", label: "Item ID" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "acceptedquantity", label: "Accepted Qty", type: "number" },
      { field: "rejectedquantity", label: "Rejected Qty", type: "number" },
      { field: "rate", label: "Rate", type: "number" },
      { field: "total", label: "Total", type: "number" },
      { field: "unit", label: "Unit" },
      { field: "remarks", label: "Remarks" }
    ]
  },
  storegrnitemsds2: {
    title: "Store GRN items",
    fields: [
      ...commonFields,
      { field: "grnno", label: "GRN No" },
      { field: "grnid", label: "GRN ID" },
      { field: "poid", label: "PO ID" },
      { field: "itemid", label: "Item ID" },
      { field: "itemcode", label: "Item Code" },
      { field: "itemname", label: "Item Name" },
      { field: "acceptedquantity", label: "Accepted Qty", type: "number" },
      { field: "rejectedquantity", label: "Rejected Qty", type: "number" },
      { field: "rate", label: "Rate", type: "number" },
      { field: "total", label: "Total", type: "number" },
      { field: "unit", label: "Unit" },
      { field: "remarks", label: "Remarks" }
    ]
  }
};

const systemColumns = ["_id", "__v", "id", "colid", "createdAt", "updatedAt"];
configs.departmentindentds2 = configs.departmentindentds;
const globalManagedModels = ["departmentindentds", "departmentindentds2", "itemunitds2", "itemmasterds2", "itemtypeds2", "itemcategoryds2"];

const formatDateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const makeEmptyForm = (fields) => fields.reduce((acc, field) => ({ ...acc, [field.field]: field.type === "number" ? "" : "" }), { id: "" });

const normaliseForForm = (row, fields) => {
  const form = { id: row._id || "" };
  fields.forEach((field) => {
    const value = row[field.field];
    if (field.type === "date") form[field.field] = formatDateForInput(value);
    else if (field.type === "json") form[field.field] = value ? JSON.stringify(value) : "";
    else form[field.field] = value ?? "";
  });
  return form;
};

const preparePayload = (form, fields, colid, currentName, currentUser) => {
  const payload = { id: form.id || undefined, colid, name: currentName || "NA", user: currentUser || "NA" };
  fields.forEach((field) => {
    let value = form[field.field];
    if (field.field === "name" && !value) value = currentName || "NA";
    if (field.field === "user" && !value) value = currentUser || "NA";
    if (field.type === "number") value = value === "" ? undefined : Number(value);
    if (field.type === "json") {
      try {
        value = value ? JSON.parse(value) : [];
      } catch (error) {
        value = [];
      }
    }
    payload[field.field] = value;
  });
  return payload;
};

export default function Purchase2CrudPage() {
  const { modelKey } = useParams();
  const navigate = useNavigate();
  const config = configs[modelKey] || configs.storemasterds2;
  const fields = config.fields;
  const colid = useMemo(() => global1.colid, []);
  const currentUser = useMemo(() => global1.user, []);
  const currentName = useMemo(() => global1.name || global1.user || "NA", []);
  const [form, setForm] = useState(makeEmptyForm(fields));
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState([]);
  const [filterDraft, setFilterDraft] = useState({ field: fields[0]?.field || "", value: "" });
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkEdit, setBulkEdit] = useState({ field: fields[0]?.field || "", value: "" });
  const [lookupUsers, setLookupUsers] = useState([]);
  const [lookupStores, setLookupStores] = useState([]);
  const [lookupItemTypes, setLookupItemTypes] = useState([]);
  const [lookupItemCategories, setLookupItemCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(makeEmptyForm(fields));
    setFilters([]);
    setFilterDraft({ field: fields[0]?.field || "", value: "" });
    setBulkEdit({ field: fields[0]?.field || "", value: "" });
    setSelectedRows([]);
  }, [modelKey]);

  const loadRows = async (overrideFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const res = await ep1.get(`/api/v2/purchase2/${modelKey}`, {
        params: { colid, filters: JSON.stringify(overrideFilters) }
      });
      setRows(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (colid && modelKey) loadRows([]);
  }, [colid, modelKey]);

  const isStoreUsers = ["storeuserds2", "storeusersds2"].includes(modelKey);
  const isGlobalManaged = globalManagedModels.includes(modelKey);

  useEffect(() => {
    if (!isStoreUsers && !["departmentindentds", "departmentindentds2"].includes(modelKey) && modelKey !== "itemmasterds2") return;
    const loadLookups = async () => {
      try {
        if (isStoreUsers) {
          const [usersRes, storesRes] = await Promise.all([
            ep1.get("/api/v2/hrattendance/options", { params: { colid } }),
            ep1.get("/api/v2/purchase2/storemasterds2", { params: { colid, filters: JSON.stringify([]) } })
          ]);
          setLookupUsers((usersRes.data?.users || []).filter((user) => String(user.role || "").toLowerCase() !== "student"));
          setLookupStores(storesRes.data?.data || []);
        } else {
          const requests = [ep1.get("/api/v2/hrattendance/options", { params: { colid } })];
          if (modelKey === "itemmasterds2") {
            requests.push(ep1.get("/api/v2/purchase2/itemtypeds2", { params: { colid, filters: JSON.stringify([]) } }));
            requests.push(ep1.get("/api/v2/purchase2/itemcategoryds2", { params: { colid, filters: JSON.stringify([]) } }));
          }
          const [usersRes, typesRes, categoriesRes] = await Promise.all(requests);
          setLookupUsers((usersRes.data?.users || []).filter((user) => String(user.role || "").toLowerCase() !== "student"));
          if (typesRes) setLookupItemTypes(typesRes.data?.data || []);
          if (categoriesRes) setLookupItemCategories(categoriesRes.data?.data || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Unable to load dropdown data");
      }
    };
    loadLookups();
  }, [colid, isStoreUsers, modelKey]);

  const saveRow = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (["itemmasterds2", "itemunitds2", "itemtypeds2", "itemcategoryds2", "departmentindentds", "departmentindentds2"].includes(modelKey)) {
        const requiredFields = modelKey === "itemmasterds2" ? ["itemname", "itemcode", "category", "itemtype", "unit", "status"] : modelKey === "itemunitds2" ? ["unitname", "unitcode", "status"] : modelKey === "itemtypeds2" ? ["itemtype", "status"] : modelKey === "itemcategoryds2" ? ["categoryname", "status"] : ["departmentname"];
        const missing = requiredFields.filter((field) => !String(form[field] || "").trim());
        if (missing.length) throw new Error(`Required fields missing: ${missing.join(", ")}`);
        const duplicateField = modelKey === "itemmasterds2" ? "itemcode"
          : modelKey === "itemunitds2" ? "unitcode"
            : modelKey === "itemtypeds2" ? "itemtype"
              : modelKey === "itemcategoryds2" ? "categoryname"
                : "departmentname";
        const duplicate = rows.find((row) => row._id !== form.id && String(row[duplicateField] || "").trim().toLowerCase() === String(form[duplicateField] || "").trim().toLowerCase());
        if (duplicate) throw new Error(modelKey === "itemmasterds2" ? "Duplicate item code is not allowed" : modelKey === "itemunitds2" ? "Duplicate unit code is not allowed" : modelKey === "itemtypeds2" ? "Duplicate item type is not allowed" : modelKey === "itemcategoryds2" ? "Duplicate item category is not allowed" : "Duplicate department name is not allowed");
      }
      await ep1.post(`/api/v2/purchase2/${modelKey}`, preparePayload(form, fields, colid, currentName, currentUser));
      setMessage(form.id ? "Record updated." : "Record saved.");
      setForm(makeEmptyForm(fields));
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm("Delete this record?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await ep1.post(`/api/v2/purchase2/${modelKey}/delete`, { id: row._id, colid });
      setMessage("Record deleted.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete record");
    } finally {
      setSaving(false);
    }
  };

  const addFilter = () => {
    if (!filterDraft.field || !filterDraft.value) return;
    setFilters((prev) => [...prev, filterDraft]);
    setFilterDraft({ field: fields[0]?.field || "", value: "" });
  };

  const clearFilters = () => {
    setFilters([]);
    loadRows([]);
  };

  const downloadTemplate = () => {
    const row = fields.reduce((acc, field) => ({ ...acc, [field.field]: "" }), {});
    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${modelKey}_template.xlsx`);
  };

  const uploadBulk = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setSaving(true);
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      await ep1.post(`/api/v2/purchase2/${modelKey}/bulk`, {
        colid,
        name: currentName,
        user: currentUser,
        rows: parsedRows
      });
      setMessage("Bulk upload completed.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to upload bulk data");
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (!selectedRows.length) {
      setError("Select at least one row");
      return;
    }
    if (!window.confirm(`Delete ${selectedRows.length} selected record(s)?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedRows.map((id) => ep1.post(`/api/v2/purchase2/${modelKey}/delete`, { id, colid })));
      setSelectedRows([]);
      setMessage("Selected records deleted.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to bulk delete");
    } finally {
      setSaving(false);
    }
  };

  const applyBulkEdit = async () => {
    if (!selectedRows.length || !bulkEdit.field) {
      setError("Select rows and a field to update");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fieldConfig = fields.find((field) => field.field === bulkEdit.field);
      await Promise.all(selectedRows.map((id) => {
        const row = rows.find((item) => item._id === id);
        if (!row) return Promise.resolve();
        const payload = preparePayload(normaliseForForm(row, fields), fields, colid, currentName, currentUser);
        payload.id = id;
        payload[bulkEdit.field] = fieldConfig?.type === "number" ? Number(bulkEdit.value || 0) : bulkEdit.value;
        return ep1.post(`/api/v2/purchase2/${modelKey}`, payload);
      }));
      setSelectedRows([]);
      setMessage("Selected records updated.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to bulk edit");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<Edit />} onClick={() => setForm(normaliseForForm(params.row, fields))}>Edit</Button>
          <Button size="small" color="error" startIcon={<Delete />} onClick={() => deleteRow(params.row)}>Delete</Button>
        </Stack>
      )
    },
    ...fields.map((field) => ({
      field: field.field,
      headerName: field.label,
      minWidth: field.type === "number" ? 130 : 170,
      flex: 1,
      valueGetter: (params) => {
        const value = params.row[field.field];
        if (field.type === "date" && value) return new Date(value).toLocaleDateString();
        if (field.type === "json" && value) return JSON.stringify(value);
        return value;
      }
    })),
    ...Object.keys(rows[0] || {})
      .filter((key) => !systemColumns.includes(key) && !fields.some((field) => field.field === key))
      .filter((key) => !(isGlobalManaged && ["name", "user"].includes(key)))
      .map((key) => ({ field: key, headerName: key, minWidth: 160, flex: 1 }))
  ];

  return (
    <PlacementCoordinatorShell title={`Purchase 2 - ${config.title}`}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{config.title}</Typography>
          <Typography variant="body2" color="text.secondary">Full CRUD, dynamic filtering, export and Excel bulk upload.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/dashdashfacnew")}>Back to dashboard</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          {fields.map((field) => {
            if (isStoreUsers && ["name", "user"].includes(field.field)) return null;
            if (isGlobalManaged && ["name", "user"].includes(field.field)) return null;
            if (isStoreUsers && field.field === "storeuser") {
              return <Autocomplete key={field.field} options={lookupUsers} getOptionLabel={(option) => `${option.name || ""} ${option.email || option.user || ""}`} onChange={(_, value) => setForm({ ...form, storeuser: value?.name || "", userid: value?.email || value?.user || "" })} renderInput={(params) => <TextField {...params} label="Select user" size="small" />} />;
            }
            if (isStoreUsers && field.field === "store") {
              return <Autocomplete key={field.field} options={lookupStores} getOptionLabel={(option) => `${option.storename || option.store || option.name || ""}`} onChange={(_, value) => setForm({ ...form, store: value?.storename || value?.store || "", storeid: value?._id || value?.storeid || "" })} renderInput={(params) => <TextField {...params} label="Select store" size="small" />} />;
            }
            if (["departmentindentds", "departmentindentds2"].includes(modelKey) && field.field === "creatoruserid") {
              return <Autocomplete key={field.field} options={lookupUsers} getOptionLabel={(option) => `${option.name || ""} ${option.email || option.user || ""}`} onChange={(_, value) => setForm({ ...form, creatorname: value?.name || "", creatoruserid: value?.email || value?.user || "" })} renderInput={(params) => <TextField {...params} label="Creator user" size="small" />} />;
            }
            if (modelKey === "itemmasterds2" && field.field === "itemtype") {
              return <Autocomplete key={field.field} options={lookupItemTypes} value={lookupItemTypes.find((row) => row.itemtype === form.itemtype) || null} getOptionLabel={(option) => option.itemtype || ""} onChange={(_, value) => setForm({ ...form, itemtype: value?.itemtype || "" })} renderInput={(params) => <TextField {...params} label="Type" size="small" required={field.required} />} />;
            }
            if (modelKey === "itemmasterds2" && field.field === "category") {
              return <Autocomplete key={field.field} options={lookupItemCategories} value={lookupItemCategories.find((row) => row.categoryname === form.category) || null} getOptionLabel={(option) => option.categoryname || ""} onChange={(_, value) => setForm({ ...form, category: value?.categoryname || "" })} renderInput={(params) => <TextField {...params} label="Category" size="small" required={field.required} />} />;
            }
            return (
              <TextField
                key={field.field}
                size="small"
                label={field.label}
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                value={form[field.field] || ""}
                onChange={(event) => setForm({ ...form, [field.field]: event.target.value })}
                required={field.required}
                disabled={isStoreUsers && field.field === "storeid"}
                multiline={field.type === "json"}
                minRows={field.type === "json" ? 2 : undefined}
                InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
                sx={field.type === "json" ? { gridColumn: { xs: "1", md: "span 4" } } : undefined}
              />
            );
          })}
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          <Button variant="contained" startIcon={<Save />} disabled={saving} onClick={saveRow}>{form.id ? "Update" : "Save"}</Button>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setForm(makeEmptyForm(fields))}>New</Button>
          <Button variant="outlined" startIcon={<Download />} onClick={downloadTemplate}>Template</Button>
          <Button variant="outlined" component="label" startIcon={<UploadFile />}>
            Bulk upload
            <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadBulk} />
          </Button>
          <Button variant="outlined" color="error" startIcon={<Delete />} disabled={!selectedRows.length || saving} onClick={bulkDelete}>Bulk delete</Button>
          <Button variant="text" startIcon={<Refresh />} onClick={() => loadRows()}>Refresh</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>Dynamic filters</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Field</InputLabel>
            <Select label="Field" value={filterDraft.field} onChange={(event) => setFilterDraft({ ...filterDraft, field: event.target.value })}>
              {fields.map((field) => <MenuItem key={field.field} value={field.field}>{field.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Value" value={filterDraft.value} onChange={(event) => setFilterDraft({ ...filterDraft, value: event.target.value })} />
          <Button variant="outlined" onClick={addFilter}>Add filter</Button>
          <Button variant="contained" startIcon={<Search />} onClick={() => loadRows(filters)}>Search</Button>
          <Button variant="text" onClick={clearFilters}>Clear</Button>
        </Stack>
        {!!filters.length && (
          <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
            Active: {filters.map((filter) => `${fields.find((field) => field.field === filter.field)?.label || filter.field}: ${filter.value}`).join(", ")}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>Bulk edit selected rows</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Field</InputLabel>
            <Select label="Field" value={bulkEdit.field} onChange={(event) => setBulkEdit({ ...bulkEdit, field: event.target.value })}>
              {fields.map((field) => <MenuItem key={field.field} value={field.field}>{field.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="New value" value={bulkEdit.value} onChange={(event) => setBulkEdit({ ...bulkEdit, value: event.target.value })} />
          <Button variant="contained" disabled={!selectedRows.length || saving} onClick={applyBulkEdit}>Apply bulk edit</Button>
          <Typography variant="body2" color="text.secondary">{selectedRows.length} selected</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, overflowX: "auto" }}>
        <DataGrid
          rows={rows.map((row) => ({ ...row, id: row._id }))}
          columns={columns}
          autoHeight
          loading={loading}
          checkboxSelection
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={(model) => setSelectedRows(model)}
          density="compact"
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: modelKey } } }}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          sx={{ minWidth: Math.max(1300, columns.length * 150) }}
        />
      </Paper>
    </PlacementCoordinatorShell>
  );
}

import ep1 from "../api/ep1";
import global1 from "../pages/global1";
import { configureCountryTerminology } from "./countryTerminology";

const defaultDashboardForRole = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "student") return "/studentdashboard";
  if (normalizedRole === "faculty") return "/facultydashboard";
  if (normalizedRole === "alumni") return "/alumni-new-dashboard";
  if (normalizedRole === "admin" || normalizedRole === "all") return "/configuration";
  return "/dashdashfacnew";
};

const hasRoleChatbotDefinition = async ({ colid, role }) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (!colid || !role || normalizedRole === "student") return false;
  try {
    const res = await ep1.get("/api/v2/ai-chatbot-definition-role", {
      params: { colid, role }
    });
    return (res.data?.data || []).length > 0;
  } catch {
    return false;
  }
};

export const applyLoginSession = async (responseData, options = {}) => {
  if (!responseData || responseData.status !== "Success") {
    throw new Error(responseData?.message || "Login failed");
  }

  const user = responseData.user;
  const colid = responseData.colid;
  global1.studid = user;
  global1.user = user;
  global1.email = user;
  global1.name = responseData.name;
  global1.name1 = responseData.name;
  global1.colid = colid;
  global1.admincolid = colid;
  global1.token = responseData.token;
  global1.department = responseData.department;
  global1.designation = responseData.designation;
  global1.programcode = responseData.programcode;
  global1.category = responseData.category;
  global1.regno = responseData.regno;
  global1.semester = responseData.semester;
  global1.section = responseData.section;
  global1.role = responseData.role;
  global1.googleemail = responseData.googleemail;
  global1.aqaryear = "2020-21";
  global1.calendaryear = "2020";
  global1.assessment = "2017-18,2018-19,2019-20,2020-21,2021-22";
  global1.bulkuploadurl = "https://canvasapi5u.azurewebsites.net/";

  if (responseData.lastlogin) {
    const lastlogin = new Date(responseData.lastlogin);
    global1.lastlogin = lastlogin.toString();
    const shouldEnforceExpiry = responseData.enforceLastLoginExpiry || responseData.loginexpired || responseData.loginExpired || responseData.accessExpired;
    if (shouldEnforceExpiry && !Number.isNaN(lastlogin.getTime()) && lastlogin.getTime() < Date.now()) {
      throw new Error("Login access is expired.");
    }
  }

  try {
    const institutionRes = await ep1.get("/api/v1/getinstitutionname", {
      params: { user, token: responseData.token, colid }
    });
    const institution = institutionRes.data?.data?.classes?.[0] || {};
    if (institution.status === "Blocked") throw new Error("Access is suspended.");
    global1.instype = institution.type || "";
    global1.insname = institution.institutionname || "";
    global1.logo = institution.logo || "";
    global1.univid = institution.admincolid || "";
    global1.collegecode = institution.institutioncode || "";
    if (institution.status === "Auto") global1.autorenew = "Yes";
    global1.name1 = `${responseData.name || ""}${institution.institutionname ? ` ${institution.institutionname}` : ""}`;
  } catch (err) {
    if (err.message === "Access is suspended.") throw err;
  }

  configureCountryTerminology(options.isOrthintelDomain ? "USA" : "");
  try {
    const countryRes = await ep1.get("/api/v2/country-configuration-default", { params: { colid } });
    if (countryRes.data?.country) configureCountryTerminology(countryRes.data.country);
  } catch {
    // Country configuration is optional.
  }

  const normalizedRole = String(responseData.role || "").trim().toLowerCase();
  if (normalizedRole === "student") {
    try {
      const yearRes = await ep1.get("/api/v1/getcurrentyearbyprg", {
        params: {
          programcode: responseData.programcode,
          semester: responseData.semester,
          section: responseData.section,
          token: responseData.token,
          colid
        }
      });
      global1.lmsyear = yearRes.data?.data?.classes?.[0]?.year || "2024-25";
    } catch {
      global1.lmsyear = "2024-25";
    }
    return "/studentdashboard";
  }

  if (await hasRoleChatbotDefinition({ colid, role: responseData.role })) {
    return "/ai-chatbot-help";
  }

  return defaultDashboardForRole(responseData.role);
};

import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArticleIcon from "@mui/icons-material/Article";
import BadgeIcon from "@mui/icons-material/Badge";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import VerifiedIcon from "@mui/icons-material/Verified";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import MenuPageShell from "./MenuPageShell";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#dc2626", "#0f766e", "#ca8a04", "#be185d"];

const linkButtonSx = {
  justifyContent: "flex-start",
  textTransform: "none",
  borderRadius: 1,
  color: "#0f172a",
  borderColor: "#cbd5e1",
  backgroundColor: "#fff"
};

function buildChartData(sections) {
  return sections.map((section) => ({
    name: section.title.length > 18 ? `${section.title.slice(0, 18)}...` : section.title,
    steps: section.workflow?.length || 0,
    links: section.links?.length || 0,
    controls: section.controls?.length || 0
  }));
}

function RouteButtons({ links = [] }) {
  if (!links.length) return null;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {links.map(([to, label]) => (
        <Button key={`${to}-${label}`} component={RouterLink} to={to} variant="outlined" size="small" sx={linkButtonSx}>
          {label}
        </Button>
      ))}
    </Stack>
  );
}

function CodeBlock({ title, code }) {
  return (
    <Box sx={{ my: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.75, color: "#0f172a" }}>
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          overflow: "auto",
          bgcolor: "#0f172a",
          color: "#e2e8f0",
          fontSize: 12.5,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          border: "1px solid #1e293b"
        }}
      >
        {code}
      </Box>
    </Box>
  );
}

function InfoList({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, color: "#0f172a" }}>
        {title}
      </Typography>
      <List dense sx={{ py: 0 }}>
        {items.map((item, index) => (
          <ListItem key={`${title}-${index}`} sx={{ py: 0.35, px: 0 }}>
            <ListItemText
              primary={`${index + 1}. ${item}`}
              primaryTypographyProps={{ fontSize: 14, color: "#334155", lineHeight: 1.45 }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

function HelpDocPage({ title, subtitle, icon, metrics = [], sections = [], studentLinks = [], nepMapping = [] }) {
  const chartData = buildChartData(sections);
  const totalLinks = sections.reduce((sum, section) => sum + (section.links?.length || 0), 0) + studentLinks.length;
  const totalSteps = sections.reduce((sum, section) => sum + (section.workflow?.length || 0), 0);

  return (
    <MenuPageShell title={title}>
      <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, mb: 2, border: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
            <Box sx={{ color: "#2563eb", display: "flex", alignItems: "center" }}>{icon}</Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#0f172a", mb: 0.5 }}>
                {title}
              </Typography>
              <Typography variant="body1" sx={{ color: "#475569", maxWidth: 1050 }}>
                {subtitle}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            ["Operational Areas", sections.length],
            ["Workflow Steps", totalSteps],
            ["Direct Page Links", totalLinks],
            ["Control Points", sections.reduce((sum, section) => sum + (section.controls?.length || 0), 0)]
          ].map(([label, value], index) => (
            <Grid item xs={12} sm={6} md={3} key={label}>
              <Card sx={{ height: "100%", borderRadius: 2, borderTop: `4px solid ${COLORS[index]}` }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: "#64748b" }}>
                    {label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "#111827" }}>
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2, height: 330, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Documentation Coverage
              </Typography>
              <ResponsiveContainer width="100%" height="86%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="steps" fill="#2563eb" name="Workflow steps" />
                  <Bar dataKey="links" fill="#16a34a" name="Page links" />
                  <Bar dataKey="controls" fill="#f97316" name="Controls" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, height: 330, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Module Emphasis
              </Typography>
              <ResponsiveContainer width="100%" height="86%">
                <PieChart>
                  <Pie data={chartData} dataKey="links" nameKey="name" outerRadius={95} label>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {metrics.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Day-To-Day Operating Model
            </Typography>
            <Grid container spacing={1.5}>
              {metrics.map((metric, index) => (
                <Grid item xs={12} md={4} key={metric.title}>
                  <Card sx={{ height: "100%", borderRadius: 2, borderLeft: `4px solid ${COLORS[index % COLORS.length]}` }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {metric.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
                        {metric.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {studentLinks.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2, border: "1px solid #bfdbfe", backgroundColor: "#eff6ff" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Student-Facing Endpoints
            </Typography>
            <Typography variant="body2" sx={{ color: "#334155", mb: 1 }}>
              These pages are normally exposed through the student menu and should be filtered by the logged-in student identifiers.
            </Typography>
            <RouteButtons links={studentLinks} />
          </Paper>
        )}

        {nepMapping.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              NEP And Outcome Mapping
            </Typography>
            <Grid container spacing={1.5}>
              {nepMapping.map((item) => (
                <Grid item xs={12} md={6} key={item.title}>
                  <Box sx={{ p: 1.5, border: "1px solid #e2e8f0", borderRadius: 2, backgroundColor: "#fff" }}>
                    <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#475569" }}>
                      {item.text}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        <Stack spacing={2}>
          {sections.map((section, index) => (
            <Paper key={section.title} sx={{ p: 2.25, borderRadius: 2, border: "1px solid #e2e8f0" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", md: "center" }}>
                <Chip label={`Area ${index + 1}`} sx={{ backgroundColor: COLORS[index % COLORS.length], color: "#fff", fontWeight: 800 }} />
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#0f172a" }}>
                  {section.title}
                </Typography>
              </Stack>
              <Typography variant="body1" sx={{ color: "#475569", mt: 1, mb: 1.5 }}>
                {section.summary}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <InfoList title="Daily Workflow" items={section.workflow} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoList title="Business Use Cases" items={section.useCases} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoList title="Controls And Audit Points" items={section.controls} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.75, color: "#0f172a" }}>
                    Direct Navigation
                  </Typography>
                  <RouteButtons links={section.links} />
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          Operational note: use the direct links to jump to live ERP pages. For transaction pages, verify role access, active academic year, institution colid, and approval workflow before using the page for production work.
        </Typography>
      </Box>
    </MenuPageShell>
  );
}

const menuManagementSections = [
  {
    title: "Menu Access Control",
    summary: "Control which roles can see which pages, including multi-select page assignment and role-based menu visibility.",
    workflow: [
      "Open Menu access control and select one page, multiple pages, or Select all.",
      "Select one or multiple roles using the checkbox dropdown.",
      "Submit to create one access row per page and role combination.",
      "Use dynamic filters to review access by role, group, page name, or route.",
      "Use bulk delete only after confirming that the target roles still retain dashboard, logout, profile, and help access."
    ],
    useCases: [
      "Onboard a new role such as Counselor, Warden, Librarian, Purchase Officer, or Exam Cell.",
      "Hide sensitive workflows like finance approval, marks processing, or profile approval from operational roles.",
      "Create temporary access during admission drives, exams, audits, or recruitment campaigns."
    ],
    controls: [
      "Keep admin access to Menu access control available to at least two trusted users.",
      "Review menus after adding a new page so that the intended role can actually reach it.",
      "Avoid duplicate page-role entries because they make audit review harder."
    ],
    links: [["/menuaccesscontrol", "Menu access control"], ["/programwiseaccess", "Programwise access"], ["/studentmenumanagement", "Student menu management"]]
  },
  {
    title: "Role And Program Specific Menus",
    summary: "Use programwise access and student menu management to personalize what users see after login.",
    workflow: [
      "Assign users to one or more programs from Programwise access.",
      "For student menus, choose academic year, program, program code, groups, and menu items.",
      "Use custom group names where the student-facing label should differ from the default ERP group.",
      "Validate by logging in as a test user for the target role or student program.",
      "Keep Help and Profile links available so users can self-serve basic navigation and compliance steps."
    ],
    useCases: [
      "Give program coordinators access only to their program's fee and admission reports.",
      "Expose different student menus for undergraduate, postgraduate, school, resident, or diploma programs.",
      "Simplify the student interface during exam registration or fee payment periods."
    ],
    controls: [
      "Programwise reports should respect the access rows before showing financial details.",
      "Student menu customizations should not duplicate the same route twice.",
      "When no custom student structure exists, the default student menu remains the fallback."
    ],
    links: [["/programwiseaccess", "Programwise access"], ["/studentmenumanagement", "Student menu management"], ["/menusearch", "Menu search"]]
  }
];

const feesSections = [
  {
    title: "Fee Configuration And Approval",
    summary: "Define fee templates with academic year, regulation, program, major, minor, semester, medium, gender, fee type, books, and cashbooks, then route them through approval.",
    workflow: [
      "Create fee books, cashbooks, fee groups, and fee items before fee templates are configured.",
      "Add fee configuration rows manually or by bulk upload template.",
      "Use dynamic filters by academic year, program, regulation, fee group, item, fee book, cashbook, gender, medium, semester, and fee type.",
      "Submit fee templates to the approval workflow; final approval changes status to Active.",
      "Use the fee model report to verify semesterwise fee totals before applying to students."
    ],
    useCases: [
      "Create semesterwise tuition, hostel, exam, library, transport, and miscellaneous fee structures.",
      "Maintain separate fee rules for major/minor combinations, gender, medium, and category.",
      "Produce board or finance committee fee reports before billing."
    ],
    controls: [
      "Only Active fees should be applied to student ledgers.",
      "Bulk upload templates should be reviewed after download because custom columns change over time.",
      "Duplicate fee application should be blocked for the same student and fee item."
    ],
    links: [["/mfeesconfig", "Fee configuration"], ["/feeapproval", "Fee approval"], ["/feeitemreport", "Fee item report"], ["/feesmodelreport", "Fees model report"]]
  },
  {
    title: "Student Ledger, Application, And Installments",
    summary: "Apply approved fees to students, manage ledger entries, adjust concessions, and convert dues into installments through approval.",
    workflow: [
      "Filter students by academic year, regulation, program, program code, semester, section, major, minor, IDC, gender, or category.",
      "Select one or more students and one or more fee items to create ledger rows.",
      "Review amount, concession, paid, balance, due date, status, and late fine fields.",
      "If concession or installment conversion changes the payable amount, route it through approval.",
      "Use ledger print pages for studentwise statements and audit-ready records."
    ],
    useCases: [
      "Apply fees to a newly admitted batch or transferred program.",
      "Convert overdue balances into installment schedules.",
      "Generate a consolidated ledger for parent meetings, audits, or student service desks."
    ],
    controls: [
      "Installment due dates should stay within the configured limit.",
      "Cheque payments should not reduce balance until realization is marked.",
      "Program transfer should preserve fee transfer and refund logs."
    ],
    links: [["/feeapplication", "Fee application"], ["/feesapplicationauto", "Fees application auto"], ["/studentledgernew", "Student ledger"], ["/installment", "Installment"], ["/studentinstallmentapproval", "Installment approval"], ["/studentledgerapproval", "Ledger approval"]]
  },
  {
    title: "Counter, Online Payment, Receipts, And Cheques",
    summary: "Collect fees at counter or online through gateway selection, generate transaction receipts, and manage cheque realization.",
    workflow: [
      "Search the student and load only ledger rows with balance greater than zero.",
      "For counter payment, enter received amount, date, payment mode, and mode-specific details.",
      "Generate transaction receipts immediately using transaction id.",
      "For online payment, select an active gateway from the master gateway list.",
      "On successful return, update paid amount, balance amount, online payment log, and receipt availability."
    ],
    useCases: [
      "Collect walk-in fees by cash, cheque, NEFT, RTGS, card, or UPI.",
      "Allow students to pay online without staff intervention.",
      "Issue duplicate receipts from transaction records."
    ],
    controls: [
      "Do not update ledger for failed gateway return status.",
      "Cheque records require original date and realized date before ledger adjustment.",
      "Receipt notes should be centrally maintained and displayed above signatures."
    ],
    links: [["/studentledgercounterpayment", "Counter fee payment"], ["/counterfee2", "Counter fee 2"], ["/counterfee3", "Counter fee 3"], ["/counterfee2receipt", "Counter fee 2 receipt"], ["/chequepaymentdetails", "Cheque payment details"], ["/studentfeesreceipt", "Fees receipt"], ["/studentonlinepaymentreport", "Online payment"]]
  },
  {
    title: "Fees Reports And Dashboards",
    summary: "Use dynamic filters, pivots, cards, charts, and print previews for collection, balance, paid, pending, and programwise reporting.",
    workflow: [
      "Choose a report based on the question: pending, paid, pivot, programwise, student ledger, or management dashboard.",
      "Add only the filters needed for the current review.",
      "Use charts for quick variance review and grids for export-ready details.",
      "Print A4 reports with institution logo, address, checked by, and approved by where relevant.",
      "Drill into student or fee item details before taking action."
    ],
    useCases: [
      "Daily collection reconciliation.",
      "Programwise outstanding report before admit card release.",
      "Audit report for fee category, fee type, fee book, cashbook, and payment source."
    ],
    controls: [
      "Paid date reports must filter by paiddate in ledger or transaction models.",
      "Pending fees should require due date past and balance greater than zero.",
      "Programwise reports should respect configured program access."
    ],
    links: [["/pendingfees", "Pending fees"], ["/feespivot", "Fees pivot"], ["/feespivot2", "Fees pivot 2"], ["/feespaidreport", "Fees paid report"], ["/programwisefeesreport", "Programwise fees report"], ["/feesdashboard", "Fees dashboard"], ["/studentledger", "Student ledger report"]]
  }
];

const examinationSections = [
  {
    title: "Examination Marks",
    summary: "Manage assessment marks, component processing, final marks, grading, grade cards, and blockchain verification.",
    workflow: [
      "Define course assessment components with score type, group type, weightage, pass marks, and credits.",
      "Faculty enters marks for assigned courses and processes componentwise marks.",
      "Process final marks by grouping internal and external scores, applying fail rules, grade rules, relative grading, or z-score grading.",
      "Generate grade cards with SGPA/API, CGPA, QR code, blockchain link, and programwise print configuration.",
      "Use edit and bulk delete pages only for correction workflows with proper approval or audit discipline."
    ],
    useCases: [
      "Continuous internal assessment and external marks consolidation.",
      "Relative grading and UGC grading during result processing.",
      "Blockchain-backed verification for marksheets and receipts."
    ],
    controls: [
      "Pass marks must be multiplied by weightage before pass/fail checks where configured.",
      "If grade is F, status should be Fail and GPA should reflect the final grade point.",
      "Bulk changes should be filtered by academic year, exam, program, and course before processing."
    ],
    links: [["/neplmsassessmentmarks", "Assessment marks entry"], ["/neplmsassessmentmarksview", "Assessment marks view"], ["/neplmscomponentmarks", "View componentwise marks"], ["/neplmsfinalmarks", "View final marks"], ["/neplmsgradecard", "Generate grade card"], ["/neplmsfinalmarksedit", "Edit final marks"]]
  },
  {
    title: "Examination Model 2",
    summary: "A separate marks model for theory, practical, viva, percentages, grading templates, class assignment, and marksheet generation.",
    workflow: [
      "Upload or enter exam marks with academic year, regulation, exam, program, semester, course, student, ABC ID, credits, component totals, and obtained marks.",
      "Calculate percentage for theory, practical, viva, or overall totals.",
      "Apply grading templates to update grade, grade point, GPA, and status.",
      "Run component fail rules to force overall grade F when selected components fail.",
      "Generate marksheets using programwise configuration, ABC ID, photo, QR code, blockchain, and semester/year wording."
    ],
    useCases: [
      "Board-style marksheets where theory, practical, and viva components must be printed separately.",
      "Bulk result imports from external exam systems.",
      "Class assignment and final result processing for annual or semester formats."
    ],
    controls: [
      "Search students from the user model by academic year, program, program code, and semester.",
      "Credits offered should come from program management and credits earned from marks rows.",
      "QR code should not overlap signature blocks in print layouts."
    ],
    links: [["/exammodel2marks", "Exam model 2 marks"], ["/exammodel2vivamarks", "Exam model 2 marks with viva"], ["/exammodel2gradingtemplate", "Grading template"], ["/exammodel2gradingtemplatedetails", "Grading details"], ["/exammodel2processgradingtemplate", "Process grading template"], ["/exammodel2percentagecalculation", "Percentage calculation"], ["/exammodel2componentfailrule", "Component fail rule"], ["/exammodel2finalgradeprocessing", "Final grade processing"], ["/exammodel2marksheet", "Generate marksheet"]]
  },
  {
    title: "Conduct Examination",
    summary: "Plan exams end to end: exam master, course mapping, scheduling, rooms, seat allocation, invigilation, paper setting, moderation, evaluation, hall tickets, and payments.",
    workflow: [
      "Create exam master and exam dates for the academic year.",
      "Map courses to the exam with regulation, date, slot, course type, and course master code.",
      "Generate exam roll from eligible students, then run attendance, fee, ATKT, and disciplinary checks.",
      "Approve room usage, allocate rooms and seats, assign invigilators, mark student attendance, and generate admit cards.",
      "Register paper setters, moderators, and examiners, then process question papers, moderation, allotment, marks entry, and payments."
    ],
    useCases: [
      "AI-assisted exam timetable generation with rules such as holidays, gaps, practical slots, and maximum slots per day.",
      "Randomized seat allocation that avoids adjacent seats for same course students.",
      "Blockchain storage for accepted question papers, hall tickets, and grade cards."
    ],
    controls: [
      "Only applied and eligible students should receive admit cards.",
      "Exam rooms should be approved before allocation.",
      "Question papers should become non-editable after submission for moderation."
    ],
    links: [["/conduct-exams", "Exam master"], ["/conduct-exam-courses", "Exam course mapping"], ["/conduct-exam-course-scheduler", "Exam course scheduler"], ["/conduct-exam-roll", "Exam roll"], ["/conduct-exam-seat-master", "Seat master"], ["/conduct-exam-seat-allocation", "Seat allocation"], ["/conduct-exam-invigilation", "Invigilation details"], ["/conduct-exam-invigilator-allocation", "Invigilator allocation"], ["/conduct-exam-examiner-list", "Examiner list"], ["/conduct-exam-examiner-allotment", "Examiner allotment"], ["/conduct-exam-on-screen-marking", "On screen marking"], ["/conduct-exam-review-papers", "Review papers"]]
  }
];

const profileSections = [
  {
    title: "Custom Fields And Profile Layout",
    summary: "Create rolewise custom fields and arrange editable profile fields into ordered tabs for data capture.",
    workflow: [
      "Create custom fields with label, type, required flag, and editable flag.",
      "Bulk upload fields where many departments or roles need different information.",
      "Create profile layout by role and order fields into tabs.",
      "For student pages, use the student menu and preload data by global student identifiers.",
      "Review layout after adding new custom fields so they appear in forms and templates."
    ],
    useCases: [
      "Collect faculty research IDs, employee compliance numbers, student ABC ID, guardian information, or institutional metadata.",
      "Separate student, faculty, admin, alumni, and non-student employee profiles.",
      "Control what users can self-edit and what needs office approval."
    ],
    controls: [
      "Do not show internal fields such as colid, user, customfields.$, or empty hidden academic fields.",
      "Required editable fields should block submission when blank.",
      "Layout and display layout are separate and should not be mixed."
    ],
    links: [["/usercustomfields", "User custom fields"], ["/userprofilelayout", "Profile edit layout"], ["/userprofiledisplaylayout", "Profile display layout"]]
  },
  {
    title: "Profile Edit, Documents, Consent, And Approval",
    summary: "Users edit profile data and upload documents, then changes move through rolewise approval with field-level comments.",
    workflow: [
      "User gives data processing consent before the edit form is enabled.",
      "User edits allowed fields and uploads photo or required documents through AWS.",
      "Submission creates pending approval records without overwriting approved profile values immediately.",
      "Approver selects a student or user, reviews all pending data and documents, and bulk approves or rejects.",
      "Approval audit logs store user, IP address, timestamp, field, old value, new value, and action."
    ],
    useCases: [
      "Student updates address, phone, documents, and profile photo.",
      "Employee updates academic and employment records with evidence.",
      "Compliance team verifies documents and retains DPDP/GDPR consent audit."
    ],
    controls: [
      "If consent is not given, edit forms should remain inactive and show a consent link.",
      "Rejected fields should remain visible to the submitter with comments.",
      "Document requirements should load in configured category and order."
    ],
    links: [["/userprofileedit", "Profile edit"], ["/studentprofiledynamic", "Student profile edit"], ["/userdocumentrequirements", "Document requirements"], ["/userdocumentupload", "Document upload"], ["/userprofileapprovalworkflow", "Profile approval workflow"], ["/userprofileapproval", "Profile approval"], ["/userprofileapprovalstudent", "User profile approval"], ["/userprofileapprovalreport", "Profile edit report"], ["/userprofileauditlog", "Profile audit log"]]
  },
  {
    title: "Profile Display And Print",
    summary: "Build rolewise printable profiles from approved and pending values, including mandatory fields, custom fields, photo, documents, academics, and employment details.",
    workflow: [
      "Create display layout by role with section name, section order, fields, and field order.",
      "Open profile print or display page and select the user through filters or logged-in student identity.",
      "Choose whether to show only approved data or include pending submitted values.",
      "Print compact profile with logo, address, photo, documents, academic records, employment records, and non-empty fields only.",
      "Use student profile print from student login without dynamic filters."
    ],
    useCases: [
      "Produce student records for exam, scholarship, hostel, or placement verification.",
      "Print employee profile dossiers for HR, appraisal, audit, or accreditation.",
      "Create rolewise public-safe profile print layouts without exposing irrelevant fields."
    ],
    controls: [
      "For non-student roles, hide semester, section, major, minor, SEC, AEC, VAC, IDC, and similar student-only fields.",
      "Student profile print should match by email and regno.",
      "Custom fields should follow display layout order and section grouping."
    ],
    links: [["/userprofileprint", "Profile print"], ["/userprofilelayoutdisplay", "Profile display page"], ["/useracademicdetails", "Academic details"], ["/useremploymentdetails", "Employment details"], ["/userfullprofile", "Admin full profile"], ["/myfullprofile", "My full profile"]]
  }
];

const userManagementSections = [
  {
    title: "User And Student Master Data",
    summary: "Create and maintain user records, student records, custom fields, photos, documents, passwords, and role-based access.",
    workflow: [
      "Use User data upload for broad user data and Student data upload for student-specific academic records.",
      "Use dropdowns for academic year, admission year, gender, category, semester, regulation, program, and subject choices.",
      "Generate strong passwords manually, one by one, or during bulk upload.",
      "Generate scholar numbers from academic year, program code, and sequence.",
      "Use bulk delete only after selecting rows intentionally in the grid."
    ],
    useCases: [
      "Batch upload a newly admitted student cohort.",
      "Create non-student users such as faculty, counselors, finance, warden, librarian, and exam cell.",
      "Maintain updated photo, ABC ID, specialization, medium of instruction, and program records."
    ],
    controls: [
      "For non-student users, student-only fields should be stored as NA and hidden.",
      "Status Active should be stored as 1 and Inactive as 0.",
      "Last login expiry controls must be reviewed before creating demo or temporary users."
    ],
    links: [["/userdataupload", "User data upload"], ["/studentdataupload", "Student data upload"], ["/mbuser", "User management"], ["/userphotoupload", "Photo upload"], ["/studentdetails", "Student details"], ["/studentpromotion", "Student promotion"]]
  },
  {
    title: "Organization, Access, Reporting, And Compliance",
    summary: "Manage reporting hierarchy, program access, profile governance, consent, academic/employment details, and user reports.",
    workflow: [
      "Define managers for employees in Organization hierarchy.",
      "Use org chart pages for department and institution-level reporting views.",
      "Assign program access to restrict sensitive programwise finance and academic reports.",
      "Use pivot count reports and student details reports for management summaries.",
      "Collect consent and retain audit logs for data processing."
    ],
    useCases: [
      "Create department org chart for NAAC, NBA, HR, or governance reports.",
      "Audit rolewise users, students by category, semester, state, district, department, or program.",
      "Enable managers in approval workflows for leave, expense, salary, and profile approvals."
    ],
    controls: [
      "User profile approvals should capture comments and field-level actions.",
      "Consent withdrawal should be logged and reflected in profile edit access.",
      "Programwise access should be checked before programwise fee reporting."
    ],
    links: [["/organizationhierarchy", "Organization hierarchy"], ["/departmentalorgchart", "Department org chart"], ["/institutionorgchart", "Institution org chart"], ["/employeereporting", "Employee reporting"], ["/programwiseaccess", "Programwise access"], ["/userpivotreport", "User pivot report"], ["/userpivotcount", "User pivot count"], ["/userconsent", "Consent collection"]]
  },
  {
    title: "Admissions Linked To Users",
    summary: "Convert applications, CRM leads, transfers, cancellations, and refunds into governed user and ledger records.",
    workflow: [
      "Search applicants or leads using dynamic filters.",
      "Confirm admission only after seat, major/minor, category, and fee checks are satisfied.",
      "Generate registration number, password, welcome email, and update admission status.",
      "For cancellation, mark user inactive, calculate refunds, administrative charges, and create refund records.",
      "For program transfer, log old program, update user details, transfer fees, and apply new fee template."
    ],
    useCases: [
      "Bulk admit applicants from dynamic admission forms.",
      "Handle student promotion, transfer, cancellation, and refund workflows.",
      "Create audit-ready user history across admission, transfer, cancellation, and refund events."
    ],
    controls: [
      "Regno generated during admission should also update the admission application.",
      "Admission cancellation should preserve refund mode, reference, and administrative charges.",
      "Program transfer should not lose previously paid amounts."
    ],
    links: [["/dynamic-admission-to-user", "Confirm admission"], ["/admissioncancellation", "Admission cancellation"], ["/refunddetails", "Refund details"], ["/generaterefundletter", "Refund letter"], ["/programtransfer", "Program transfer"], ["/feetransferlog", "Fee transfer log"]]
  }
];

const academicSections = [
  {
    title: "Program, Regulation, Subjects, Courses",
    summary: "Build the academic spine: program master, regulation, subject groups, course map, credits, delivery type, course type, and specialization.",
    workflow: [
      "Create program records with level, type/board, institution, department, duration, session type, total credits, and order.",
      "Create regulation or syllabus year for the academic year.",
      "Map regulation subjects by academic year, regulation, program, type, category, seats, gender, and same-state rules.",
      "Create regulation course map with semester, subject, course, course code, credit, course type, course master code, and delivery type.",
      "Create specialization records and assign students to specialization 1 or 2."
    ],
    useCases: [
      "Implement NEP major, minor, AEC, SEC, VAC, IDC, elective, and specialization structures.",
      "Maintain school, UG, PG, certificate, and professional course catalogs.",
      "Drive dropdowns used by admissions, timetable, LMS, exam, fees, and marksheet configuration."
    ],
    controls: [
      "Program order affects admission program display order.",
      "Regulation course map is the reference for timetable, workload, exam courses, and syllabus.",
      "Delivery type controls compulsory/elective behavior."
    ],
    links: [["/programmanagement", "Program management"], ["/regulationmaster", "Regulation"], ["/regulationsubjects", "Regulation subjects"], ["/regulationcoursemap", "Regulation course map"], ["/specialization", "Specialization"], ["/specializationassignment", "Specialization assignment"]]
  },
  {
    title: "Assessment, Syllabus, CO, Grade, And Rules",
    summary: "Configure assessment components, syllabus modules, course outcomes, Bloom mapping, grade rules, grace marks, ATKT, and marksheet print rules.",
    workflow: [
      "Create syllabus modulewise and topicwise for each course.",
      "Create CO list with module, topic, and Bloom taxonomy mapping.",
      "Create assessment components with group type, score type, marks, pass marks, credits, and weightage.",
      "Configure grade, relative grade, z-score, grace marks, class assignment, and ATKT rules.",
      "Validate syllabus, grade rules, and assessment rules using AI where configured."
    ],
    useCases: [
      "Map curriculum to outcome-based education and Bloom taxonomy.",
      "Support absolute grading, relative grading, z-score grading, grace marks, and result processing.",
      "Generate course review, syllabus update, BoS reports, and marksheet formats."
    ],
    controls: [
      "Subject dropdowns should come from regulation subjects filtered by year, regulation, program, and type.",
      "Course dropdowns should come from regulation course map.",
      "AI validation requires a configured Gemini or Ollama provider."
    ],
    links: [["/courseassessment", "Course assessment"], ["/syllabus", "Syllabus"], ["/colist", "CO list"], ["/gradeconfiguration", "Grade configuration"], ["/relativegradingconfiguration", "Relative grading"], ["/zscoreconfiguration", "Z score configuration"], ["/gracemarkspolicy", "Grace marks policy"], ["/atktrule", "ATKT rule"], ["/programwise-marksheet-configuration", "Marksheet configuration"]]
  },
  {
    title: "Admission And Institutional Configuration",
    summary: "Configure admission forms, address/board panels, academic calendars, seats, accreditation status, and institutional academic metadata.",
    workflow: [
      "Create admission configuration for stream, program, semester, subjects, type, and status.",
      "Maintain address configuration and board/university configuration for cascaded admission panels.",
      "Maintain academic calendar with working day, holiday, regulation, program, and semester.",
      "Create seat matrix and admission rules before admitting students.",
      "Maintain accreditation status by academic year, accreditation type, institution/program, dates, and grade."
    ],
    useCases: [
      "Operate multiple admission forms and subjectwise admission flows.",
      "Block exam scheduling on declared holidays.",
      "Report accreditation validity, grade, and program coverage."
    ],
    controls: [
      "Calendar holidays should match academic year, regulation, program, and semester where used for exam scheduling.",
      "Address and board panels appear only when added in dynamic admission form setup.",
      "Seat matrix must be checked before final admission."
    ],
    links: [["/admissionconfiguration", "Admission configuration"], ["/addressconfiguration", "Address configuration"], ["/boardconfiguration", "Board configuration"], ["/academiccalendar", "Academic calendar"], ["/seatmatrix", "Regulation seat matrix"], ["/accreditationstatus", "Accreditation status"]]
  }
];

const nepLmsSections = [
  {
    title: "Workload, Timetable, Rooms, And Attendance",
    summary: "Assign workload, create timetables, manage rooms, track faculty availability, and capture attendance through normal, group, section, photo, or OTP flows.",
    workflow: [
      "Create workload assignment from regulation course map, including hours per week and course type.",
      "Configure periods, faculty availability, and rooms before creating timetable.",
      "Use manual, AI, or room-aware timetable creator to schedule classes without room or faculty conflicts.",
      "Faculty opens My Classes, selects a past class, and records normal, photo, or OTP attendance.",
      "Use reports for studentwise attendance, consecutive absence, missing timetable, and course progression."
    ],
    useCases: [
      "Create a complete academic timetable from workload, periods, rooms, and availability.",
      "Take attendance by selected class, section, class group, face/photo analysis, or OTP.",
      "Identify attendance risk, class conduct gaps, and missing timetables early."
    ],
    controls: [
      "Faculty pages should filter courses and classes by facultyemail matching logged-in user.",
      "Student list should filter by user academicyear, not admissionyear.",
      "Room timetable should avoid double booking at the same time."
    ],
    links: [["/workloadassignment", "Workload assignment"], ["/neplmsassignedcourses", "Assigned courses"], ["/periodconfiguration", "Period configuration"], ["/neplmstimetablemanager", "Timetable manager"], ["/neplmstimetablecreator", "Timetable creator"], ["/neplmstimetableroomcreator", "Timetable room creator"], ["/neplmsroomconfiguration", "Room configuration"], ["/neplmsroomcalendar", "Room calendar"], ["/neplmsattendance", "Attendance"], ["/neplmsphotoattendance", "Photo attendance"], ["/neplmsotpattendance", "OTP attendance"], ["/neplmsmyclasses", "My classes"]]
  },
  {
    title: "Course Workspace, Content, Assignments, Quiz, And AI",
    summary: "Create course materials, lesson plans, assignments, quizzes, sequential content, flash cards, infographics, and AI-generated content.",
    workflow: [
      "Faculty selects assigned course and loads syllabus modules/topics.",
      "Create assignments, course material, lesson plans, flash cards, infographics, and sequential content manually or through AI.",
      "Upload files through AWS and save links in the course workspace.",
      "Students consume sequential content in order; each completion is timestamped.",
      "Faculty reviews assignment submissions, quiz scores, assessment answers, and completion status."
    ],
    useCases: [
      "Generate multilingual course material and assignments using Gemini or Ollama.",
      "Build structured learning paths where students unlock content step by step.",
      "Run live quizzes with real-time score dashboards."
    ],
    controls: [
      "Every AI generation page should expose Gemini model selection and Ollama option where supported.",
      "Assignment module/topic state should be independent from course material module/topic state.",
      "Students should see submitted assignments in My submissions, not Upcoming assignments."
    ],
    links: [["/neplmscourseworkspace", "Course workspace"], ["/neplmsmycoursecontent", "My course content"], ["/neplmsaicoursegeneration", "AI course generation"], ["/neplmsquiz", "Quiz"], ["/neplmslivequiz", "Live quiz"], ["/neplmsremedial", "Remedial"], ["/neplmsclassgroups", "Class groups"], ["/neplmsclassgroupsadmin", "Class group admin"], ["/neplmsgroupattendance", "Class group attendance"]]
  },
  {
    title: "Assessment, CO Attainment, Remedial, And Dashboards",
    summary: "Use descriptive assessments, AI evaluation, CO mapping, attainment, score analysis, remedial content, and management dashboards.",
    workflow: [
      "Create assessments with sections, questions, CO, Bloom level, date window, images, and attachments.",
      "Students answer active assessments from their workspace.",
      "Faculty evaluates manually or with AI, edits marks/comments, and publishes scores.",
      "Calculate CO attainment by threshold and level rules.",
      "Generate remedial videos/materials based on question concepts and student performance gaps."
    ],
    useCases: [
      "Outcome-based education reporting for accreditation.",
      "Student learning profile with courses, attendance, marks, quizzes, assignments, final marks, and mentoring summary.",
      "HoD dashboard for lesson completion, assessment status, remedial, feedback, and CAS scores."
    ],
    controls: [
      "CO attainment should record every CO even when attainment percentage is zero.",
      "AI evaluation should show progress and save marks/comments before faculty edits.",
      "Remedial content should identify the concept first, then create YouTube search links and learning material."
    ],
    links: [["/neplmsassessment", "Assessment"], ["/neplmsstudentlearningprofile", "Student learning profile"], ["/courseprogression", "Course progression"], ["/hoddashboard", "HoD dashboard"], ["/neplmsstudentwiseattendance", "Studentwise attendance"], ["/consecutiveabsence", "Consecutive absence"], ["/missingtimetable", "Missing timetable"], ["/neplmsmastertimetable", "Master timetable"]]
  }
];

const recruitmentHelpSections = [
  {
    title: "Job Posting And Dynamic Application Forms",
    summary: "Recruitment begins with job posts, assigned custom forms, role-specific document lists, validation criteria, and public share links.",
    workflow: [
      "Create the job post with title, department, employment type, status, description, dates, and form assignment.",
      "Create custom form tabs and fields for the job role, including required fields, photo upload, and document upload.",
      "Define document requirements for the form and mark validation criteria as mandatory or optional.",
      "Publish the job and copy the generated share link for website, social media, email, or QR distribution.",
      "Applicants retrieve draft applications by credentials and submit only after mandatory validations pass."
    ],
    useCases: [
      "Faculty hiring with qualification, publication, teaching, research, and document evidence.",
      "Administrative hiring with experience, identity, PAN, resume, and declaration fields.",
      "International candidate intake where validation comments must be preserved for screening."
    ],
    controls: [
      "Mandatory photo and documents should be captured before final submission where configured.",
      "Mandatory AI validation failures should block submission; optional issues should remain in the candidate deficiency summary.",
      "The share link must include the institution context so records are stored under the correct colid."
    ],
    links: [["/recruitment-management", "Recruitment management"], ["/recruitment-apply", "Public recruitment apply"]]
  },
  {
    title: "Candidate Review, Status, Approval, And Communication",
    summary: "Recruitment teams can view applicants, update candidate status, trigger approval, send email, and shortlist candidates using filters or AI instructions.",
    workflow: [
      "Open candidate list for the selected job and review profile, documents, validation summary, and status.",
      "Change candidate status from the configured candidate status dropdown.",
      "Use dynamic filters and text search to shortlist by custom field values.",
      "Use AI shortlisting by writing plain-English criteria for job-specific screening.",
      "When candidate status changes to Confirmed, review the sample email content and send to the candidate email."
    ],
    useCases: [
      "Screen hundreds of applicants by qualification, experience, specialization, and custom criteria.",
      "Keep candidate status consistent across HR and department reviewers.",
      "Send structured confirmation or next-step communication without leaving the ERP."
    ],
    controls: [
      "AI shortlisting should support human review before final decision.",
      "Status values should come from the configured candidate status master.",
      "Email content should be reviewed before sending."
    ],
    links: [["/recruitment-management", "Recruitment module"]]
  },
  {
    title: "Interview Panels And Scheduling",
    summary: "Create interview panels, add members with remuneration and qualifications, map panels to jobs, and schedule interviews with class-calendar visibility.",
    workflow: [
      "Create panel master records for recruitment boards or subject panels.",
      "Add panel members with qualification, remuneration, and contact details.",
      "Map panels to job postings.",
      "Select candidates and schedule interviews by date and panel.",
      "Review classes scheduled for all panel members on the selected date to avoid conflicts."
    ],
    useCases: [
      "Faculty interview panels where academic schedules must be respected.",
      "Multi-stage interviews with different boards for screening, technical, and final rounds.",
      "Remuneration planning for external panel members."
    ],
    controls: [
      "Panel member availability should be checked before interview confirmation.",
      "Panel-job mapping should be reviewed before candidate scheduling.",
      "Interview schedules should retain audit evidence of panel and candidate selection."
    ],
    links: [["/recruitment-interview-panels", "Interview panels"], ["/recruitment-panel-members", "Panel members"], ["/recruitment-panel-jobs", "Panel job mapping"], ["/recruitment-interview-schedule", "Interview schedule"]]
  },
  {
    title: "Offer Letters, User Creation, And Onboarding",
    summary: "After final approval, recruitment teams can generate offer letters, convert candidates to ERP users, complete onboarding steps, upload onboarding documents, and review onboarding progress.",
    workflow: [
      "Create offer letter templates or use the 10 seeded sample templates for faculty, contractual faculty, visiting faculty, admin, counselor, librarian, and lab roles.",
      "Use placeholders such as name, email, phone, designation, salary, job title, institution name, logo, address, and custom field names in the HTML template.",
      "Open Generate offer letter, select the job, choose a final approved candidate, select template, enter designation/salary where needed, generate preview, and print.",
      "Open Add candidates to user, select job, select one or more final approved candidates, enter role through autocomplete/free text, and create ERP user accounts.",
      "Define rolewise onboarding steps and then complete the checklist for each candidate with comments and AWS document uploads.",
      "Use onboarding report to view stagewise completion, pending steps, summary cards, charts, and candidate details."
    ],
    useCases: [
      "Issue institution-branded permanent faculty and contractual faculty offer letters.",
      "Move selected candidates into the user master without re-entering name, email, phone, photo, and custom fields.",
      "Track joining formalities such as document verification, HR file creation, bank details, policy acknowledgement, ID card, email creation, and department reporting."
    ],
    controls: [
      "Only final approved, confirmed, selected, or approved candidates should appear in offer and onboarding pages.",
      "Templates should be reviewed before printing because HTML placeholders are replaced exactly from candidate and institution data.",
      "Onboarding documents should be uploaded through AWS and linked stepwise."
    ],
    links: [["/recruitment-offer-templates", "Offer letter templates"], ["/recruitment-onboarding-steps", "Onboarding steps"], ["/recruitment-offer-letter", "Generate offer letter"], ["/recruitment-candidates-to-user", "Add candidates to user"], ["/recruitment-onboarding-checklist", "Onboarding checklist"], ["/recruitment-onboarding-report", "Onboarding report"]]
  }
];

const transcriptHelpSections = [
  {
    title: "Audio Recording And Transcription",
    summary: "Record meeting or standalone audio, upload it to AWS, transcribe it through Gemini, optionally translate to English, and generate summaries/action items.",
    workflow: [
      "Open transcript recorder and record audio from the browser.",
      "Upload the recording to AWS so the audio link is preserved.",
      "Send the recording to Gemini for transcription.",
      "Select Translate to English if bilingual or regional-language minutes are required.",
      "Generate summary and action items, then review/edit the text before sending by email or saving to meeting record."
    ],
    useCases: [
      "Minutes for departmental meetings, BoS meetings, examination committees, and HR discussions.",
      "Meeting follow-up action tracking.",
      "Language translation for international or multilingual stakeholders."
    ],
    controls: [
      "Audio recording requires user consent and institutional data-processing policy compliance.",
      "Transcripts should be reviewed before official circulation.",
      "AWS configuration must be active before audio links can be stored."
    ],
    links: [["/transcript-recorder", "Transcript recorder"]]
  },
  {
    title: "Meeting Calendar And Minutes",
    summary: "Create meetings in calendar views, add participants, record meeting audio, save transcript outputs, and print formal minutes with institution branding.",
    workflow: [
      "Create a meeting by double-clicking the calendar cell and entering host, participants, topic, description, and meeting link.",
      "Use Google calendar link generation where configured.",
      "Open a meeting and record audio through the meeting transcript recorder.",
      "Save transcript, translation, summary, action items, and audio link back to the meeting.",
      "Generate printable minutes with logo, address, participants, date, action items, transcript, translation, and audio link."
    ],
    useCases: [
      "Calendar-based meeting governance for committees and departments.",
      "Action item tracking from discussions.",
      "Formal printable minutes for academic and administrative records."
    ],
    controls: [
      "My meetings should show records where host email or participant email matches the logged-in user.",
      "Meeting details should remain visible when clicked from the calendar.",
      "Printed minutes should include institution logo and address."
    ],
    links: [["/transcript-meetings", "Meetings"], ["/my-transcript-meetings", "My meetings"], ["/meeting-transcript-recorder", "Meeting transcript recorder"]]
  }
];

const placementHelpSections = [
  {
    title: "Placement Leads And Stages",
    summary: "Maintain company placement leads with custom fields, stages, completion status, bulk upload, and searchable grid views.",
    workflow: [
      "Create lead stages before adding placement leads.",
      "Add placement leads with company name, lead name, email, phone, status, completed flag, and custom fields.",
      "Use bulk upload for campaign or employer lists.",
      "Use dynamic filters to find leads by company, status, custom field, completion, date, or assigned user.",
      "Update status and completed flag as placement conversations progress."
    ],
    useCases: [
      "Corporate outreach pipeline for internships and placements.",
      "Tracking employer relationships by sector, location, hiring need, and follow-up stage.",
      "Bulk importing leads from career fairs and placement campaigns."
    ],
    controls: [
      "Lead status should come from the configured lead stage master.",
      "Completed should be explicitly Yes or No.",
      "Custom fields should appear in form and upload template."
    ],
    links: [["/placement-lead-stage", "Lead stage"], ["/placement-leads", "Placement leads"]]
  },
  {
    title: "Visit Planning And Follow-Up Calendar",
    summary: "Plan employer visits, update work done and next follow-up dates, and view plans in daily or weekly calendar mode.",
    workflow: [
      "Select one or more placement leads and enter planned visit date, description, and comments.",
      "Later edit only work done and next follow-up date.",
      "Open visit calendar, select user, and view daily or weekly plans.",
      "Filter by date, user, lead, status, and follow-up fields.",
      "Use calendar view for weekly outreach planning and management review."
    ],
    useCases: [
      "Counselor or placement officer weekly visit planning.",
      "Tracking employer follow-up promises and outcomes.",
      "Management review of corporate engagement activity."
    ],
    controls: [
      "Completed visit records should keep original planned date intact.",
      "Next follow-up date should be updated after every meaningful interaction.",
      "Calendar filters should not hide overdue follow-ups unintentionally."
    ],
    links: [["/placement-visit-plan", "Visit plan"], ["/placement-visit-calendar", "Visit calendar"]]
  }
];

const aiHelpdeskSections = [
  {
    title: "Knowledgebase Setup",
    summary: "Create searchable institutional help content by title, type, level, and help text for the chatbot to use while answering public queries.",
    workflow: [
      "Create knowledgebase records with title, type, level, and help text.",
      "Bulk upload frequently asked admission, fees, hostel, transport, examination, placement, and LMS questions.",
      "Use type and level query parameters to expose different helpdesk experiences.",
      "Review stale or duplicate help text before admission or campaign periods.",
      "Keep public-facing answers clear, accurate, and institution-specific."
    ],
    useCases: [
      "Public admission chatbot answering program, eligibility, fee, document, and deadline questions.",
      "Internal helpdesk for ERP workflows.",
      "Campaign-specific chatbot for a course level or department."
    ],
    controls: [
      "Only approved knowledgebase content should be used for official chatbot answers.",
      "Sensitive user data should not be placed in public help text.",
      "Gemini configuration must exist for conversational responses."
    ],
    links: [["/knowledgebase", "Knowledgebase"], ["/ai-helpdesk-chatbot", "AI Helpdesk chatbot"]]
  },
  {
    title: "Conversational Lead Capture",
    summary: "The chatbot can answer from knowledgebase content and collect name, email, phone, and course interest when the conversation indicates admission interest.",
    workflow: [
      "User asks a question on the public chatbot page.",
      "Gemini interprets the question and checks matching knowledgebase entries.",
      "If admission interest is detected, the bot asks for missing lead details conversationally.",
      "The lead is added to CRM and assigned to a counselor when enough information is available.",
      "The chat scrolls automatically as messages are added."
    ],
    useCases: [
      "Convert website visitors into CRM leads.",
      "Answer repetitive questions outside office hours.",
      "Route interested applicants to counselors with minimal manual entry."
    ],
    controls: [
      "Lead creation should include colid and relevant campaign context.",
      "The chatbot should avoid creating leads when user intent is only informational.",
      "Public pages should stay stable while typing and auto-scroll to the newest message."
    ],
    links: [["/ai-helpdesk-chatbot", "Public chatbot"], ["/crm-my-leads", "My CRM leads"]]
  }
];

const libraryHelpSections = [
  {
    title: "Library Master, Access, And Book Catalogue",
    summary: "Create multiple libraries, assign staff access, maintain book catalogue, generate QR/barcode labels, and support scanned book lookup.",
    workflow: [
      "Create library master entries with name, description, and type.",
      "Assign users to one or more libraries through searchable multiselect access.",
      "Add books with accession number, classification, category, title, author, publisher, publisher address, ISBN, invoice number, invoice date, keywords, price, status, and library.",
      "Bulk upload catalogue records where large book data exists, including classification, publisher address, invoice, and keyword columns.",
      "Generate QR or barcode for each book and use the scan page to view book details."
    ],
    useCases: [
      "University, departmental, and special libraries under one ERP.",
      "Accession-based stock verification with classification and invoice traceability.",
      "Keyword-based discovery for OPAC and librarian searches.",
      "Library-specific access control for librarians and departments."
    ],
    controls: [
      "Book master and transaction pages should filter by libraries assigned to the logged-in user.",
      "Accession number should remain unique.",
      "Student OPAC may search any library, but staff transactions should respect access.",
      "Classification, publisher address, invoice number/date, and keywords are available in book filters across catalogue, issue, request, transfer, loan, and OPAC workflows."
    ],
    links: [["/library-master", "Library master"], ["/library-user-access", "Library user access"], ["/library-books", "Book master"], ["/library-book-scan", "Book scan"]]
  },
  {
    title: "Issue, Return, Fine, OPAC, Requests, Transfer, And Loan",
    summary: "Issue and return books, calculate fines, add ledger entries, handle OPAC requests, and manage inter-library transfer or loan with approval.",
    workflow: [
      "Configure fine rules by book category.",
      "Issue books by scanning accession number or selecting book and student through dynamic filters such as title, author, classification, publisher, invoice number, keywords, category, subject, and status.",
      "On return, calculate overdue fine and add it to student ledger when applicable.",
      "Students search OPAC by catalogue metadata including classification, publisher, invoice details, and keywords, then request available copies.",
      "Librarian approves or rejects requests and can process inter-library transfers or loans through approval flow."
    ],
    useCases: [
      "Student self-service OPAC and issued-book history.",
      "Overdue fine recovery through Fees ledger.",
      "Shared resource movement between central and departmental libraries."
    ],
    controls: [
      "A book already issued should not be issued again until returned.",
      "Fine calculation should use actual return date and configured category rule.",
      "Transfer and loan approvals should preserve source and destination library history."
    ],
    links: [["/library-fines", "Fine master"], ["/library-issue", "Issue book"], ["/library-return", "Return book"], ["/library-requests", "Issue requests"], ["/library-transfer", "Inter-library transfer"], ["/library-loan", "Inter-library loan"], ["/library-reports", "Library reports"]]
  }
];

const purchase2HelpSections = [
  {
    title: "Business Purpose And Operating Model",
    summary: "Purchase 2 separates store indents, store PR, PO creation, approval, gate pass, quality check, GRN, stock update and print evidence into a controlled procurement workflow.",
    business: [
      "Departments can request items from assigned stores without manually tracking stock by email or paper.",
      "Store managers can issue available stock immediately and raise PR only for items that need procurement.",
      "Purchase cell can assign PRs to PO creators, ensure one PO belongs to one vendor, route PO approval, and retain printable audit evidence.",
      "Stores can control inward material through gate pass, quality check and GRN before stock is updated."
    ],
    workflow: [
      "Create core masters: department, item unit, item type, item category, item master, store master and store users.",
      "User raises an indent request for a store assigned to them.",
      "Store manager reviews the indent, checks stock and allots full or partial quantity.",
      "If items are unavailable or need purchase, store manager raises Store PR request.",
      "Authorized user assigns PR to PO creator.",
      "PO creator creates PO from assigned PR or creates a Local PO directly from item master.",
      "PO is submitted and passes through PO approval workflow.",
      "Approved PO moves through gate pass, quality check and GRN.",
      "Approved QC/GRN quantities update store stock and become available for future allotment."
    ],
    controls: [
      "Store dropdowns are based on store-user assignment.",
      "Department indent uses creatoruserid so the creator sees their own department mapping.",
      "Item issue validates available quantity from store items.",
      "PO creation from PR should keep one vendor per PO.",
      "Print documents should include institution details and user signatures where configured."
    ],
    links: [
      ["/purchase2-dashboard", "Purchase 2 dashboard"],
      ["/purchase2/departmentindentds", "Department indent"],
      ["/purchase2/itemunitds2", "Item unit"],
      ["/purchase2/itemtypeds2", "Item type"],
      ["/purchase2/itemcategoryds2", "Item category"],
      ["/purchase2/itemmasterds2", "Item master"],
      ["/purchase2/storemasterds2", "Store master"],
      ["/purchase2/storeusersds2", "Store users"]
    ]
  },
  {
    title: "Master Data Setup",
    summary: "Masters define what can be requested, who can request from which store, and which vendor/rate data can be used for purchase orders.",
    business: [
      "Clean master data prevents wrong departments, duplicate item codes, unclear units and uncontrolled stores.",
      "Vendor item mapping supports automatic vendor selection and PO pricing when the PR item matches vendor item data."
    ],
    workflow: [
      "Create department list in Department indent.",
      "Create Item unit records such as Nos, Box, Kg or Litre.",
      "Create Item type and Item category records.",
      "Create Item master with item code, item name, type, category, unit and status.",
      "Create stores in Store master and map users to stores in Store users.",
      "Create Store items to represent available stock and quantity.",
      "Create Vendors and Vendor items with rate, warranty and terms where available."
    ],
    controls: [
      "Use searchable dropdowns for type, category, unit and store.",
      "Use bulk upload for first-time master migration.",
      "Use bulk delete carefully only for setup errors before live transactions begin."
    ],
    links: [
      ["/purchase2/storeitemsds2", "Store items"],
      ["/purchase2/vendorsds2", "Vendors"],
      ["/purchase2/vendoritemsds2", "Vendor items"],
      ["/purchase2-store-item-user", "Store item user"]
    ]
  },
  {
    title: "Indent Request And Store Allotment",
    summary: "This is the day-to-day store issue process where the requester asks for items and the store manager issues available quantity.",
    business: [
      "Departments get visibility into what they requested and what was actually allotted.",
      "Store managers can partially allot if available stock is lower than requested quantity.",
      "Allotment print acts as an issue or assignment document."
    ],
    workflow: [
      "Requester opens Indent request.",
      "Select department, assigned store and items from item master.",
      "Submit request with item quantity and remarks.",
      "Store manager opens Indent approval / allotment.",
      "System filters requests by stores assigned to logged-in store manager.",
      "Manager opens a request, checks available quantity and enters allotted quantity.",
      "If allotted quantity is less than requested, the shortfall remains visible.",
      "Print the indent or allotment document for signatures and records."
    ],
    controls: [
      "Quantity allotted cannot exceed requested quantity.",
      "Allotment checks storeitemsds2 before issuing.",
      "Available stock must reduce after issue.",
      "Requester should see only requests related to their creatoruserid where applicable."
    ],
    links: [
      ["/purchase2-indent-request", "Indent request"],
      ["/purchase2-store-request-review", "Indent approval / allotment"],
      ["/purchase2/storerequisitionds2", "Store requisition"],
      ["/purchase2/storerequisitionitemsds2", "Store requisition items"]
    ]
  },
  {
    title: "Store PR And PO Assignment",
    summary: "When store stock is insufficient or purchase is needed, store managers raise PR and purchase administrators assign PRs to PO creators.",
    business: [
      "Store PR consolidates demand before purchase action.",
      "PO assignment gives accountability to a specific PO creator with date, status and remarks."
    ],
    workflow: [
      "Store manager opens Store PR request.",
      "Select assigned store and items through dynamic item filters.",
      "Enter make, quantity, remarks and submit PR.",
      "Open Assign PO creator.",
      "Select PR from table and select user from searchable dropdown.",
      "Save assignment so the selected PO creator can view the PR in their workbench.",
      "Print PR by PR number for purchase file."
    ],
    controls: [
      "PR history should show only logged-in user's PRs where required.",
      "Store selection follows store access.",
      "Assigned PR should become available only to the selected PO creator."
    ],
    links: [
      ["/purchase2-store-pr-request", "Store PR request"],
      ["/purchase2-po-assignment", "Assign PO creator"],
      ["/purchase2/storeprrequestds2", "Store PR request model"],
      ["/purchase2/storepoassignmentds2", "Store PO assignment"]
    ]
  },
  {
    title: "PO Creation, Local PO And Approval",
    summary: "Purchase 2 supports PO creation from assigned PR and direct Local PO creation from item master.",
    business: [
      "Standard PO follows approved PR demand.",
      "Local PO handles direct purchase where PR assignment is not required.",
      "Approval workflow ensures financial and administrative review before material movement."
    ],
    workflow: [
      "Configure PO approval levels in PO approval workflow.",
      "PO creator opens Manage PO creator and sees PRs assigned to them.",
      "Select a PR and create PO; vendor is selected from vendor item mapping when PR item matches vendor item.",
      "Add terms, warranty and any editable PO details.",
      "Save PO as Draft.",
      "Submit PO from Manage PO; it moves to approval workflow.",
      "Approvers open Manage PO admin and approve as per configured levels.",
      "For Local PO, open Local PO, select items from item master, select unit and vendor, enter make, terms and create PO."
    ],
    controls: [
      "One PO should not contain items from multiple vendors.",
      "Creator signature populates when creator submits if signature upload exists.",
      "Approver name and signature populate in print after approval.",
      "Submitted PO should not bypass configured approval levels."
    ],
    links: [
      ["/purchase2-local-po", "Local PO"],
      ["/purchase2-po-approval-workflow", "PO approval workflow"],
      ["/purchase2-manage-po-admin", "Manage PO admin"],
      ["/purchase2-manage-po-creator", "Manage PO creator"],
      ["/user-signature-upload", "User signature upload"]
    ]
  },
  {
    title: "Gate Pass, Quality Check And GRN",
    summary: "The post-approval receipt process controls material entry, inspection, accepted quantities and stock posting.",
    business: [
      "Gate pass records material movement at entry or exit.",
      "Quality check separates received, approved, rejected and returned quantity.",
      "GRN becomes the formal goods receipt evidence for stores, purchase and accounts."
    ],
    workflow: [
      "After PO approval, open PO gate pass and create gate pass for selected PO items.",
      "When material is received, open Quality check.",
      "Enter received, approved, rejected and returned quantities with remarks.",
      "Approved quantity updates store stock.",
      "Open GRN creation and create GRN against approved QC.",
      "Print gate pass, QC report and GRN for file and audit."
    ],
    controls: [
      "Rejected and returned quantities should remain visible against the QC record.",
      "Approved QC quantity should match what is posted into storeitemsds2.",
      "GRN should link PO, vendor, store, gate pass and QC."
    ],
    links: [
      ["/purchase2-gate-pass", "PO gate pass"],
      ["/purchase2-quality-check", "Quality check"],
      ["/purchase2-grn-creation", "GRN creation"],
      ["/purchase2/storegatepassds2", "Store gate pass"],
      ["/purchase2/storequalitycheckds2", "Store quality check"],
      ["/purchase2/storegrnds2", "Store GRN"]
    ]
  },
  {
    title: "Reports, Prints And Audit Evidence",
    summary: "Purchase 2 print and dashboard pages are designed to produce clean evidence for purchase files and management monitoring.",
    business: [
      "Printable documents reduce manual formatting and standardize files across departments and stores.",
      "Dashboard helps management monitor PR, PO, local purchase, process status and category-level spend."
    ],
    workflow: [
      "Use print buttons on Indent, PR, PO, Gate Pass, Quality Check, GRN and Local PO pages.",
      "Confirm institution name, logo and address are updated in Institution details under Settings.",
      "Upload user signatures before expecting signatures in PO print.",
      "Use Purchase 2 dashboard for monthly PR/PO, department indent and category spend review."
    ],
    controls: [
      "Prints should use black text, A4 layout, hidden app menu and signature blocks.",
      "Institution details should come from insdetails, not hardcoded text.",
      "Use dynamic filters and export grids before month-end audit meetings."
    ],
    links: [
      ["/purchase2-dashboard", "Purchase 2 dashboard"],
      ["/insdetails", "Institution details"],
      ["/user-signature-upload", "User signature upload"]
    ]
  },
  {
    title: "Common Issues And Checks",
    summary: "Use these checks when users report missing departments, stores, PRs, POs or print fields.",
    workflow: [
      "If department is not visible, check Department indent and creatoruserid mapping.",
      "If store is not visible, check Store users mapping for the logged-in user.",
      "If item is missing, check Item master status and item type/category setup.",
      "If PO creator cannot see PR, check Store PO assignment and assigned user email.",
      "If vendor does not auto select, check vendoritemsds2 item mapping and rate data.",
      "If signature is missing, check User signature upload for creator or approver email.",
      "If institution header is wrong, update Institution details in Settings."
    ],
    controls: [
      "Do not manually edit child item rows unless the header status is understood.",
      "Avoid deleting live PR/PO/QC/GRN records after approval; use status fields and remarks where possible."
    ],
    links: [
      ["/purchase2/itemmasterds2", "Item master"],
      ["/purchase2/storeusersds2", "Store users"],
      ["/purchase2/vendoritemsds2", "Vendor items"],
      ["/purchase2/storepoassignmentds2", "Store PO assignment"]
    ]
  }
];

const admissionSections = [
  {
    title: "Admission Form Design",
    summary: "Create multiple dynamic admission forms with page, section, custom fields, special panels, document lists, validation criteria, share links, QR codes, and public application flows.",
    workflow: [
      "Open Dynamic Admission Form and create or select the admission form for the campaign.",
      "Add standard custom fields with page, section, field order, type, options, and required flag.",
      "Use special panels for address configuration, board or university details, and education marks where applicable.",
      "Add Form Documents for the selected form so the applicant sees the right photo and document upload boxes.",
      "Copy or print the relevant share link, including tabbed, grouped, draft, AI validation, subject-wise, and credential-based forms."
    ],
    useCases: [
      "Run separate admission forms for UG, PG, school, professional, resident, or short-term programs while saving data in one admission model.",
      "Create different document checklists and AI validation rules for different forms or levels.",
      "Share public admission links through website, QR code, email, prospectus, WhatsApp, or campaign landing pages."
    ],
    controls: [
      "Always verify formid, colid, level, and program filters before sharing a public link.",
      "Keep custom field names stable after applications are received because reports and bulk uploads use those keys.",
      "Use validation criteria only where mandatory rules are clear; optional validation should inform, not block, submission."
    ],
    links: [
      ["/dynamic-admission-form", "Dynamic admission form"],
      ["/admission-form-documents", "Form documents"],
      ["/admission-validation-criteria", "Validation criteria"],
      ["/admission-address-configuration", "Address configuration"],
      ["/admission-board-configuration", "Board configuration"]
    ]
  },
  {
    title: "Applications, Profiles, And Application Management",
    summary: "View all submitted applications, open profile views, perform dynamic filtering, bulk upload applications, change statuses, send emails, and maintain complete applicant records.",
    workflow: [
      "Use Admission Applications for the regular application list with profile, subject profile, compact Profile 2, and delete options.",
      "Use Application Management when dynamic filters across all forms and custom fields are required.",
      "Select rows for bulk status changes, bulk delete, or email messaging through the configured default Gmail provider.",
      "Open Profile 2 when a compact A4 print view is required with all form fields, blank fields, photos, and document checklist status.",
      "Use Admission Bulk Upload when legacy or offline applicant data must be uploaded into the dynamic admission model."
    ],
    useCases: [
      "Admission office verifies applications, checks missing documents, exports lists, and follows up with applicants.",
      "Counselors or admission coordinators can filter by year, program, name, email, phone, custom fields, validation, and status.",
      "Institutions can migrate existing admission applications and still generate profile and acknowledgement records."
    ],
    controls: [
      "Duplicate email and phone rules may block uploads; review upload errors and generated usernames/passwords.",
      "Use bulk delete carefully because it removes application records for selected rows.",
      "When sending credentials by email, select include username and password only for the intended recipients."
    ],
    links: [
      ["/dynamic-admission-applications", "Admission applications"],
      ["/admission-application-management", "Application management"],
      ["/dynamic-admission-bulk-upload", "Admission bulk upload"],
      ["/subject-wise-admission", "Subject wise admission"],
      ["/dynamic-admission-sort", "Admission sort"]
    ]
  },
  {
    title: "Admission-To-Student Conversion",
    summary: "Convert applied applicants into users or students with regulation, program, semester, major, minor, IDC, seat checks, registration number generation, password generation, and welcome email.",
    workflow: [
      "Open Admission To User and search applicants by dynamic filters.",
      "Select academic year, regulation, program, semester, category, major, minor, IDC, section, and samestate where relevant.",
      "Generate or edit registration number using the configured rule and current admitted count.",
      "Optionally generate a strong password and send the welcome email with username and password.",
      "On admission, the application status changes to Admitted and regno is saved back to the dynamic admission record."
    ],
    useCases: [
      "Confirm admission after document verification, fee payment, seat availability, and approval decisions.",
      "Handle general admission in bulk from application management with roll number and regno generation.",
      "Maintain a traceable link between applicant record and final student user record."
    ],
    controls: [
      "Major and minor seat availability checks should be reviewed before admitting students in restricted categories.",
      "Program code in the textbox is used for registration number generation; confirm it before generating regno.",
      "Mandatory user fields should be populated or defaulted before creating the student user."
    ],
    links: [
      ["/dynamic-admission-to-user", "Admission to user"],
      ["/admission-application-management", "Application management"],
      ["/studentdataupload", "Student data upload"],
      ["/studentdetails", "Student details"]
    ]
  },
  {
    title: "Admission Fees, Payments, And Receipts",
    summary: "Configure application and provisional admission fees, collect online payments, track payment gateways, and generate admission fee receipts for applicants and administrators.",
    workflow: [
      "Define Application Fee by academic year, program, program code, amount, and active flag.",
      "Define Provisional Admission Fee where applicable for post-selection payment collection.",
      "Applicants pay application or provisional fee from the public form or application retrieval page through the selected gateway.",
      "Use Admission Payments to review application and provisional payments with filters and print/export options.",
      "Use Admission Fee Receipt to select a payment and generate a printable receipt with logo, address, item, amount, reference number, and pay date."
    ],
    useCases: [
      "Collect application fees before submission or after acknowledgement depending on the public form flow.",
      "Collect provisional fees only after application fee is paid, unless application fee is not configured.",
      "Provide receipt reprint support from both applicant and admin interfaces."
    ],
    controls: [
      "Payment gateway master must contain active gateways; Easebuzz and ICICI follow internal processing flows.",
      "Return URL success must update reference number and payment details before receipt generation.",
      "Do not manually mark failed online payments as paid; reconcile with the payment status report."
    ],
    links: [
      ["/applicationfee", "Application fee"],
      ["/provisionaladmissionfee", "Provisional admission fee"],
      ["/admission-payments", "Admission payments"],
      ["/admission-fee-receipt", "Admission fee receipt"],
      ["/paymentgatewaymaster", "Payment gateway master"]
    ]
  },
  {
    title: "Reports, Letters, Cancellation, And Refunds",
    summary: "Create admission summaries, provisional offer/admission letters, payment reports, cancellation records, refund details, and refund letters with printable institution headers.",
    workflow: [
      "Use Admission Datewise Summary to view applications, application fees paid, and provisional fees paid across a date range.",
      "Use Generate Provisional Admission Letter and Generate Offer Letter for applicant or student communication.",
      "Use Admission Cancellation when admission is withdrawn and refund item details must be captured.",
      "Use Refund Details to audit refunds and Generate Refund Letter for a printable cancellation/refund letter.",
      "Use Admission Sort and reports to support merit, eligibility, and administrative review."
    ],
    useCases: [
      "Daily admission control room reporting by program, date, payment status, and application status.",
      "Generate formal letters for offer, provisional admission, cancellation, and refund processing.",
      "Track administrative charges, refunded amount, refund mode, refund reference, and refund date."
    ],
    controls: [
      "Cancellation changes user status and records refund details; verify student and fee rows before saving.",
      "Refund letters should be generated only after refund details are reviewed.",
      "Summary reports should be filtered by the correct date range and academic year."
    ],
    links: [
      ["/admission-datewise-summary", "Admission datewise summary"],
      ["/provisional-admission-letter", "Generate provisional admission letter"],
      ["/admissioncancellation", "Admission cancellation"],
      ["/admissionrefunddetails", "Refund details"],
      ["/admissionrefundletter", "Generate refund letter"]
    ]
  }
];

export function MenuManagementHelpPage() {
  return (
    <HelpDocPage
      title="Menu Management Help"
      subtitle="A practical guide to rolewise menus, programwise access, student menu design, direct navigation, and safe day-to-day menu administration."
      icon={<MenuBookIcon fontSize="large" />}
      sections={menuManagementSections}
      metrics={[
        { title: "Who Uses It", text: "System administrators and functional heads use menu management to expose the right pages to each role." },
        { title: "Daily Outcome", text: "Users see a focused menu, search pages faster, and avoid accidental access to sensitive workflows." },
        { title: "Audit Value", text: "Page-role entries provide a clear trail of which operational areas were made available to each role." }
      ]}
    />
  );
}

export function FeesHelpPage() {
  return (
    <HelpDocPage
      title="Fees Help"
      subtitle="Detailed operating manual for fee configuration, approval, application, ledger, payments, receipts, installments, cheques, reports, and student fee endpoints."
      icon={<CurrencyRupeeIcon fontSize="large" />}
      sections={feesSections}
      studentLinks={[
        ["/studentonlinefeepayment", "Pay fees online"],
        ["/studentonlinefeepayment2", "Pay fees online 2"],
        ["/studentmyonlinepaymentreport", "My online payments"],
        ["/studentfeesbalancereport", "Fees balance report"],
        ["/studentcounterfee2receipt", "Student fee receipts"],
        ["/studentledgerdetail", "Student fee ledger"]
      ]}
    />
  );
}

export function ExaminationHelpPage() {
  return (
    <HelpDocPage
      title="Examination Help"
      subtitle="End-to-end guide covering Examination Marks, Examination Model 2, Conduct Examination, hall tickets, student exam registration, paper workflows, grading, and blockchain verification."
      icon={<VerifiedIcon fontSize="large" />}
      sections={examinationSections}
      studentLinks={[
        ["/studentexamregistration", "Student exam registration"],
        ["/studentadmitcardnew", "Admit card new"],
        ["/studentneplmsquiz", "Student quiz"],
        ["/studentneplmslivequiz", "Student live quiz"],
        ["/studentattendance-summary", "My attendance summary"]
      ]}
    />
  );
}

export function ProfileHelpPage() {
  return (
    <HelpDocPage
      title="Profile, Layout, Documents, And Approval Help"
      subtitle="A rolewise profile governance guide for custom fields, edit layout, display layout, profile print, document upload, student interface, consent, and approvals."
      icon={<BadgeIcon fontSize="large" />}
      sections={profileSections}
      studentLinks={[
        ["/studentprofiledynamic", "Student profile edit"],
        ["/studentprofileprint", "Student profile print"],
        ["/userconsent", "Give consent"],
        ["/userconsentwithdraw", "Withdraw consent"]
      ]}
    />
  );
}

export function UserManagementHelpPage() {
  return (
    <HelpDocPage
      title="User Management Help"
      subtitle="Detailed guide for user and student creation, custom data, admission-to-user conversion, organization hierarchy, access, reporting, consent, profiles, transfer, cancellation, and refund workflows."
      icon={<GroupsIcon fontSize="large" />}
      sections={userManagementSections}
    />
  );
}

export function AcademicConfigurationHelpPage() {
  return (
    <HelpDocPage
      title="Academic Configuration Help"
      subtitle="Academic setup manual mapped to NEP structures, outcome-based education, curriculum mapping, admission setup, calendars, accreditation, and examination rules."
      icon={<SchoolIcon fontSize="large" />}
      sections={academicSections}
      nepMapping={[
        { title: "Multiple Entry And Flexible Curriculum", text: "Academic year, regulation, program, subject groups, electives, specialization, and delivery type support flexible program structures." },
        { title: "Multidisciplinary Learning", text: "Major, minor, AEC, SEC, VAC, IDC, elective enrollment, and specialization pages map academic choices to student records." },
        { title: "Outcome-Based Education", text: "Syllabus, CO list, Bloom taxonomy, assessment mapping, attainment, and grade rules support OBE reporting." },
        { title: "Accreditation Readiness", text: "Academic calendar, accreditation status, seat matrix, grade configuration, and course assessment help prepare NAAC/NBA/NIRF evidence." }
      ]}
    />
  );
}

export function AdmissionHelpPage() {
  return (
    <HelpDocPage
      title="Admission Help"
      subtitle="Detailed operating guide for dynamic admission forms, applicant profiles, documents, AI validation, bulk upload, admission conversion, payments, receipts, reports, cancellation, and refunds."
      icon={<ArticleIcon fontSize="large" />}
      sections={admissionSections}
      studentLinks={[
        ["/admission-application-lookup", "Retrieve application"],
        ["/admission-apply", "Public admission apply"],
        ["/admission-apply-grouped", "Grouped admission apply"],
        ["/admission-apply-tabbed-program", "Tabbed program admission"],
        ["/admission-ai-ph-documents", "AI validation admission with documents"],
        ["/admission-apply-subjects", "Subject admission apply"]
      ]}
      nepMapping={[
        { title: "Flexible Admission Form Design", text: "Multiple formids, pages, sections, panels, documents, and validation criteria let institutions run different admission processes under one model." },
        { title: "Evidence And Compliance", text: "Profile views, document checklists, validation comments, payment receipts, cancellation records, and refund letters support audit-ready admission evidence." },
        { title: "Student Lifecycle Linkage", text: "Admission-to-user conversion connects application records with student master, registration number, program structure, and downstream fees/LMS/exam workflows." }
      ]}
    />
  );
}

export function NepLmsHelpPage() {
  return (
    <HelpDocPage
      title="NEP LMS Help"
      subtitle="Complete user guide for workload, timetable, rooms, attendance, course workspace, AI content, quizzes, assignments, assessments, remedial, dashboards, and student learning interfaces."
      icon={<DashboardIcon fontSize="large" />}
      sections={nepLmsSections}
      studentLinks={[
        ["/studentdashboard", "Student dashboard"],
        ["/studentneplmsworkspace", "Student course workspace"],
        ["/studentneplmssequentialcontent", "Sequential content"],
        ["/studentneplmsquiz", "Quiz"],
        ["/studentneplmslivequiz", "Live quiz"],
        ["/studentneplmsremedial", "Remedial content"],
        ["/studentattendance-summary", "My attendance summary"],
        ["/studentelectiveapplication", "Elective application"],
        ["/studentelectives", "My electives"]
      ]}
      nepMapping={[
        { title: "Learner-Centric Pathways", text: "Sequential content, electives, class groups, remedial links, and dashboards support flexible learner journeys." },
        { title: "AI-Assisted Teaching", text: "Assignments, course material, lesson plans, quizzes, questions, evaluation, and remedial content can use Gemini or Ollama." },
        { title: "Continuous Assessment", text: "Quizzes, assignments, descriptive assessments, attendance, CO mapping, and attainment provide continuous evidence." },
        { title: "Governance And Analytics", text: "Master timetable, course progression, missing timetable, HoD dashboard, and student learning profile support daily academic monitoring." }
      ]}
    />
  );
}

export function RecruitmentHelpPage() {
  return (
    <HelpDocPage
      title="Recruitment Help"
      subtitle="Detailed guide for job posts, dynamic recruitment forms, candidate validation, AI shortlisting, candidate status, interview panels, panel members, job-panel mapping, and interview scheduling."
      icon={<GroupsIcon fontSize="large" />}
      sections={recruitmentHelpSections}
    />
  );
}

export function TranscriptHelpPage() {
  return (
    <HelpDocPage
      title="Transcription Meetings Help"
      subtitle="Operational guide for audio recording, AWS storage, Gemini transcription, translation, summaries, action items, meeting calendars, and printable minutes."
      icon={<ArticleIcon fontSize="large" />}
      sections={transcriptHelpSections}
    />
  );
}

export function PlacementCoordinatorHelpPage() {
  return (
    <HelpDocPage
      title="Placement Coordinator Help"
      subtitle="Guide for placement lead stages, custom lead data, bulk upload, visit planning, follow-up calendar, and day-to-day employer outreach tracking."
      icon={<AccountTreeIcon fontSize="large" />}
      sections={placementHelpSections}
    />
  );
}

export function AiHelpdeskHelpPage() {
  return (
    <HelpDocPage
      title="AI Helpdesk Help"
      subtitle="Guide for knowledgebase setup, public chatbot operation, AI answer generation, lead capture, and CRM handoff."
      icon={<DashboardIcon fontSize="large" />}
      sections={aiHelpdeskSections}
    />
  );
}

export function LibraryNewHelpPage() {
  return (
    <HelpDocPage
      title="Library New Help"
      subtitle="Detailed guide for multi-library setup, library access, book catalogue, barcode and QR workflows, issue, return, fine, OPAC, requests, inter-library transfer, loan, and reports."
      icon={<MenuBookIcon fontSize="large" />}
      sections={libraryHelpSections}
      studentLinks={[
        ["/student-library-opac", "Student OPAC"],
        ["/student-library-issued", "My issued books"]
      ]}
    />
  );
}

export function Purchase2HelpPage() {
  return (
    <HelpDocPage
      title="Purchase 2 Help"
      subtitle="Detailed operating manual for Purchase 2: master setup, store indent, allotment, PR, PO assignment, local PO, approval, gate pass, quality check, GRN, print evidence and troubleshooting."
      icon={<CurrencyRupeeIcon fontSize="large" />}
      sections={purchase2HelpSections}
      metrics={[
        { title: "Primary Users", text: "Requesters, store managers, purchase officers, PO creators, approvers, accounts and audit teams." },
        { title: "Daily Outcome", text: "Requests move from store demand to stock issue or purchase without losing quantity, approval or print evidence." },
        { title: "Audit Value", text: "Indent, PR, PO, gate pass, QC and GRN documents provide a traceable procurement file." }
      ]}
    />
  );
}

const codeEditorReadBackend = `const students = await db.User.find({ role: "Student" }, 100);

result = {
  title: "Student List",
  total: students.length,
  rows: students.map((s) => ({
    name: s.name,
    email: s.email,
    regno: s.regno,
    program: s.program,
    programcode: s.programcode,
    semester: s.semester,
    section: s.section
  }))
};`;

const codeEditorReadFrontend = `<!doctype html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 18px; color: #111827; }
    .card { display: inline-block; padding: 12px 14px; background: #ecfdf5; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <h2 id="title">Student List</h2>
  <div id="summary"></div>
  <div id="table"></div>

  <script>
    const output = window.myCodeContext?.backendOutput || {};
    const rows = output.rows || [];

    document.getElementById("title").textContent = output.title || "Student List";
    document.getElementById("summary").innerHTML = \`<div class="card">Total: \${output.total || rows.length}</div>\`;
    document.getElementById("table").innerHTML = \`
      <table>
        <thead>
          <tr><th>Name</th><th>Reg No</th><th>Email</th><th>Program</th><th>Semester</th><th>Section</th></tr>
        </thead>
        <tbody>
          \${rows.map((r) => \`
            <tr>
              <td>\${r.name || ""}</td>
              <td>\${r.regno || ""}</td>
              <td>\${r.email || ""}</td>
              <td>\${r.program || ""}</td>
              <td>\${r.semester || ""}</td>
              <td>\${r.section || ""}</td>
            </tr>
          \`).join("")}
        </tbody>
      </table>\`;
  </script>
</body>
</html>`;

const interactiveBackend = `const action = input.action || "initial";
const payload = input.payload || {};

if (action === "loadPrograms") {
  const programs = await db.mprograms.find({}, 500);
  result = {
    programs: programs
      .map((p) => ({
        program: p.program || p.programname || p.name || "",
        programcode: p.programcode || p.code || ""
      }))
      .filter((p) => p.program)
      .sort((a, b) => a.program.localeCompare(b.program))
  };
}

if (action === "loadStudentsByProgram") {
  const students = await db.User.find({
    role: "Student",
    program: payload.program,
    programcode: payload.programcode
  }, 500);

  result = {
    program: payload.program,
    programcode: payload.programcode,
    total: students.length,
    students: students.map((s) => ({
      name: s.name,
      email: s.email,
      phone: s.phone,
      regno: s.regno,
      semester: s.semester,
      section: s.section
    }))
  };
}

if (action === "initial") {
  result = { message: "Select a program and load students." };
}`;

const interactiveFrontend = `<!doctype html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 18px; color: #111827; }
    .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    select, button { padding: 8px 10px; font-size: 14px; }
    button { background: #2563eb; color: white; border: 0; border-radius: 6px; cursor: pointer; }
    button:disabled { background: #94a3b8; cursor: wait; }
    .card { display: inline-block; padding: 12px 14px; background: #ecfdf5; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <h2>Programwise Student List</h2>
  <div class="toolbar">
    <label>Program</label>
    <select id="program"><option value="">Loading programs...</option></select>
    <button id="loadBtn">Load Students</button>
    <span id="status"></span>
  </div>
  <div id="summary"></div>
  <div id="table"></div>

  <script>
    const programSelect = document.getElementById("program");
    const statusEl = document.getElementById("status");
    const loadBtn = document.getElementById("loadBtn");
    let programList = [];

    async function loadPrograms() {
      statusEl.textContent = "Loading programs...";
      const data = await window.myCodeApi.call("loadPrograms", {});
      programList = data.programs || [];
      programSelect.innerHTML = \`
        <option value="">Select program</option>
        \${programList.map((p, index) => \`
          <option value="\${index}">\${p.program} \${p.programcode ? "(" + p.programcode + ")" : ""}</option>
        \`).join("")}
      \`;
      statusEl.textContent = "";
    }

    async function loadStudents() {
      const index = programSelect.value;
      if (index === "") {
        alert("Please select program");
        return;
      }
      const selected = programList[Number(index)];
      loadBtn.disabled = true;
      statusEl.textContent = "Loading students...";
      try {
        const data = await window.myCodeApi.call("loadStudentsByProgram", selected);
        const rows = data.students || [];
        document.getElementById("summary").innerHTML = \`
          <div class="card"><b>\${data.program}</b> \${data.programcode || ""}: \${data.total || 0} student(s)</div>
        \`;
        document.getElementById("table").innerHTML = \`
          <table>
            <thead><tr><th>Name</th><th>Reg No</th><th>Email</th><th>Phone</th><th>Semester</th><th>Section</th></tr></thead>
            <tbody>\${rows.map((r) => \`
              <tr><td>\${r.name || ""}</td><td>\${r.regno || ""}</td><td>\${r.email || ""}</td><td>\${r.phone || ""}</td><td>\${r.semester || ""}</td><td>\${r.section || ""}</td></tr>
            \`).join("")}</tbody>
          </table>
        \`;
        statusEl.textContent = "Done";
      } catch (err) {
        statusEl.textContent = err.message || "Unable to load students";
      } finally {
        loadBtn.disabled = false;
      }
    }

    loadBtn.addEventListener("click", loadStudents);
    loadPrograms();
  </script>
</body>
</html>`;

const customModelsJson = `[
  {
    "name": "LocalTasks",
    "fields": ["title", "status", "amount", "duedate"]
  }
]`;

const customCrudBackend = `const action = input.action || "listTasks";
const payload = input.payload || {};

if (action === "createTask") {
  await custom.LocalTasks.create({
    title: payload.title,
    status: payload.status || "Open",
    amount: Number(payload.amount || 0),
    duedate: payload.duedate || ""
  });
  result = { message: "Task created" };
}

if (action === "updateTask") {
  await custom.LocalTasks.update(payload.id, {
    title: payload.title,
    status: payload.status,
    amount: Number(payload.amount || 0),
    duedate: payload.duedate || ""
  });
  result = { message: "Task updated" };
}

if (action === "deleteTask") {
  await custom.LocalTasks.delete(payload.id);
  result = { message: "Task deleted" };
}

if (action === "listTasks") {
  const rows = await custom.LocalTasks.find(payload.filters || {}, 200);
  result = {
    rows: rows.map((row) => ({
      id: row._id,
      ...row.data,
      updatedAt: row.updatedAt
    }))
  };
}`;

const customCrudFrontend = `<h2>Local Task CRUD</h2>
<input id="title" placeholder="Title">
<input id="amount" placeholder="Amount" type="number">
<select id="status"><option>Open</option><option>Done</option></select>
<button onclick="createTask()">Save Task</button>
<div id="rows"></div>

<script>
  async function createTask() {
    await window.myCodeApi.call("createTask", {
      title: document.getElementById("title").value,
      amount: document.getElementById("amount").value,
      status: document.getElementById("status").value
    });
    await loadTasks();
  }

  async function deleteTask(id) {
    await window.myCodeApi.call("deleteTask", { id });
    await loadTasks();
  }

  async function loadTasks() {
    const data = await window.myCodeApi.call("listTasks", {});
    const rows = data.rows || [];
    document.getElementById("rows").innerHTML = rows.map((row) => \`
      <div style="border:1px solid #ddd;padding:8px;margin:6px 0">
        <b>\${row.title || ""}</b> - \${row.status || ""} - \${row.amount || 0}
        <button onclick="deleteTask('\${row.id}')">Delete</button>
      </div>
    \`).join("");
  }

  loadTasks();
</script>`;

const myAiCoding2Prompt = `Create a report page for pending fees.
Use ledgerstud as the data source and enforce colid automatically.
The page should have dynamic filters for academic year, program, programcode, semester, feegroup and feeitem.
Show summary cards for total amount, paid, concession and balance.
Show a MUI DataGrid with wrapped cells, export option and print preview.
The page must be read-only. Do not create, update or delete records.
Use dropdown values from the selected model fields.`;

export function CodeEditorHelpPage() {
  const quickLinks = [
    ["/my-code-editor", "Code editor"],
    ["/my-code-editor-interactive", "Code editor interactive"],
    ["/my-ai-coding-2", "My AI coding 2"]
  ];

  return (
    <MenuPageShell title="Code editor help">
      <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#0f172a" }}>Code Editor Help</Typography>
              <Typography sx={{ color: "#475569", maxWidth: 1100, mt: 0.75 }}>
                This guide explains the one-way code editor, the interactive code editor, and My AI coding 2. It includes ready-to-use examples for reading existing ERP models, rendering frontend output, calling backend actions from frontend controls, and using custom document-backed models with CRUD.
              </Typography>
            </Box>
            <RouteButtons links={quickLinks} />
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            ["Existing ERP models", "Read only through db.Model.find/count/distinct. Create, update, delete and save are blocked."],
            ["Institution safety", "Every existing model read is automatically filtered by logged-in colid. Do not manually pass another colid."],
            ["Interactive calls", "Frontend preview uses window.myCodeApi.call(action, payload) to execute saved backend actions."],
            ["Custom models", "Custom rows are stored as scoped documents and can be created, updated, deleted and queried through custom.Model."]
          ].map(([title, textValue], index) => (
            <Grid item xs={12} md={3} key={title}>
              <Card sx={{ height: "100%", borderTop: `4px solid ${COLORS[index % COLORS.length]}`, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{title}</Typography>
                  <Typography variant="body2" sx={{ color: "#475569", mt: 0.75 }}>{textValue}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>1. Code editor: one-way backend to frontend</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            Use this when the backend prepares a result once, and the frontend only displays that result. Typical examples are reports, dashboards, lists, summaries and static previews.
          </Typography>
          <InfoList
            title="Steps"
            items={[
              "Open AI coding -> My code editor.",
              "Select existing models, for example Users. You may write db.User or db.Users in code.",
              "Write backend code and set result = ...",
              "Click Save, then Run Backend.",
              "Write frontend HTML/JS that reads window.myCodeContext.backendOutput.",
              "Click Run frontend from the saved grid row to preview the rendered page."
            ]}
          />
          <CodeBlock title="Backend example: read students from Users" code={codeEditorReadBackend} />
          <CodeBlock title="Frontend example: display backendOutput" code={codeEditorReadFrontend} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>2. Code editor interactive: frontend calls backend after user action</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            Use this when the frontend must react to user actions: load dropdowns, cascade selections, search, refresh a grid, load details on click, or run separate backend actions.
          </Typography>
          <InfoList
            title="Important objects"
            items={[
              "Frontend calls backend with window.myCodeApi.call(action, payload).",
              "Backend receives action as input.action and payload as input.payload.",
              "The backend code should branch by action and set result for each case.",
              "Existing ERP reads remain read-only and colid scoped.",
              "For program dropdown from mprograms and student data from Users, select both mprograms and Users in Connect existing models."
            ]}
          />
          <CodeBlock title="Backend example: load programs from mprograms, then students from Users" code={interactiveBackend} />
          <CodeBlock title="Frontend example: program dropdown and Load Students button" code={interactiveFrontend} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>3. Custom models: document-backed CRUD</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            Custom models do not create Mongoose models. They store rows in a safe document collection scoped by institution, logged-in user, code page and model name. Use this for page-local data, prototypes, temporary registers, or user-owned mini apps.
          </Typography>
          <InfoList
            title="Rules"
            items={[
              "Define custom model names in Custom models JSON.",
              "Use custom.Model.create, custom.Model.find, custom.Model.update, custom.Model.delete and custom.Model.count.",
              "Custom model CRUD is allowed because it is isolated from the main ERP collections.",
              "Existing ERP model CRUD remains blocked even inside the interactive editor."
            ]}
          />
          <CodeBlock title="Custom models JSON" code={customModelsJson} />
          <CodeBlock title="Backend example: LocalTasks CRUD actions" code={customCrudBackend} />
          <CodeBlock title="Frontend example: create, list and delete custom rows" code={customCrudFrontend} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>4. My AI coding 2: generate functional pages from selected ERP models</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            My AI coding 2 is used when the user wants AI to generate a page from a description. The page should still follow ERP safety rules: enforce colid, use selected models, honor role menu items, and keep create/update/delete only where explicitly required and safe.
          </Typography>
          <InfoList
            title="Recommended workflow"
            items={[
              "Open AI coding -> My AI coding 2.",
              "Select a menu group and page so the system can infer relevant models, or append selected models intentionally.",
              "Describe the page behavior clearly: filters, dropdown sources, cascades, grid columns, charts, cards, print preview and CRUD mode.",
              "For read-only reports, explicitly say read-only and no create/update/delete.",
              "For dropdowns, specify the source model and fields, for example academic year from exammodel2marks and program from mprograms.",
              "Generate the page, run it, then use refine commands to improve layout, filters, calculations or missing fields."
            ]}
          />
          <CodeBlock title="Prompt example: read-only pending fees report" code={myAiCoding2Prompt} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Troubleshooting</Typography>
          <InfoList
            title="Common issues"
            items={[
              "Cannot read properties of undefined reading find: select the model in Connect existing models or use the actual model alias, for example db.User for Users.",
              "No records showing: check whether the logged-in colid has data in that model. The system automatically adds colid to existing model reads.",
              "Create or update blocked: this is correct for existing ERP models. Use custom models for isolated CRUD.",
              "Frontend not showing latest backend result in one-way editor: click Run Backend first, then Run frontend.",
              "Interactive frontend request failed: save the page first, then use window.myCodeApi.call from the preview.",
              "Dropdown not loading: confirm backend action name in frontend matches input.action branch in backend code."
            ]}
          />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

const aiAgentStudentEmailCode = `const academicYear = input.academicyear || "2026-27";
const reportTo = input.to || "admin@example.com";

const students = await db.User.find({ role: "Student", academicyear: academicYear }, 5000);
const programMap = {};

for (const student of students) {
  const key = student.program || "Not specified";
  if (!programMap[key]) programMap[key] = { program: key, count: 0 };
  programMap[key].count += 1;
}

const rows = Object.values(programMap).sort((a, b) => a.program.localeCompare(b.program));
const htmlRows = rows.map((row) =>
  \`<tr><td style="border:1px solid #ccc;padding:6px">\${row.program}</td><td style="border:1px solid #ccc;padding:6px;text-align:right">\${row.count}</td></tr>\`
).join("");

await email.send({
  to: reportTo,
  subject: \`Programwise student count for \${academicYear}\`,
  html: \`
    <h2>Programwise student count</h2>
    <p>Academic year: <b>\${academicYear}</b></p>
    <table style="border-collapse:collapse;width:100%">
      <thead><tr><th style="border:1px solid #ccc;padding:6px;text-align:left">Program</th><th style="border:1px solid #ccc;padding:6px;text-align:right">Students</th></tr></thead>
      <tbody>\${htmlRows}</tbody>
    </table>
  \`
});

result = {
  message: "Report generated and emailed",
  academicYear,
  totalStudents: students.length,
  rows
};`;

const aiAgentAwsValidationCode = `const academicYear = input.academicyear || "2026-27";
const reportTo = input.to || "iqac@example.com";
const limit = Number(input.limit || 100);

const awsDefault = await aws.defaultConfig();
if (!awsDefault) throw new Error("Default AWS configuration is missing");

const projects = await db.dashmprojects.find({ academicyear: academicYear, submissionstatus: "Submitted" }, limit);
const publications = await db.dashmpublications.find({ academicyear: academicYear, submissionstatus: "Submitted" }, limit);

const missingProjectFiles = projects.filter((row) => !row.filelink).map((row) => ({
  id: row._id,
  title: row.title || row.projecttitle || "",
  user: row.user || row.useremail || ""
}));

const missingPublicationFiles = publications.filter((row) => !row.filelink).map((row) => ({
  id: row._id,
  title: row.title || row.papertitle || "",
  user: row.user || row.useremail || ""
}));

const report = {
  academicYear,
  generatedAt: new Date().toISOString(),
  projectSubmissions: projects.length,
  publicationSubmissions: publications.length,
  missingProjectFiles,
  missingPublicationFiles
};

const upload = await aws.uploadJson({
  key: \`ai-agents/accreditation/\${academicYear}/document-check-\${Date.now()}.json\`,
  data: report
});

await email.send({
  to: reportTo,
  subject: \`Document check report uploaded for \${academicYear}\`,
  html: \`
    <h2>Document check completed</h2>
    <p>Academic year: <b>\${academicYear}</b></p>
    <p>Projects checked: <b>\${projects.length}</b></p>
    <p>Publications checked: <b>\${publications.length}</b></p>
    <p>Report uploaded to AWS: <a href="\${upload.url}">\${upload.url}</a></p>
  \`
});

result = {
  message: "Database checked, report uploaded to AWS, email sent",
  academicYear,
  awsReportLink: upload.url,
  report
};`;

const aiAgentGeminiValidationCode = `const framework = input.framework || "NAAC";
const academicYear = input.academicyear || "2026-27";
const reportTo = input.to || "iqac@example.com";

const submissions = await db.dashmprojects.find({ academicyear: academicYear, submissionstatus: "Submitted" }, 25);

const compactRows = submissions.map((row) => ({
  id: row._id,
  title: row.title || row.projecttitle || "",
  agency: row.agency || row.sanctioningagency || "",
  amount: row.amount || row.grantamount || "",
  filelink: row.filelink || "",
  status: row.submissionstatus || ""
}));

const validationPrompt = \`
You are validating institutional project records for \${framework}.
Check for test data, missing agency, missing amount, missing document link, unrealistic values,
and whether each record appears ready for accreditation evidence review.
Return strict JSON with summary, records, riskLevel and recommendations.
Records:
\${JSON.stringify(compactRows, null, 2)}
\`;

const geminiText = await gemini.generate({
  model: input.model || "gemini-2.5-flash-lite",
  prompt: validationPrompt
});

const upload = await aws.uploadText({
  key: \`ai-agents/gemini-validation/\${academicYear}/project-validation-\${Date.now()}.txt\`,
  text: geminiText,
  contentType: "text/plain"
});

await email.send({
  to: reportTo,
  subject: \`\${framework} Gemini validation report for \${academicYear}\`,
  html: \`
    <h2>Gemini validation completed</h2>
    <p>Academic year: <b>\${academicYear}</b></p>
    <p>Records sent to Gemini: <b>\${compactRows.length}</b></p>
    <p>Validation file: <a href="\${upload.url}">\${upload.url}</a></p>
    <pre style="white-space:pre-wrap">\${geminiText}</pre>
  \`
});

result = {
  message: "Gemini validation completed, uploaded to AWS, and emailed",
  academicYear,
  framework,
  checked: compactRows.length,
  validationText: geminiText,
  validationLink: upload.url
};`;

const aiAgentCreateUpdateCode = `const today = new Date();
const faculties = await db.User.find({ role: "Faculty", excluded: { $ne: "Yes" } }, 1000);
const rows = [];

for (const faculty of faculties) {
  const workloadCount = await db.workloadassignmentds.count({ facultyemail: faculty.email });
  const courseMaterialCount = await db.neplmscoursematerialds.count({ facultyemail: faculty.email });

  rows.push({
    faculty: faculty.name,
    facultyemail: faculty.email,
    workloadCount,
    courseMaterialCount,
    status: workloadCount > 0 && courseMaterialCount > 0 ? "OK" : "Attention required"
  });

  await db.User.updateOne(
    { email: faculty.email },
    { lastAgentCheckDate: today }
  );
}

await email.send({
  to: input.to || "dean@example.com",
  subject: "Faculty LMS readiness check",
  html: rows.map((row) =>
    \`<p><b>\${row.faculty}</b> - Workload: \${row.workloadCount}, Materials: \${row.courseMaterialCount}, Status: \${row.status}</p>\`
  ).join("")
});

result = {
  message: "Faculty LMS readiness checked",
  checked: rows.length,
  rows
};`;

const aiAgentPromptExample = `Create an agent for accreditation compliance.
Use Users, dashmprojects, dashmpublications, dashmseminar and organizationhierarchy.
Read only active faculty users for the logged-in institution.
Check academic year from input.academicyear.
Find faculty below target: projects per faculty, publications per faculty and seminars per faculty.
Send a summary email to input.to.
Return JSON with facultywise gaps and departmentwise summary.
Do not delete any data.`;

export function AiAgentCodingHelpPage() {
  const quickLinks = [
    ["/ai-coding-agents", "AI Agents"],
    ["/my-ai-coding-2", "My AI coding 2"],
    ["/my-code-editor-interactive", "Interactive code editor"]
  ];

  return (
    <MenuPageShell title="AI Agent Coding help">
      <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#0f172a" }}>AI Agent Coding</Typography>
              <Typography sx={{ color: "#475569", maxWidth: 1100, mt: 0.75 }}>
                AI Agents are scheduled or manual scripts that run inside the ERP with strict institution scoping. They can read, create and update selected models, send email through saved configuration, and read AWS configuration metadata. Delete operations are blocked.
              </Typography>
            </Box>
            <RouteButtons links={quickLinks} />
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            ["Institution scoped", "Existing model access is automatically filtered by logged-in colid."],
            ["No delete", "Delete, remove and destructive operations are blocked in generated and manual agent code."],
            ["Email ready", "Use email.send to send reports through saved mail configuration."],
            ["AWS aware", "Use aws.defaultConfig and aws.configs to inspect saved AWS setup and links."]
          ].map(([title, textValue], index) => (
            <Grid item xs={12} md={3} key={title}>
              <Card sx={{ height: "100%", borderTop: `4px solid ${COLORS[index % COLORS.length]}`, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{title}</Typography>
                  <Typography variant="body2" sx={{ color: "#475569", mt: 0.75 }}>{textValue}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>How to create an agent</Typography>
          <InfoList
            title="Steps"
            items={[
              "Open AI Coding -> AI Agents.",
              "Enter title, description and select Active as Yes.",
              "Select the models the agent may use. Existing model access is always colid scoped.",
              "Write agent code manually or generate it from a Gemini/Ollama prompt.",
              "Add sample input JSON for manual test runs, for example { \"academicyear\": \"2026-27\", \"to\": \"admin@example.com\" }.",
              "Choose Manual, Scheduled or Both. For scheduled agents, select weekly day and run time.",
              "Save the agent, then use Run selected agent to test. Read Run Output and Logs below the form."
            ]}
          />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Available runtime objects</Typography>
          <InfoList
            title="Agent objects"
            items={[
              "input: JSON input supplied during manual run or saved sample input during scheduled run.",
              "db.Model.find(filter, limit): reads selected existing model rows. Colid is injected automatically.",
              "db.Model.count(filter) and db.Model.distinct(field, filter): read summary data from selected models.",
              "db.Model.create(data), updateOne(filter, update), updateMany(filter, update) and findOneAndUpdate(filter, update): allowed for selected models, with colid enforced.",
              "email.send({ to, cc, bcc, subject, html, text }): sends email using saved email configuration.",
              "aws.defaultConfig() and aws.configs(): reads saved AWS configuration metadata for links and validation workflows.",
              "aws.uploadText({ key, text, contentType }), aws.uploadJson({ key, data }) and aws.uploadBase64({ key, base64, contentType }): upload generated agent output to the default or selected AWS configuration.",
              "gemini.generate({ prompt, model }): calls Gemini from inside the running agent using saved AI configuration.",
              "result: assign final JSON output to result so it appears in Run Output."
            ]}
          />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Complete example: programwise student count and email</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            This agent reads students for an academic year, creates a programwise count, emails the report, and returns the same summary in Run Output.
          </Typography>
          <CodeBlock title="Sample input JSON" code={`{ "academicyear": "2026-27", "to": "admin@example.com" }`} />
          <CodeBlock title="Agent code" code={aiAgentStudentEmailCode} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Complete example: check database, upload to AWS and email</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            This agent checks submitted project and publication records, creates a JSON report, uploads it to AWS using the saved configuration, then emails the uploaded report link.
          </Typography>
          <CodeBlock title="Sample input JSON" code={`{ "academicyear": "2026-27", "limit": 100, "to": "iqac@example.com" }`} />
          <CodeBlock title="Agent code" code={aiAgentAwsValidationCode} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Complete example: call Gemini to validate records</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            This agent reads project submissions, sends compact evidence data to Gemini for validation, uploads Gemini's validation response to AWS, and emails the result.
          </Typography>
          <CodeBlock title="Sample input JSON" code={`{ "academicyear": "2026-27", "framework": "NAAC", "model": "gemini-2.5-flash-lite", "to": "iqac@example.com" }`} />
          <CodeBlock title="Agent code" code={aiAgentGeminiValidationCode} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Complete example: update records and email summary</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            This agent checks faculty LMS readiness and updates a harmless last-check date on the user record. Replace model names with the exact models selected on the page.
          </Typography>
          <CodeBlock title="Sample input JSON" code={`{ "to": "dean@example.com" }`} />
          <CodeBlock title="Agent code" code={aiAgentCreateUpdateCode} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Prompt generation example</Typography>
          <Typography sx={{ color: "#475569", mb: 1 }}>
            Use Gemini or Ollama to draft the code, then review the generated agent before saving. Gemini model selection supports the configured model list, including newer and higher-capability models when available in the backend configuration.
          </Typography>
          <CodeBlock title="Prompt" code={aiAgentPromptExample} />
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Troubleshooting</Typography>
          <InfoList
            title="Common checks"
            items={[
              "If db.Model is undefined, select that model in the model selector and use the exact alias shown on the page.",
              "If no records appear, verify the logged-in institution has rows for that model. Colid filtering is automatic.",
              "If email fails, check saved email configuration and make sure to, subject and html or text are supplied.",
              "If AWS data is missing, configure AWS in the existing AWS settings flow. Agents read configuration; file uploads should continue using the existing AWS upload flow.",
              "If a scheduled run does not execute, confirm Active is Yes, schedule mode is Scheduled or Both, weekly day and run time match server time, and the scheduler is running.",
              "If generated code includes delete/remove/drop, remove it. The runtime blocks destructive operations."
            ]}
          />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

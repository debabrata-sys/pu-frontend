import React from "react";
import { Box, Button, Card, CardContent, Grid, Paper, Stack, Typography } from "@mui/material";
import { AutoStories, Checklist, Map, School } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import MenuPageShell from "./MenuPageShell";

const steps = [
  {
    title: "Regulation Course Map",
    path: "/regulationcoursemap",
    icon: <Map />,
    description: "Map academic year, regulation, program, semester, course, course code, credits, delivery type, faculty, institution, and department.",
    outcome: "This becomes the master course source for LMS, assessments, timetable, examinations, and reports."
  },
  {
    title: "Syllabus",
    path: "/syllabus",
    icon: <AutoStories />,
    description: "Create modules and topics for each mapped course, with bulk upload and AI generation where available.",
    outcome: "Modules and topics feed lesson plans, online examination question mapping, LMS content, and course progression reports."
  },
  {
    title: "CO List",
    path: "/colist",
    icon: <Checklist />,
    description: "Define course outcomes, CO numbers, descriptions, Bloom taxonomy levels, and related attainment inputs.",
    outcome: "CO data supports assessment mapping, question mapping, attainment calculation, and academic audit reporting."
  }
];

export default function FacultyAcademicWizardPage() {
  const navigate = useNavigate();
  return (
    <MenuPageShell title="Faculty Wizard">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5, border: "1px solid #e5e7eb" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#e0f2fe", color: "#075985" }}>
                <School />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={900}>Faculty Academic Wizard</Typography>
                <Typography color="text.secondary">
                  Complete the academic setup in sequence: course mapping, syllabus, and course outcomes.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {steps.map((step, index) => (
              <Grid item xs={12} md={4} key={step.title}>
                <Card sx={{ height: "100%", border: "1px solid #e5e7eb", boxShadow: "none" }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: index === 0 ? "#dcfce7" : index === 1 ? "#fef3c7" : "#ede9fe", color: index === 0 ? "#166534" : index === 1 ? "#92400e" : "#5b21b6" }}>
                          {step.icon}
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Step {index + 1}</Typography>
                          <Typography fontWeight={900}>{step.title}</Typography>
                        </Box>
                      </Stack>
                      <Typography color="text.secondary">{step.description}</Typography>
                      <Typography variant="body2" fontWeight={700}>{step.outcome}</Typography>
                      <Button variant="contained" onClick={() => navigate(step.path)}>Open {step.title}</Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ p: 2.5, border: "1px solid #e5e7eb" }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Recommended Flow</Typography>
            <Grid container spacing={1.5}>
              {[
                "First create or verify Regulation Course Map rows for the course.",
                "Next add syllabus modules and topics for the mapped course.",
                "Then add COs and Bloom levels so assessments and online questions can be mapped correctly."
              ].map((item, index) => (
                <Grid item xs={12} md={4} key={item}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "#fff", border: "1px solid #e5e7eb", height: "100%" }}>
                    <Typography variant="caption" color="text.secondary">Checkpoint {index + 1}</Typography>
                    <Typography>{item}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

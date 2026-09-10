import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { SmartToy, SubdirectoryArrowRight } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

function BotBubble({ children }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar sx={{ bgcolor: "#e0f2fe", color: "#075985" }}><SmartToy /></Avatar>
      <Paper sx={{ p: 2, bgcolor: "#fff", border: "1px solid #e5e7eb", borderRadius: 3, maxWidth: 900 }}>
        {children}
      </Paper>
    </Stack>
  );
}

function UserBubble({ children }) {
  return (
    <Stack direction="row" justifyContent="flex-end">
      <Paper sx={{ p: 1.5, bgcolor: "#2563eb", color: "#fff", borderRadius: 3, maxWidth: 720 }}>
        <Typography fontWeight={800}>{children}</Typography>
      </Paper>
    </Stack>
  );
}

const sortRows = (rows) => [...rows].sort((a, b) => Number(a.slno || 0) - Number(b.slno || 0) || String(a.pagename || "").localeCompare(String(b.pagename || "")));

export default function AiChatbotHelpPage() {
  const navigate = useNavigate();
  const chatBottomRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeParent, setActiveParent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = global1.role || "All";

  const children = useMemo(() => sortRows(rows.filter((row) => Number(row.parentslno || 0) === Number(activeParent || 0))), [rows, activeParent]);

  const loadRows = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ep1.get("/api/v2/ai-chatbot-definition-role", {
        params: { colid: global1.colid, role }
      });
      const data = res.data?.data || [];
      setRows(data);
      setActiveParent(0);
      setMessages([
        {
          from: "bot",
          text: `Hello ${global1.name || ""}. Select an option below to continue.`
        }
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load AI chatbot help");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, children]);

  const choose = (item) => {
    setMessages((prev) => [...prev, { from: "user", text: item.pagename }]);
    if (item.type === "link") {
      setMessages((prev) => [...prev, { from: "bot", text: `Opening ${item.pagename}.` }]);
      if (item.pagelink) navigate(item.pagelink);
      return;
    }
    const nextChildren = rows.filter((row) => Number(row.parentslno || 0) === Number(item.slno || 0));
    setActiveParent(item.slno);
    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: nextChildren.length ? `Choose one option under ${item.pagename}.` : `No child options are configured under ${item.pagename}.`
      }
    ]);
  };

  const goHome = () => {
    setActiveParent(0);
    setMessages((prev) => [...prev, { from: "bot", text: "Back to main options." }]);
  };

  return (
    <MenuPageShell title="AI Chatbot Help">
      <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100vh", p: { xs: 1.5, md: 3 } }}>
        <Paper sx={{ minHeight: 680, display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb", bgcolor: "#fff" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
              <Box>
                <Typography variant="h5" fontWeight={900}>AI Chatbot Help</Typography>
                <Typography color="text.secondary">Role: {role}. Select buttons to navigate through configured help links.</Typography>
              </Box>
              <Button variant="outlined" onClick={loadRows} disabled={loading}>Reload</Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {loading && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} />
                  <Typography>Loading chatbot options...</Typography>
                </Stack>
              )}
              {!loading && !rows.length && (
                <Alert severity="warning">No AI chatbot definition has been configured for role {role}.</Alert>
              )}

              {messages.map((message, index) => (
                message.from === "user"
                  ? <UserBubble key={`${message.from}-${index}`}>{message.text}</UserBubble>
                  : (
                    <BotBubble key={`${message.from}-${index}`}>
                      <Typography fontWeight={800}>{message.text}</Typography>
                    </BotBubble>
                  )
              ))}

              {!!rows.length && (
                <BotBubble>
                  <Stack spacing={1}>
                    <Typography fontWeight={900}>{Number(activeParent || 0) === 0 ? "Main options" : "Next options"}</Typography>
                    {Number(activeParent || 0) !== 0 && (
                      <Button size="small" variant="text" onClick={goHome} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
                        Back to main options
                      </Button>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {children.map((item) => (
                        <Button
                          key={item._id}
                          variant={item.type === "link" ? "contained" : "outlined"}
                          startIcon={<SubdirectoryArrowRight />}
                          onClick={() => choose(item)}
                          sx={{
                            borderRadius: 999,
                            textTransform: "none",
                            whiteSpace: "normal",
                            textAlign: "left",
                            maxWidth: { xs: "100%", md: 460 }
                          }}
                        >
                          {item.pagename}
                        </Button>
                      ))}
                      {!children.length && (
                        <Typography color="text.secondary">No options are configured at this level.</Typography>
                      )}
                    </Stack>
                  </Stack>
                </BotBubble>
              )}
              <div ref={chatBottomRef} />
            </Stack>
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

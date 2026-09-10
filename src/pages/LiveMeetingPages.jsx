import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import io from "socket.io-client";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import {
  Add,
  CallEnd,
  ContentCopy,
  Delete,
  Fullscreen,
  Logout,
  Mic,
  MicOff,
  RadioButtonChecked,
  Refresh,
  ScreenShare,
  Stop,
  StopScreenShare,
  Videocam,
  VideocamOff
} from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const pad = (value) => String(value).padStart(2, "0");
const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localDateTime = (date) => `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const parseDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const startOfWeek = (date) => addDays(date, -date.getDay());
const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};
const sameDay = (a, b) => localDate(parseDate(a)) === localDate(parseDate(b));
const currentEmail = () => String(global1.email || global1.user || "").trim().toLowerCase();
const socketBaseUrl = () => {
  const base = ep1.defaults?.baseURL || window.location.origin;
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const emptyForm = (start = new Date()) => {
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    id: "",
    hostName: global1.name || "",
    hostEmail: currentEmail(),
    title: "",
    description: "",
    startDateTime: localDateTime(start),
    endDateTime: localDateTime(end),
    internalParticipants: [],
    externalEmails: "",
    sendExternalEmail: false,
    meetingLink: "",
    externalMeetingLink: ""
  };
};

const calendarRange = (view, anchorDate) => {
  if (view === "day") return { start: anchorDate, end: endOfDay(anchorDate) };
  if (view === "week") {
    const start = startOfWeek(anchorDate);
    return { start, end: endOfDay(addDays(start, 6)) };
  }
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const end = endOfDay(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0));
  return { start, end };
};

function MeetingCard({ meeting, onClick }) {
  return (
    <Box
      onDoubleClick={(event) => {
        event.stopPropagation();
        onClick(meeting);
      }}
      onClick={(event) => event.stopPropagation()}
      sx={{
        p: 0.8,
        my: 0.45,
        borderRadius: 1,
        bgcolor: "#ecfdf5",
        border: "1px solid #86efac",
        cursor: "pointer"
      }}
    >
      <Typography variant="caption" fontWeight={900} sx={{ color: "#064e3b", display: "block" }}>
        {parseDate(meeting.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {meeting.title}
      </Typography>
      <Typography variant="caption" sx={{ color: "#111827", display: "block" }}>{meeting.hostName}</Typography>
    </Box>
  );
}

export function LiveMeetingCalendarPage({ enhanced = false, meetingRoomPath }) {
  const navigate = useNavigate();
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(localDate(new Date()));
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const anchorDate = useMemo(() => parseDate(anchor), [anchor]);
  const range = useMemo(() => calendarRange(view, anchorDate), [view, anchorDate]);
  const hours = Array.from({ length: 14 }, (_, index) => index + 7);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchorDate), index));
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(startOfWeek(monthStart), index));

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [view, anchor]);

  const loadUsers = async (q = "") => {
    try {
      const res = await ep1.get("/api/v2/live-meeting-users", { params: { colid: global1.colid, q } });
      setUsers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to load users");
    }
  };

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const res = await ep1.get("/api/v2/live-meetings", {
        params: {
          colid: global1.colid,
          start: range.start.toISOString(),
          end: range.end.toISOString()
        }
      });
      setMeetings(res.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to load live meetings");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = (date) => {
    setForm(emptyForm(date));
    setDialogOpen(true);
  };

  const openEdit = (meeting) => {
    setForm({
      id: meeting._id,
      hostName: meeting.hostName || "",
      hostEmail: meeting.hostEmail || "",
      title: meeting.title || "",
      description: meeting.description || "",
      startDateTime: localDateTime(parseDate(meeting.startDateTime)),
      endDateTime: localDateTime(parseDate(meeting.endDateTime)),
      internalParticipants: meeting.internalParticipants || [],
      externalEmails: (meeting.externalParticipantEmails || []).join(", "),
      sendExternalEmail: false,
      meetingLink: meeting.meetingLink || "",
      externalMeetingLink: meeting.externalMeetingLink || ""
    });
    setDialogOpen(true);
  };

  const saveMeeting = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const roomPath = meetingRoomPath || (enhanced ? "/live-meeting-room-2" : "/live-meeting-room");
      const res = await ep1.post("/api/v2/live-meetings", {
        ...form,
        colid: global1.colid,
        origin: window.location.origin,
        createdBy: global1.user || currentEmail(),
        senderName: global1.name || global1.user,
        roomPath,
        sendExternalEmail: form.sendExternalEmail ? "Yes" : "No"
      });
      setForm((prev) => ({
        ...prev,
        id: res.data._id,
        meetingLink: res.data.meetingLink || "",
        externalMeetingLink: res.data.externalMeetingLink || ""
      }));
      setMessage(res.data?.emailResult ? `Meeting saved. Email sent to ${res.data.emailResult.sent} external participant(s).` : "Meeting saved");
      loadMeetings();
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to save live meeting");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async () => {
    if (!form.id || !window.confirm("Delete this meeting?")) return;
    try {
      await ep1.post("/api/v2/live-meetings-delete", { id: form.id, colid: global1.colid });
      setDialogOpen(false);
      setMessage("Meeting deleted");
      loadMeetings();
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to delete meeting");
    }
  };

  const dayMeetings = (date) => meetings.filter((item) => sameDay(item.startDateTime, date));
  const hourMeetings = (date, hour) => dayMeetings(date).filter((item) => parseDate(item.startDateTime).getHours() === hour);
  const shift = (amount) => {
    if (view === "day") setAnchor(localDate(addDays(anchorDate, amount)));
    if (view === "week") setAnchor(localDate(addDays(anchorDate, amount * 7)));
    if (view === "month") setAnchor(localDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + amount, 1)));
  };
  const copyLink = async (value) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setMessage("Meeting link copied");
  };

  const renderDaily = () => (
    <Grid container spacing={1}>
      {hours.map((hour) => {
        const slot = new Date(anchorDate);
        slot.setHours(hour, 0, 0, 0);
        return (
          <Grid item xs={12} key={hour}>
            <Box onDoubleClick={() => openCreate(slot)} sx={{ display: "grid", gridTemplateColumns: "90px 1fr", minHeight: 76, border: "1px solid #d7dee8", borderRadius: 1, bgcolor: "#fff" }}>
              <Box sx={{ p: 1, bgcolor: "#f4f7fb", borderRight: "1px solid #d7dee8", fontWeight: 900 }}>{pad(hour)}:00</Box>
              <Box sx={{ p: 1 }}>{hourMeetings(anchorDate, hour).map((meeting) => <MeetingCard key={meeting._id} meeting={meeting} onClick={openEdit} />)}</Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderWeekly = () => (
    <Box sx={{ overflowX: "auto" }}>
      <Box sx={{ minWidth: 980, display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", border: "1px solid #d7dee8", bgcolor: "#fff" }}>
        <Box sx={{ p: 1, bgcolor: "#f4f7fb", fontWeight: 900 }}>Time</Box>
        {weekDays.map((day) => <Box key={localDate(day)} sx={{ p: 1, bgcolor: "#f4f7fb", borderLeft: "1px solid #d7dee8", fontWeight: 900 }}>{day.toLocaleDateString([], { weekday: "short", day: "2-digit" })}</Box>)}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <Box sx={{ p: 1, borderTop: "1px solid #d7dee8", bgcolor: "#fafbfc", fontWeight: 800 }}>{pad(hour)}:00</Box>
            {weekDays.map((day) => {
              const slot = new Date(day);
              slot.setHours(hour, 0, 0, 0);
              return (
                <Box key={`${localDate(day)}-${hour}`} onDoubleClick={() => openCreate(slot)} sx={{ p: 0.75, minHeight: 88, borderTop: "1px solid #d7dee8", borderLeft: "1px solid #d7dee8" }}>
                  {hourMeetings(day, hour).map((meeting) => <MeetingCard key={meeting._id} meeting={meeting} onClick={openEdit} />)}
                </Box>
              );
            })}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );

  const renderMonthly = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #d7dee8", bgcolor: "#fff" }}>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <Box key={day} sx={{ p: 1, bgcolor: "#f4f7fb", borderLeft: "1px solid #d7dee8", fontWeight: 900 }}>{day}</Box>)}
      {monthDays.map((day) => (
        <Box key={localDate(day)} onDoubleClick={() => {
          const slot = new Date(day);
          slot.setHours(9, 0, 0, 0);
          openCreate(slot);
        }} sx={{ minHeight: 128, p: 1, borderTop: "1px solid #d7dee8", borderLeft: "1px solid #d7dee8", bgcolor: day.getMonth() === anchorDate.getMonth() ? "#fff" : "#f8fafc" }}>
          <Typography variant="caption" fontWeight={900}>{day.getDate()}</Typography>
          {dayMeetings(day).slice(0, 4).map((meeting) => <MeetingCard key={meeting._id} meeting={meeting} onClick={openEdit} />)}
          {dayMeetings(day).length > 4 && <Chip size="small" label={`+${dayMeetings(day).length - 4} more`} />}
        </Box>
      ))}
    </Box>
  );

  return (
    <MenuPageShell title="Live meeting">
      <Paper sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
          <Box>
            <Typography variant="h5" fontWeight={950}>Live meeting</Typography>
            <Typography variant="body2" color="text.secondary">Double click a calendar slot to create a meeting. Double click a meeting to edit or join.</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={() => shift(-1)}>Previous</Button>
            <Button variant="outlined" onClick={() => setAnchor(localDate(new Date()))}>Today</Button>
            <Button variant="outlined" onClick={() => shift(1)}>Next</Button>
            <Tooltip title="Refresh">
              <IconButton onClick={loadMeetings}><Refresh /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => openCreate(new Date())}>New</Button>
          </Stack>
        </Stack>
        {loading && <LinearProgress sx={{ my: 2 }} />}
        {message && <Alert severity="success" sx={{ my: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ my: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ my: 2 }} alignItems={{ xs: "stretch", md: "center" }}>
          <ToggleButtonGroup exclusive value={view} onChange={(event, value) => value && setView(value)} size="small">
            <ToggleButton value="day">Daily</ToggleButton>
            <ToggleButton value="week">Weekly</ToggleButton>
            <ToggleButton value="month">Monthly</ToggleButton>
          </ToggleButtonGroup>
          <TextField type="date" size="small" label="Date" InputLabelProps={{ shrink: true }} value={anchor} onChange={(event) => setAnchor(event.target.value)} />
          <Chip label={`${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`} color="success" />
        </Stack>
        {view === "day" && renderDaily()}
        {view === "week" && renderWeekly()}
        {view === "month" && renderMonthly()}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? "Edit live meeting" : "Create live meeting"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Host name" value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Host email" value={form.hostEmail} onChange={(e) => setForm({ ...form, hostEmail: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="datetime-local" label="Start time" InputLabelProps={{ shrink: true }} value={form.startDateTime} onChange={(e) => setForm({ ...form, startDateTime: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="datetime-local" label="End time" InputLabelProps={{ shrink: true }} value={form.endDateTime} onChange={(e) => setForm({ ...form, endDateTime: e.target.value })} /></Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={users}
                value={form.internalParticipants}
                onInputChange={(event, value) => loadUsers(value)}
                onChange={(event, value) => setForm({ ...form, internalParticipants: value })}
                getOptionLabel={(option) => `${option.name || ""}${option.email ? ` (${option.email})` : ""}`}
                isOptionEqualToValue={(option, value) => option.email === value.email}
                renderInput={(params) => <TextField {...params} label="Internal participants" placeholder="Search name, email, phone or department" />}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="External participant emails" placeholder="email1@example.com, email2@example.com" value={form.externalEmails} onChange={(e) => setForm({ ...form, externalEmails: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={form.sendExternalEmail} onChange={(e) => setForm({ ...form, sendExternalEmail: e.target.checked })} />} label="Send email to external participants" />
            </Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
            {form.meetingLink && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f8fafc" }}>
                  <Typography fontWeight={900}>Meeting links</Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                      <TextField fullWidth size="small" label="Internal meeting link" value={form.meetingLink} InputProps={{ readOnly: true }} />
                      <Button startIcon={<ContentCopy />} onClick={() => copyLink(form.meetingLink)}>Copy</Button>
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                      <TextField fullWidth size="small" label="External meeting link" value={form.externalMeetingLink} InputProps={{ readOnly: true }} />
                      <Button startIcon={<ContentCopy />} onClick={() => copyLink(form.externalMeetingLink)}>Copy</Button>
                    </Stack>
                <Link href={form.meetingLink} onClick={(e) => { e.preventDefault(); navigate(`${meetingRoomPath || (enhanced ? "/live-meeting-room-2" : "/live-meeting-room")}?meetingid=${form.id}`); }}>Join meeting in this tab</Link>
                  </Stack>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          {form.id && <Button color="error" startIcon={<Delete />} onClick={deleteMeeting}>Delete</Button>}
          {form.id && <Button onClick={() => navigate(`${meetingRoomPath || (enhanced ? "/live-meeting-room-2" : "/live-meeting-room")}?meetingid=${form.id}`)}>Join</Button>}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={saveMeeting} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </MenuPageShell>
  );
}

function VideoTile({ label, stream, muted, compact = false, children }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const tileRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play?.().catch(() => {});
    }
  }, [stream]);
  const openFullscreen = () => {
    const target = tileRef.current;
    if (target?.requestFullscreen) target.requestFullscreen();
    else if (target?.webkitRequestFullscreen) target.webkitRequestFullscreen();
  };
  return (
    <Paper ref={tileRef} sx={{ p: compact ? 0.75 : 1.2, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, overflow: "hidden", "&:fullscreen": { width: "100vw", height: "100vh", borderRadius: 0 } }}>
      <Box sx={{ position: "relative", bgcolor: "#020617", borderRadius: 1.5, aspectRatio: "16/9", overflow: "hidden", border: "1px solid rgba(148,163,184,0.3)", "&:fullscreen": { height: "100%" } }}>
        {stream ? (
          <>
            <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {!muted && <audio ref={audioRef} autoPlay playsInline />}
          </>
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", color: "grey.400" }}>
            <Typography fontWeight={900}>No media shared</Typography>
          </Stack>
        )}
        <Chip label={label} size="small" sx={{ position: "absolute", left: 6, bottom: 6, maxWidth: "68%", bgcolor: "rgba(15,23,42,0.82)", color: "#fff", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />
        <Button size="small" variant="contained" startIcon={<Fullscreen />} onClick={openFullscreen} sx={{ position: "absolute", top: 6, right: 6, minWidth: compact ? 36 : undefined, px: compact ? 0.75 : undefined, bgcolor: "rgba(15,23,42,0.82)" }}>{compact ? "" : "Full"}</Button>
      </Box>
      {children && <Box sx={{ mt: compact ? 0.5 : 1 }}>{children}</Box>}
    </Paper>
  );
}

export function LiveMeetingRoomPage({ enhanced = false, compact = false }) {
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get("meetingid") || searchParams.get("id") || "";
  const token = searchParams.get("token") || "";
  const isExternal = String(searchParams.get("external") || "").toLowerCase() === "yes";
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingAudioContextRef = useRef(null);
  const recordingDrawTimerRef = useRef(null);
  const transcriptRecorderRef = useRef(null);
  const transcriptChunksRef = useRef([]);
  const transcriptAudioContextRef = useRef(null);
  const peersRef = useRef({});
  const remoteStreamsRef = useRef({});
  const roomRef = useRef(null);
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const [meeting, setMeeting] = useState(null);
  const [guestName, setGuestName] = useState(searchParams.get("name") || "");
  const [guestEmail, setGuestEmail] = useState(searchParams.get("email") || "");
  const [socketId, setSocketId] = useState("");
  const [participants, setParticipants] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [audioOn, setAudioOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [socketStatus, setSocketStatus] = useState("Connecting");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [lastRecordingBlob, setLastRecordingBlob] = useState(null);
  const [lastRecordingUrl, setLastRecordingUrl] = useState("");
  const [lastRecordingName, setLastRecordingName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcriptListening, setTranscriptListening] = useState(false);
  const [transcriptProcessing, setTranscriptProcessing] = useState(false);
  const [analysisSource, setAnalysisSource] = useState("transcript");
  const [aiProvider, setAiProvider] = useState("Gemini");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [ollamaConfigId, setOllamaConfigId] = useState("");
  const [ollamaConfigs, setOllamaConfigs] = useState([]);
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [meetingSummary, setMeetingSummary] = useState("");
  const [meetingActionItems, setMeetingActionItems] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const recognitionRef = useRef(null);

  const displayName = isExternal ? guestName : (global1.name || global1.user || "User");
  const displayEmail = isExternal ? guestEmail : currentEmail();
  const isHost = String(displayEmail).toLowerCase() === String(meeting?.hostEmail || "").toLowerCase();

  const loadMeeting = async () => {
    try {
      const res = await ep1.get("/api/v2/live-meeting", {
        params: {
          id: meetingId,
          colid: global1.colid || undefined,
          external: isExternal ? "Yes" : "No",
          token
        }
      });
      setMeeting(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to load meeting");
    }
  };

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  useEffect(() => {
    if (!enhanced) return;
    ep1.get("/api/v2/ollama-configuration", { params: { colid: global1.colid } })
      .then((res) => setOllamaConfigs((res.data?.data || []).filter((item) => String(item.active || "").toLowerCase() === "yes")))
      .catch(() => setOllamaConfigs([]));
  }, [enhanced]);

  const waitForStableConnection = (pc) => new Promise((resolve) => {
    if (pc.signalingState === "stable") return resolve();
    const handleChange = () => {
      if (pc.signalingState === "stable") {
        pc.removeEventListener("signalingstatechange", handleChange);
        resolve();
      }
    };
    pc.addEventListener("signalingstatechange", handleChange);
    setTimeout(() => {
      pc.removeEventListener("signalingstatechange", handleChange);
      resolve();
    }, 2500);
  });

  const addOrQueueIceCandidate = async (peerId, pc, candidate) => {
    if (!candidate) return;
    if (!pc.remoteDescription) {
      pendingIceCandidatesRef.current[peerId] = pendingIceCandidatesRef.current[peerId] || [];
      pendingIceCandidatesRef.current[peerId].push(candidate);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const flushQueuedIceCandidates = async (peerId, pc) => {
    const queued = pendingIceCandidatesRef.current[peerId] || [];
    pendingIceCandidatesRef.current[peerId] = [];
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const renegotiatePeer = async (targetSocketId, pc, restartIce = false) => {
    if (!targetSocketId || !pc || pc.connectionState === "closed") return;
    try {
      makingOfferRef.current[targetSocketId] = true;
      await waitForStableConnection(pc);
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer(restartIce ? { iceRestart: true } : undefined);
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("live-meeting-signal", { to: targetSocketId, signal: { description: pc.localDescription || offer } });
    } finally {
      makingOfferRef.current[targetSocketId] = false;
    }
  };

  const isPolitePeer = (targetSocketId) => String(socketRef.current?.id || socketId || "") > String(targetSocketId || "");

  const createPeer = (targetSocketId, initiator = false) => {
    if (peersRef.current[targetSocketId]?.connectionState === "closed") {
      delete peersRef.current[targetSocketId];
    }
    if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];
    const pc = new RTCPeerConnection(rtcConfig);
    peersRef.current[targetSocketId] = pc;
    pendingIceCandidatesRef.current[targetSocketId] = pendingIceCandidatesRef.current[targetSocketId] || [];
    pc.addTransceiver("audio", { direction: "sendrecv" });
    pc.addTransceiver("video", { direction: "sendrecv" });
    syncPeerSenders(pc).catch(() => {});
    pc.onicecandidate = (event) => {
      if (event.candidate) socketRef.current?.emit("live-meeting-signal", { to: targetSocketId, signal: { candidate: event.candidate } });
    };
    pc.ontrack = (event) => {
      const incomingStream = event.streams?.[0];
      const stream = remoteStreamsRef.current[targetSocketId] || incomingStream || new MediaStream();
      const tracks = incomingStream?.getTracks?.().length ? incomingStream.getTracks() : [event.track];
      tracks.filter(Boolean).forEach((track) => {
        if (!stream.getTracks().some((item) => item.id === track.id)) stream.addTrack(track);
      });
      remoteStreamsRef.current[targetSocketId] = stream;
      setRemoteStreams({ ...remoteStreamsRef.current });
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        setTimeout(() => {
          const current = peersRef.current[targetSocketId];
          if (current === pc && ["failed", "disconnected"].includes(current.connectionState)) {
            renegotiatePeer(targetSocketId, current, true).catch(() => {});
          }
        }, 1200);
      }
    };
    if (initiator) {
      setTimeout(() => renegotiatePeer(targetSocketId, pc).catch((err) => setError(err.message)), 0);
    }
    return pc;
  };

  const liveTrackForKind = (kind) => {
    if (kind === "video") {
      const screenTrack = screenStreamRef.current?.getVideoTracks?.().find((track) => track.readyState === "live");
      if (screenTrack) return screenTrack;
    }
    const stream = localStreamRef.current;
    const tracks = kind === "audio" ? stream?.getAudioTracks?.() : stream?.getVideoTracks?.();
    return tracks?.find((track) => track.readyState === "live") || null;
  };

  const senderForKind = (pc, kind) => {
    const transceiver = pc.getTransceivers?.().find((item) => item.sender?.track?.kind === kind || item.receiver?.track?.kind === kind);
    if (transceiver?.sender) return transceiver.sender;
    return pc.getSenders().find((item) => item.track?.kind === kind) || null;
  };

  const syncPeerSenders = async (pc) => {
    if (!pc || pc.connectionState === "closed") return;
    await Promise.all(["audio", "video"].map(async (kind) => {
      const sender = senderForKind(pc, kind);
      if (!sender) return;
      const nextTrack = liveTrackForKind(kind);
      if (sender.track?.id !== nextTrack?.id) await sender.replaceTrack(nextTrack);
    }));
  };

  const syncAllPeerSenders = async () => {
    await Promise.all(Object.values(peersRef.current).map((pc) => syncPeerSenders(pc)));
  };

  const publishTrackToPeers = async () => {
    await syncAllPeerSenders();
  };

  const connectMeeting = () => {
    if (!meetingId || !meeting) return;
    if (isExternal && (!guestName || !guestEmail)) {
      setError("Name and email are required for external participants");
      return;
    }
    const socket = io(socketBaseUrl(), { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setSocketStatus("Connected");
      socket.emit("live-meeting-join", {
        meetingId,
        token,
        external: isExternal,
        name: displayName,
        email: displayEmail
      }, (ack = {}) => {
        if (ack.success === false) {
          setError(ack.message || "Unable to join meeting");
          return;
        }
        setSocketId(ack.socketId || socket.id);
        setWaiting(Boolean(ack.waiting));
        setConnected(!ack.waiting);
        setParticipants(ack.participants || []);
        setWaitingList(ack.waitingList || []);
        if (ack.waiting) setMessage("Waiting for the host to allow you into the meeting");
        (ack.participants || []).forEach((participant) => createPeer(participant.socketId, false));
      });
    });
    socket.on("connect_error", (err) => {
      setSocketStatus("Disconnected");
      setError(`Unable to connect meeting server: ${err.message}`);
    });
    socket.on("disconnect", () => setSocketStatus("Disconnected"));
    socket.on("live-meeting-admitted", (ack = {}) => {
      setWaiting(false);
      setConnected(true);
      setMessage("Host allowed you into the meeting");
      setParticipants(ack.participants || []);
      (ack.participants || []).forEach((participant) => createPeer(participant.socketId, false));
    });
    socket.on("live-meeting-denied", ({ message: deniedMessage }) => {
      setWaiting(false);
      setConnected(false);
      setError(deniedMessage || "Host did not allow entry");
    });
    socket.on("live-meeting-participants", (nextParticipants) => setParticipants(nextParticipants || []));
    socket.on("live-meeting-waiting-list", (rows) => setWaitingList(rows || []));
    socket.on("live-meeting-lobby-request", ({ socketId: nextSocketId, user }) => {
      setWaitingList((prev) => [...prev.filter((row) => row.socketId !== nextSocketId), { socketId: nextSocketId, ...user }]);
    });
    socket.on("live-meeting-user-joined", ({ socketId: nextSocketId }) => {
      if (nextSocketId && nextSocketId !== socket.id) createPeer(nextSocketId, true);
    });
    socket.on("live-meeting-user-left", ({ socketId: leftSocketId }) => {
      peersRef.current[leftSocketId]?.close();
      delete peersRef.current[leftSocketId];
      delete remoteStreamsRef.current[leftSocketId];
      setRemoteStreams({ ...remoteStreamsRef.current });
    });
    socket.on("live-meeting-signal", async ({ from, signal }) => {
      try {
        const pc = createPeer(from, false);
        if (signal.description) {
          const description = new RTCSessionDescription(signal.description);
          const offerCollision = description.type === "offer" && (makingOfferRef.current[from] || pc.signalingState !== "stable");
          ignoreOfferRef.current[from] = !isPolitePeer(from) && offerCollision;
          if (ignoreOfferRef.current[from]) return;
          if (offerCollision) {
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(description);
          await flushQueuedIceCandidates(from, pc);
          await syncPeerSenders(pc);
          if (description.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("live-meeting-signal", { to: from, signal: { description: pc.localDescription || answer } });
          }
        }
        if (signal.candidate) {
          try {
            if (ignoreOfferRef.current[from] && !pc.remoteDescription) return;
            await addOrQueueIceCandidate(from, pc, signal.candidate);
          } catch (candidateError) {
            if (!ignoreOfferRef.current[from]) throw candidateError;
          }
        }
      } catch (err) {
        setError(`Meeting connection error: ${err.message}`);
      }
    });
    socket.on("live-meeting-mute", ({ audio, camera, screen }) => {
      if (audio) {
        localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
        setAudioOn(false);
      }
      if (camera) {
        localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = false; });
        setCameraOn(false);
      }
      if (screen) stopScreenShare();
      setMessage("Host muted your media");
    });
  };

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (transcriptRecorderRef.current?.state === "recording") transcriptRecorderRef.current.stop();
    if (recordingDrawTimerRef.current) clearInterval(recordingDrawTimerRef.current);
    recordingAudioContextRef.current?.close?.();
    transcriptAudioContextRef.current?.close?.();
    socketRef.current?.disconnect();
    Object.values(peersRef.current).forEach((pc) => pc.close());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
  }, []);

  const publishTracksToPeers = async () => {
    await syncAllPeerSenders();
  };

  const ensureLocalStream = async ({ audio = audioOn, video = cameraOn } = {}) => {
    if (!audio && !video) return localStreamRef.current;
    let stream = localStreamRef.current;
    if (!stream) {
      stream = new MediaStream();
      localStreamRef.current = stream;
    }
    const needsAudio = audio && !stream.getAudioTracks().some((track) => track.readyState === "live");
    const needsVideo = video && !stream.getVideoTracks().some((track) => track.readyState === "live");
    const addedTracks = [];
    if (needsAudio || needsVideo) {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: needsAudio, video: needsVideo });
      nextStream.getTracks().forEach((track) => {
        stream.addTrack(track);
        addedTracks.push(track);
      });
      if (addedTracks.length) await publishTracksToPeers(addedTracks, stream);
    }
    stream.getAudioTracks().forEach((track) => { track.enabled = audio; });
    stream.getVideoTracks().forEach((track) => { track.enabled = video; });
    setLocalStream(stream);
    setAudioOn(audio && stream.getAudioTracks().some((track) => track.enabled && track.readyState === "live"));
    setCameraOn(video && stream.getVideoTracks().some((track) => track.enabled && track.readyState === "live"));
    return stream;
  };

  const toggleAudio = async () => {
    try {
      if (!audioOn) {
        await ensureLocalStream({ audio: true, video: cameraOn });
      } else {
        localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
        setAudioOn(false);
        await syncAllPeerSenders();
      }
    } catch (err) {
      setError(`Unable to start audio: ${err.message}`);
    }
  };

  const toggleCamera = async () => {
    try {
      if (!cameraOn) {
        await ensureLocalStream({ audio: audioOn, video: true });
      } else {
        localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = false; });
        setCameraOn(false);
        await syncAllPeerSenders();
      }
    } catch (err) {
      setError(`Unable to start camera: ${err.message}`);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      const [screenTrack] = stream.getVideoTracks();
      await publishTrackToPeers(screenTrack, stream);
      setScreenOn(true);
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      setError(`Unable to share screen: ${err.message}`);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
    syncAllPeerSenders().catch(() => {});
  };

  const safeFilename = (value) => String(value || "live-meeting")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const preferredRecordingMime = () => {
    const candidates = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
  };

  const collectRecordingVideoTracks = () => {
    const tracks = [];
    const addTracks = (stream, kind) => {
      if (!stream) return;
      const nextTracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
      nextTracks.filter((track) => track.readyState === "live").forEach((track) => tracks.push(track));
    };
    addTracks(screenStreamRef.current, "video");
    if (!screenStreamRef.current?.getVideoTracks().some((track) => track.readyState === "live")) {
      addTracks(localStreamRef.current, "video");
      Object.values(remoteStreamsRef.current).forEach((stream) => addTracks(stream, "video"));
    }
    return tracks;
  };

  const activeVideoSources = () => {
    const sources = [];
    const add = (label, stream, priority = 10) => {
      if (!stream?.getVideoTracks?.().some((track) => track.readyState === "live" && track.enabled !== false)) return;
      sources.push({ label, stream, priority });
    };
    add(`${displayName || "Me"} (Me)`, localStreamRef.current, 2);
    if (screenStreamRef.current?.getVideoTracks?.().some((track) => track.readyState === "live")) {
      add(`${displayName || "Me"} screen`, screenStreamRef.current, 1);
    }
    Object.entries(remoteStreamsRef.current).forEach(([id, stream]) => {
      const participant = participants.find((item) => item.socketId === id);
      add(participant?.name || participant?.email || id, stream, 3);
    });
    return sources.sort((a, b) => a.priority - b.priority || String(a.label).localeCompare(String(b.label)));
  };

  const createCompositeVideoTrack = () => {
    const sources = activeVideoSources();
    if (!sources.length) return { track: null, cleanup: () => {}, count: 0 };
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    const videos = sources.map((source) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.srcObject = source.stream;
      video.play?.().catch(() => {});
      return { ...source, video };
    });
    const draw = () => {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const count = Math.max(videos.length, 1);
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const gap = 10;
      const cellW = (canvas.width - gap * (cols + 1)) / cols;
      const cellH = (canvas.height - gap * (rows + 1)) / rows;
      videos.forEach((item, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = gap + col * (cellW + gap);
        const y = gap + row * (cellH + gap);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x, y, cellW, cellH);
        try {
          const vw = item.video.videoWidth || 16;
          const vh = item.video.videoHeight || 9;
          const scale = Math.max(cellW / vw, cellH / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          ctx.drawImage(item.video, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
        } catch {
          ctx.fillStyle = "#111827";
          ctx.fillRect(x, y, cellW, cellH);
        }
        ctx.fillStyle = "rgba(15,23,42,0.82)";
        ctx.fillRect(x + 8, y + cellH - 34, Math.min(cellW - 16, 300), 26);
        ctx.fillStyle = "#fff";
        ctx.font = "600 16px Arial";
        ctx.fillText(String(item.label || "Participant").slice(0, 34), x + 16, y + cellH - 15);
      });
    };
    draw();
    recordingDrawTimerRef.current = setInterval(draw, 100);
    const [track] = canvas.captureStream(15).getVideoTracks();
    return {
      track,
      count: sources.length,
      cleanup: () => {
        if (recordingDrawTimerRef.current) clearInterval(recordingDrawTimerRef.current);
        recordingDrawTimerRef.current = null;
        videos.forEach((item) => {
          item.video.pause?.();
          item.video.srcObject = null;
        });
      }
    };
  };

  const collectRecordingAudioTracks = () => {
    const tracks = [];
    const addTracks = (stream) => {
      if (!stream) return;
      stream.getAudioTracks()
        .filter((track) => track.readyState === "live" && track.enabled)
        .forEach((track) => tracks.push(track));
    };
    addTracks(localStreamRef.current);
    Object.values(remoteStreamsRef.current).forEach((stream) => addTracks(stream));
    return tracks;
  };

  const createMixedAudioTrack = (audioTracks, contextRef = recordingAudioContextRef) => {
    if (!audioTracks.length) return null;
    const AudioContextApi = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextApi) return audioTracks[0];
    const context = new AudioContextApi();
    const destination = context.createMediaStreamDestination();
    audioTracks.forEach((track) => {
      const sourceStream = new MediaStream([track]);
      const source = context.createMediaStreamSource(sourceStream);
      source.connect(destination);
    });
    contextRef.current = context;
    return destination.stream.getAudioTracks()[0] || null;
  };

  const createRecordingStream = () => {
    const composite = compact ? createCompositeVideoTrack() : { track: null, cleanup: () => {}, count: 0 };
    const videoTracks = compact && composite.track ? [composite.track] : collectRecordingVideoTracks();
    const audioTracks = collectRecordingAudioTracks();
    const mixedAudioTrack = createMixedAudioTrack(audioTracks);
    return {
      stream: new MediaStream([...videoTracks, ...(mixedAudioTrack ? [mixedAudioTrack] : [])]),
      videoCount: compact ? composite.count : videoTracks.length,
      audioCount: audioTracks.length,
      cleanup: composite.cleanup
    };
  };

  const downloadRecording = (blob, mimeType) => {
    const extension = /mp4/i.test(mimeType) ? "mp4" : "webm";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${safeFilename(meeting?.title)}-${timestamp}-audio-video.${extension}`;
    const url = URL.createObjectURL(blob);
    if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
    setLastRecordingBlob(blob);
    setLastRecordingUrl(url);
    setLastRecordingName(filename);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const startRecording = async () => {
    if (!isHost) return;
    if (!window.MediaRecorder) {
      setError("Recording is not supported in this browser");
      return;
    }
    const { stream: recordingStream, videoCount, audioCount, cleanup } = createRecordingStream();
    if (!videoCount) {
      setError("Start camera or screen share before recording so the file contains video");
      return;
    }
    if (!audioCount) {
      setError("Start audio or wait for participant audio before recording");
      return;
    }
    try {
      const mimeType = preferredRecordingMime();
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || mimeType || "video/webm" });
        recordingChunksRef.current = [];
        recordingStream.getTracks().forEach((track) => track.stop());
        cleanup?.();
        recordingAudioContextRef.current?.close?.();
        recordingAudioContextRef.current = null;
        setRecording(false);
        downloadRecording(blob, recorder.mimeType || mimeType || "video/webm");
        if (!/mp4/i.test(recorder.mimeType || mimeType)) {
          setMessage("Recording downloaded. Your browser saved it in WebM format because MP4 recording is not supported here.");
        } else {
          setMessage("Recording downloaded as MP4");
        }
      };
      recorder.start(1000);
      setRecording(true);
      setMessage("Meeting recording started");
    } catch (err) {
      setError(`Unable to start recording: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const preferredAudioMime = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
  };

  const startMixedTranscript = () => {
    if (!isHost) return;
    if (!window.MediaRecorder) {
      startTranscript();
      return;
    }
    const audioTracks = collectRecordingAudioTracks();
    if (!audioTracks.length) {
      setError("Start audio or wait for participant audio before creating the transcript.");
      return;
    }
    try {
      const mixedTrack = createMixedAudioTrack(audioTracks, transcriptAudioContextRef);
      if (!mixedTrack) {
        setError("Unable to create mixed meeting audio for transcript.");
        return;
      }
      const mimeType = preferredAudioMime();
      const stream = new MediaStream([mixedTrack]);
      transcriptChunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      transcriptRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) transcriptChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(transcriptChunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        transcriptChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        transcriptAudioContextRef.current?.close?.();
        transcriptAudioContextRef.current = null;
        setTranscriptListening(false);
        if (!blob.size) return;
        try {
          setTranscriptProcessing(true);
          const formData = new FormData();
          formData.append("colid", global1.colid || "");
          formData.append("user", global1.user || "");
          formData.append("model", geminiModel);
          formData.append("translateToEnglish", "No");
          formData.append("prompt", "Transcribe the complete mixed meeting conversation. Return transcript, summary and actionItems if available.");
          formData.append("audio", blob, `meeting-transcript-${Date.now()}.webm`);
          const res = await ep1.post("/api/v2/transcript/gemini-transcribe", formData, { headers: { "Content-Type": "multipart/form-data" } });
          setTranscript((prev) => [prev, res.data?.transcript].filter(Boolean).join(prev ? "\n" : ""));
          if (res.data?.summary) setMeetingSummary(res.data.summary);
          if (res.data?.actionItems) setMeetingActionItems(res.data.actionItems);
          setMessage("Transcript created from mixed meeting audio");
        } catch (err) {
          setError(err.response?.data?.msg || "Unable to transcribe mixed meeting audio");
        } finally {
          setTranscriptProcessing(false);
        }
      };
      recorder.start(1000);
      setTranscriptListening(true);
      setMessage("Transcript recording started. Stop transcript to process all conversation audio.");
    } catch (err) {
      setError(`Unable to start transcript recording: ${err.message}`);
    }
  };

  const externalRecipients = () => (meeting?.externalParticipantEmails || []).join(",");

  const startTranscript = () => {
    if (!isHost) return;
    const SpeechRecognitionApi = getSpeechRecognition();
    if (!SpeechRecognitionApi) {
      setError("Live transcript is not supported in this browser. You can still record and analyze the recording with Gemini.");
      return;
    }
    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const spoken = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += spoken;
        else interim += spoken;
      }
      if (finalText) setTranscript((prev) => `${prev}${prev ? " " : ""}${finalText.trim()}`);
      setInterimTranscript(interim);
    };
    recognition.onerror = (event) => {
      setError(event.error ? `Transcript error: ${event.error}` : "Transcript error");
      setTranscriptListening(false);
    };
    recognition.onend = () => {
      setTranscriptListening(false);
      setInterimTranscript("");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setTranscriptListening(true);
    setMessage("Live transcript started");
  };

  const stopTranscript = () => {
    if (transcriptRecorderRef.current?.state === "recording") {
      transcriptRecorderRef.current.stop();
      return;
    }
    recognitionRef.current?.stop?.();
    setTranscriptListening(false);
    setInterimTranscript("");
  };

  const sendTextToExternalParticipants = async ({ kind, content }) => {
    const to = externalRecipients();
    if (!to) {
      setError("No external participants are available for email.");
      return;
    }
    if (!String(content || "").trim()) {
      setError(`${kind} is empty.`);
      return;
    }
    const res = await ep1.post("/api/v2/transcript/send-email", {
      colid: global1.colid,
      senderName: global1.name || meeting?.hostName || "Institution",
      to,
      subject: `${kind}: ${meeting?.title || "Live meeting"}`,
      transcript: content
    });
    setMessage(res.data?.msg || `${kind} emailed to external participants`);
  };

  const sendTranscriptToExternalParticipants = async () => {
    try {
      setError("");
      await sendTextToExternalParticipants({ kind: "Meeting transcript", content: transcript });
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to email transcript");
    }
  };

  const sendSummaryToExternalParticipants = async () => {
    try {
      setError("");
      const content = [
        meetingSummary ? `Summary:\n${meetingSummary}` : "",
        meetingActionItems ? `\nAction Items:\n${meetingActionItems}` : ""
      ].filter(Boolean).join("\n");
      await sendTextToExternalParticipants({ kind: "Meeting summary and action items", content });
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to email summary");
    }
  };

  const analyzeMeeting = async () => {
    try {
      setAnalyzing(true);
      setError("");
      setMessage("");
      if (analysisSource === "recording" && aiProvider !== "Ollama" && lastRecordingBlob) {
        const formData = new FormData();
        formData.append("colid", global1.colid || "");
        formData.append("user", global1.user || "");
        formData.append("model", geminiModel);
        formData.append("translateToEnglish", "No");
        formData.append("prompt", `Transcribe and analyze this meeting audio/video recording. Use both audio and visible screen/video context if available. Return only JSON with transcript, summary and actionItems. Additional instructions: ${analysisPrompt || "None"}`);
        formData.append("audio", lastRecordingBlob, lastRecordingName || "meeting-recording.webm");
        const res = await ep1.post("/api/v2/transcript/gemini-transcribe", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setTranscript((prev) => res.data?.transcript || prev);
        setMeetingSummary(res.data?.summary || "");
        setMeetingActionItems(res.data?.actionItems || "");
        setMessage("Recording analyzed with Gemini");
        return;
      }
      if (!transcript.trim()) {
        setError(analysisSource === "recording" ? "No transcript is available. Use Gemini for recording analysis or create a transcript first." : "Create or enter transcript text first.");
        return;
      }
      const res = await ep1.post("/api/v2/transcript/analyze-text", {
        colid: global1.colid,
        provider: aiProvider,
        model: geminiModel,
        ollamaConfigId,
        meetingTitle: meeting?.title || "",
        transcript,
        additionalPrompt: analysisPrompt
      });
      setMeetingSummary(res.data?.summary || "");
      setMeetingActionItems([
        res.data?.actionItems ? `Action Items:\n${res.data.actionItems}` : "",
        res.data?.decisions ? `\nDecisions:\n${res.data.decisions}` : "",
        res.data?.risks ? `\nRisks:\n${res.data.risks}` : ""
      ].filter(Boolean).join("\n"));
      setMessage(`${aiProvider} analysis completed`);
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to analyze meeting");
    } finally {
      setAnalyzing(false);
    }
  };

  const admit = (row) => socketRef.current?.emit("live-meeting-admit", { meetingId, to: row.socketId });
  const deny = (row) => socketRef.current?.emit("live-meeting-deny", { meetingId, to: row.socketId });
  const muteParticipant = (participant, kind) => socketRef.current?.emit("live-meeting-mute", {
    to: participant.socketId,
    audio: kind === "audio",
    camera: kind === "camera",
    screen: kind === "screen"
  });
  const openFullscreen = () => {
    if (roomRef.current?.requestFullscreen) roomRef.current.requestFullscreen();
    else if (roomRef.current?.webkitRequestFullscreen) roomRef.current.webkitRequestFullscreen();
  };
  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };
  const leaveMeeting = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    socketRef.current?.disconnect();
    Object.values(peersRef.current).forEach((pc) => pc.close());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    window.location.href = "/";
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#eef2f7" }}>
      <Paper square elevation={0} sx={{ position: "sticky", top: 0, zIndex: 20, px: { xs: 1.5, md: 3 }, py: 1.25, bgcolor: "#0f172a", color: "#fff" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={950} noWrap>Live meeting</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }} noWrap>{meeting?.title || "Meeting room"}</Typography>
          </Box>
          <Button color="inherit" variant="outlined" startIcon={<Logout />} onClick={logout} sx={{ borderColor: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>Logout</Button>
        </Stack>
      </Paper>

      <Box ref={roomRef} sx={{ p: { xs: 2, md: 3 }, "&:fullscreen": { width: "100vw", height: "100vh", overflow: "auto", bgcolor: "#eef2f7" } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={950}>{meeting?.title || "Live meeting"}</Typography>
              <Typography color="text.secondary">{meeting?.description}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip label={`Server: ${socketStatus}`} color={socketStatus === "Connected" ? "success" : "warning"} />
                <Chip label={isHost ? "Host" : isExternal ? "External participant" : "Internal participant"} color={isHost ? "primary" : "default"} />
                <Chip label={`Participants: ${participants.length + (connected ? 0 : 0)}`} />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {!connected && !waiting && <Button variant="contained" onClick={connectMeeting}>Join Meeting</Button>}
              {connected && <Button variant={audioOn ? "contained" : "outlined"} startIcon={audioOn ? <Mic /> : <MicOff />} onClick={toggleAudio}>{audioOn ? "Mute self" : "Audio"}</Button>}
              {connected && <Button variant={cameraOn ? "contained" : "outlined"} startIcon={cameraOn ? <Videocam /> : <VideocamOff />} onClick={toggleCamera}>{cameraOn ? "Camera off" : "Camera"}</Button>}
              {connected && <Button variant={screenOn ? "contained" : "outlined"} startIcon={screenOn ? <StopScreenShare /> : <ScreenShare />} onClick={screenOn ? stopScreenShare : startScreenShare}>{screenOn ? "Stop share" : "Share screen"}</Button>}
              {connected && isHost && !recording && <Button variant="contained" color="secondary" startIcon={<RadioButtonChecked />} onClick={startRecording}>Record MP4</Button>}
              {connected && isHost && recording && <Button variant="contained" color="warning" startIcon={<Stop />} onClick={stopRecording}>Stop and download</Button>}
              {connected && <Button variant="outlined" startIcon={<Fullscreen />} onClick={openFullscreen}>Full screen</Button>}
              {connected && <Button color="error" variant="outlined" startIcon={<CallEnd />} onClick={leaveMeeting}>Leave</Button>}
            </Stack>
          </Stack>
        </Paper>

        {isExternal && !connected && !waiting && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>External participant details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField fullWidth label="Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} /></Grid>
            </Grid>
          </Paper>
        )}

        {waiting && <Alert severity="info" sx={{ mb: 2 }}>You are in the lobby. Please wait for the host to allow entry.</Alert>}

        {isHost && waitingList.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Waiting room</Typography>
            <Stack spacing={1}>
              {waitingList.map((row) => (
                <Stack key={row.socketId} direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                  <Typography sx={{ flex: 1 }}>{row.name || "Guest"} ({row.email || "no email"})</Typography>
                  <Button size="small" variant="contained" onClick={() => admit(row)}>Allow</Button>
                  <Button size="small" color="error" onClick={() => deny(row)}>Reject</Button>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}

        {connected && (
          <Grid container spacing={compact ? 1 : 2}>
            <Grid item xs={12} sm={compact ? 6 : 12} md={compact ? 4 : 12} xl={compact ? 3 : 6} lg={compact ? 3 : 6}>
              <VideoTile label={`${displayName || "Me"} (Me)`} stream={localStream} muted compact={compact}>
                <Typography variant="caption">Audio {audioOn ? "on" : "off"} | Camera {cameraOn ? "on" : "off"} | Screen {screenOn ? "sharing" : "off"}</Typography>
              </VideoTile>
            </Grid>
            {participants.filter((item) => item.socketId !== socketId).map((participant) => (
              <Grid item xs={12} sm={compact ? 6 : 12} md={compact ? 4 : 12} xl={compact ? 3 : 6} lg={compact ? 3 : 6} key={participant.socketId}>
                <VideoTile label={participant.name || participant.email || participant.socketId} stream={remoteStreams[participant.socketId]} compact={compact}>
                  {isHost && !participant.host && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button size="small" startIcon={<MicOff />} onClick={() => muteParticipant(participant, "audio")}>Mute</Button>
                      <Button size="small" startIcon={<VideocamOff />} onClick={() => muteParticipant(participant, "camera")}>Camera off</Button>
                      <Button size="small" startIcon={<StopScreenShare />} onClick={() => muteParticipant(participant, "screen")}>Stop screen</Button>
                    </Stack>
                  )}
                </VideoTile>
              </Grid>
            ))}
          </Grid>
        )}

        {enhanced && connected && isHost && (
          <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={950}>Transcript and AI meeting notes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a live transcript, email it to external participants, or analyze the transcript/recording for summary and action items.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {!transcriptListening ? (
                  <Button variant="contained" onClick={compact ? startMixedTranscript : startTranscript}>Create transcript</Button>
                ) : (
                  <Button variant="contained" color="warning" onClick={stopTranscript}>Stop transcript</Button>
                )}
                <Button variant="outlined" onClick={sendTranscriptToExternalParticipants} disabled={!transcript.trim()}>Email transcript</Button>
              </Stack>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={7}
                  label="Transcript"
                  value={`${transcript}${interimTranscript ? `${transcript ? " " : ""}${interimTranscript}` : ""}`}
                  onChange={(event) => {
                    setTranscript(event.target.value);
                    setInterimTranscript("");
                  }}
                />
              </Grid>
              {lastRecordingUrl && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Last recording is available for Gemini analysis:{" "}
                    <Link href={lastRecordingUrl} download={lastRecordingName || "meeting-recording.webm"}>
                      {lastRecordingName || "Download recording"}
                    </Link>
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Analyze" value={analysisSource} onChange={(e) => setAnalysisSource(e.target.value)}>
                  <MenuItem value="transcript">Transcript</MenuItem>
                  <MenuItem value="recording">Recorded file</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="AI Provider" value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                  <MenuItem value="Gemini">Gemini</MenuItem>
                  <MenuItem value="Ollama">Ollama</MenuItem>
                </TextField>
              </Grid>
              {aiProvider === "Gemini" ? (
                <Grid item xs={12} md={3}>
                  <TextField select fullWidth label="Gemini Model" value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
                    {["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite"].map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}
                  </TextField>
                </Grid>
              ) : (
                <Grid item xs={12} md={3}>
                  <TextField select fullWidth label="Ollama Config" value={ollamaConfigId} onChange={(e) => setOllamaConfigId(e.target.value)}>
                    <MenuItem value="">Default active Ollama</MenuItem>
                    {ollamaConfigs.map((item) => (
                      <MenuItem key={item._id} value={item._id}>{item.name || item.modelname || item.serveraddress}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} md={3}>
                <Button fullWidth variant="contained" sx={{ height: 56 }} onClick={analyzeMeeting} disabled={analyzing}>
                  {analyzing || transcriptProcessing ? "Processing..." : "Analyze meeting"}
                </Button>
              </Grid>
              {analysisSource === "recording" && aiProvider === "Ollama" && (
                <Grid item xs={12}>
                  <Alert severity="warning">Ollama will analyze the transcript text. Select Gemini to analyze the recorded media file directly.</Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Additional AI prompt"
                  placeholder="Example: Focus on decisions, owners, deadlines and unresolved items."
                  value={analysisPrompt}
                  onChange={(event) => setAnalysisPrompt(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth multiline minRows={6} label="Meeting Summary" value={meetingSummary} onChange={(event) => setMeetingSummary(event.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth multiline minRows={6} label="Action Items / Decisions / Risks" value={meetingActionItems} onChange={(event) => setMeetingActionItems(event.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" onClick={sendSummaryToExternalParticipants} disabled={!meetingSummary.trim() && !meetingActionItems.trim()}>
                  Email summary and action items to external participants
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

export function LiveMeeting2CalendarPage() {
  return <LiveMeetingCalendarPage enhanced />;
}

export function LiveMeeting2RoomPage() {
  return <LiveMeetingRoomPage enhanced />;
}

export function LiveMeeting3CalendarPage() {
  return <LiveMeetingCalendarPage enhanced meetingRoomPath="/live-meeting-room-3" />;
}

export function LiveMeeting3RoomPage() {
  return <LiveMeetingRoomPage enhanced compact />;
}

import ep1 from "../api/ep1";

export const sequentialContentTypes = ["Text", "File Link", "Infographics", "Video Link", "Quiz", "Mindmap", "Flash Card"];

export const contentRank = (row = {}) => {
  const parsed = Number(row.sequence);
  return Number.isFinite(parsed) ? parsed : 999999;
};

export const sequenceStatus = (sequence = {}) => {
  const rows = sequence.rows || [];
  const total = rows.length;
  const completed = rows.filter((row) => row.completed).length;
  if (total && completed === total) return { key: "completed", label: "Completed", color: "success" };
  if (completed > 0) return { key: "pending", label: "In progress", color: "primary" };
  return { key: "notopened", label: "Not opened", color: "default" };
};

export const groupSequentialContent = (lessonContent = []) => {
  const map = new Map();
  [...lessonContent].sort((a, b) => contentRank(a) - contentRank(b)).forEach((item) => {
    const key = String(item.lessonresourceid || "general");
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        title: item.lessonplantitle || "Lesson sequence",
        module: item.module || "",
        topic: item.topics || "",
        rows: []
      });
    }
    map.get(key).rows.push(item);
  });

  return [...map.values()].map((sequence) => {
    let previousComplete = true;
    const rows = sequence.rows.map((row) => {
      const locked = !previousComplete;
      previousComplete = previousComplete && Boolean(row.completed);
      return { ...row, locked };
    });
    return { ...sequence, rows, status: sequenceStatus({ ...sequence, rows }) };
  });
};

export const buildSequentialParams = ({
  colid,
  lessonresourceid,
  academicyear,
  semester,
  coursecode,
  coursegroup,
  facultyemail,
  status,
  contenttype,
  section,
  regno,
  user
} = {}) => {
  const params = { colid, lessonresourceid, academicyear, semester, coursecode, coursegroup, facultyemail, status, contenttype, section, regno, user };
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === null || String(params[key]).trim() === "") delete params[key];
  });
  return params;
};

export const loadSequentialContentWithProgress = async (params = {}) => {
  const cleanParams = buildSequentialParams(params);
  const [contentRes, progressRes] = await Promise.all([
    ep1.get("/api/v2/neplms/lesson-content", { params: cleanParams }),
    ep1.get("/api/v2/neplms/lesson-content/progress", { params: cleanParams })
  ]);
  return {
    contents: contentRes.data?.data || [],
    progress: progressRes.data?.data || []
  };
};

export const loadSequentialContent = async (params = {}) => {
  const res = await ep1.get("/api/v2/neplms/lesson-content", { params: buildSequentialParams(params) });
  return res.data?.data || [];
};

export const loadStudentSequentialContent = async (params = {}) => {
  const res = await ep1.get("/api/v2/neplms/student-workspace/lesson-content", { params: buildSequentialParams(params) });
  return res.data?.data || [];
};

export const completeStudentSequentialContent = async (payload = {}) => {
  const res = await ep1.post("/api/v2/neplms/student-workspace/lesson-content-complete", payload);
  return res.data;
};

export const saveSequentialContent = async (payload = {}) => {
  const res = await ep1.post("/api/v2/neplms/lesson-content", payload);
  return res.data;
};

export const deleteSequentialContent = async ({ id, colid }) => {
  const res = await ep1.post("/api/v2/neplms/lesson-content/delete", { id, colid });
  return res.data;
};

export const uploadSequentialContentFile = async ({ file, colid, coursecode }) => {
  const data = new FormData();
  data.append("colid", colid || "");
  data.append("coursecode", coursecode || "");
  data.append("file", file);
  const res = await ep1.post("/api/v2/neplms/lesson-content/upload", data, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data?.url || res.data?.data?.filelink || "";
};

export const generateSequentialContentFile = async (payload = {}) => {
  const res = await ep1.post("/api/v2/neplms/lesson-content/generate-file", payload);
  return res.data;
};

export const generateSequentialFlashcards = async (payload = {}) => {
  const res = await ep1.post("/api/v2/neplms/lesson-content/generate-flashcards", payload);
  return res.data;
};


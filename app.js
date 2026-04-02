import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- SUPABASE INIT (LOG EVERYTHING)
console.log("Initializing Supabase client...");

const supabaseUrl = "https://hlalxliidulfuvnihiqr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsYWx4bGlpZHVsZnV2bmloaXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDgzNTgsImV4cCI6MjA5MDYyNDM1OH0.2u4ZX8EXpz1RIJGWE8E4mv6d8d-nS3hA7CrKsRLikX4";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

console.log("Supabase client created.", { supabaseUrl, hasKey: !!supabaseKey });

// --- DOM ELEMENTS
const loginToggleBtn = document.getElementById("loginToggleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authSection = document.getElementById("authSection");
const uploadSection = document.getElementById("uploadSection");
const loginForm = document.getElementById("loginForm");
const uploadForm = document.getElementById("uploadForm");
const authMessage = document.getElementById("authMessage");
const uploadMessage = document.getElementById("uploadMessage");
const resourceGrid = document.getElementById("resourceGrid");
const progressBar = document.getElementById("progressBar");
const searchInput = document.getElementById("searchInput");
const filterSubject = document.getElementById("filterSubject");
const filterCategory = document.getElementById("filterCategory");
const uploadSubject = document.getElementById("uploadSubject");
const customSubject = document.getElementById("customSubject");

if (!loginToggleBtn) {
  console.error("[DOM] loginToggleBtn not found");
}
if (!logoutBtn) {
  console.error("[DOM] logoutBtn not found");
}
if (!authSection) {
  console.error("[DOM] authSection not found");
}
if (!uploadSection) {
  console.error("[DOM] uploadSection not found");
}
if (!loginForm) {
  console.error("[DOM] loginForm not found");
}
if (!uploadForm) {
  console.error("[DOM] uploadForm not found");
}
if (!authMessage) {
  console.error("[DOM] authMessage not found");
}
if (!uploadMessage) {
  console.error("[DOM] uploadMessage not found");
}
if (!resourceGrid) {
  console.error("[DOM] resourceGrid not found");
}
if (!progressBar) {
  console.error("[DOM] progressBar not found");
}

let allResources = [];
let currentUser = null;

// --- AUTH UI STATE
function updateAuthUI(user) {
  currentUser = user || null;

  console.log("updateAuthUI called. currentUser:", currentUser?.email ?? "null");

  if (currentUser) {
    loginToggleBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    authSection?.classList.add("hidden");
    uploadSection?.classList.remove("hidden");
    console.log("State: LOGGED IN (teacher)");
  } else {
    loginToggleBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    authSection?.classList.add("hidden");
    uploadSection?.classList.add("hidden");
    console.log("State: LOGGED OUT (student)");
  }

  // Always re-render no matter what
  if (resourceGrid) {
    renderResources();
  } else {
    console.error("[updateAuthUI] resourceGrid is not mounted yet");
  }
}

// --- AUTH INIT AND LISTENER
async function initAuth() {
  console.log("initAuth: checking current session...");

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Session check failed:", error.message, error);
    updateAuthUI(null);
    return;
  }

  console.log("getSession result:", { session: !!session, user: session?.user?.email });

  updateAuthUI(session?.user ?? null);
}

// --- LOGIN BUTTON TOGGLE
loginToggleBtn?.addEventListener("click", () => {
  console.log("Click: loginToggleBtn toggling authSection...");
  authSection?.classList.toggle("hidden");
});

// --- LOGOUT
logoutBtn?.addEventListener("click", async () => {
  console.log("Click: logoutBtn clicked. Attempting signOut...");

  authMessage.textContent = "";

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("signOut error:", error.message, error);
    authMessage.textContent = error.message;
    return;
  }

  console.log("signOut success. User now logged out.");
  authMessage.textContent = "";
  uploadMessage.textContent = "";
  updateAuthUI(null);
});

// --- LOGIN FORM
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Submit: loginForm submitted");

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  console.log("Login form values:", { email: !!email, password: !!password });

  if (!email || !password) {
    console.warn("Login form: missing email or password");
    authMessage.textContent = "Please fill email and password.";
    return;
  }

  authMessage.textContent = "Logging in...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("signInWithPassword result:", { data: !!data, error });

    if (error) {
      console.error("signInWithPassword error:", error.message, error);
      authMessage.textContent = `Login failed: ${error.message}`;
      return;
    }

    console.log("Login success. User:", data.user?.email);
    authMessage.textContent = "Login successful";
    updateAuthUI(data.user);
  } catch (err) {
    console.error("Unexpected login error:", err);
    authMessage.textContent = `Connect error: ${err.message}`;
  }
});

// --- AUTH STATE CHANGE LISTENER
supabase.auth.onAuthStateChange((_event, session) => {
  console.log("onAuthStateChange triggered. session:", !!session);
  updateAuthUI(session?.user ?? null);
});

// --- UPLOAD FORM
uploadForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Submit: uploadForm submitted");

  if (!currentUser) {
    console.warn("Upload: no currentUser, preventing upload");
    uploadMessage.textContent = "Please login as teacher first.";
    return;
  }

  console.log("Current user:", currentUser.email);

  const title = document.getElementById("title")?.value.trim();
  const category = document.getElementById("category")?.value;
  const file = document.getElementById("fileInput")?.files[0];
  const selectedSubject = uploadSubject?.value;
  const typedSubject = customSubject?.value.trim();
  const subject = typedSubject || selectedSubject;

  console.log("Upload form values:", { title, subject, category, file: !!file });

  if (!title || !subject || !category || !file) {
    console.warn("Upload: missing field(s)");
    uploadMessage.textContent = "Please fill all fields.";
    return;
  }

  try {
    uploadMessage.textContent = "Starting upload...";
    progressBar.value = 0;
    console.log("Upload step 0: reset progress bar");

    const safeFileName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^\w.\-]/g, "");

    const safeSubject = subject.replace(/[^\w\-]/g, "");

    const filePath = `${safeSubject}/${Date.now()}-${safeFileName}`;

    console.log("Upload step 1: generated path", { filePath });

    uploadMessage.textContent = "Uploading to Supabase Storage...";
    progressBar.value = 25;

    const { error: storageError } = await supabase.storage
      .from("resources")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload failed:", storageError.message, storageError);
      uploadMessage.textContent = `Upload failed: ${storageError.message}`;
      progressBar.value = 0;
      return;
    }

    console.log("Upload step 2: Storage upload OK");

    uploadMessage.textContent = "Getting public URL...";
    progressBar.value = 50;

    const { data: urlData } = supabase.storage
      .from("resources")
      .getPublicUrl(filePath);

    const fileUrl = urlData?.publicUrl;

    if (!fileUrl) {
      console.error("No public URL returned for", filePath);
      uploadMessage.textContent = "No public URL generated.";
      progressBar.value = 0;
      return;
    }

    console.log("Upload step 3: public URL OK", { fileUrl });

    uploadMessage.textContent = "Saving metadata to DB...";
    progressBar.value = 70;

    const payload = {
      title,
      subject,
      category,
      file_name: file.name,
      file_type: file.type || "unknown",
      file_url: fileUrl,
      file_path: filePath,
      uploaded_by: currentUser?.email || "teacher",
    };

    console.log("DB payload:", payload);

    const { error: insertError } = await supabase
  .from("resources")
  .insert([payload]);

if (insertError) {
  console.error("DB insert failed:", insertError.message, insertError);
  uploadMessage.textContent = `Save failed: ${insertError.message}`;
  progressBar.value = 0;
  return;
}

console.log("Upload step 4: DB insert OK");

uploadMessage.textContent = "Upload successful!";
progressBar.value = 100;
uploadForm.reset();

setTimeout(() => {
  progressBar.value = 0;
}, 1200);

await loadResources();
  } catch (error) {
    console.error("Unexpected upload error:", error);
    uploadMessage.textContent = `Unexpected upload error: ${error.message}`;
    progressBar.value = 0;
  }
});

// --- DELETE HANDLER
async function handleDelete(resourceId, filePath) {
  if (!currentUser) {
    console.warn("Delete: no currentUser, blocking deletion");
    alert("Only logged-in teachers can delete resources.");
    return;
  }

  console.log("Delete: resourceId =", resourceId, "filePath =", filePath);

  if (!confirm("Delete this resource?")) {
    console.log("Delete: user canceled");
    return;
  }

  const { error: storageError } = await supabase.storage
    .from("resources")
    .remove([filePath]);

  if (storageError) {
    console.error("Storage delete failed:", storageError.message, storageError);
    alert("Failed to delete file: " + storageError.message);
    return;
  }

  console.log("Delete step 1: file deleted from Storage");

  const { error: dbError } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId);

  if (dbError) {
    console.error("DB delete failed:", dbError.message, dbError);
    alert("Failed to delete record: " + dbError.message);
    return;
  }

  console.log("Delete step 2: DB record deleted");

  await loadResources();
  console.log("Reloaded resources after delete");
}

// --- LOAD RESOURCES
async function loadResources() {
  console.log("Loading resources from Supabase...");

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load resources failed:", error.message, error);
    resourceGrid.innerHTML = `<div class="card"><p>Failed to load resources.</p></div>`;
    return;
  }

  console.log("Load resources success. Count:", data.length);
  allResources = data || [];

  renderResources();
}

// --- RENDER RESOURCES
function renderResources() {
  const keyword = (searchInput?.value || "").toLowerCase().trim();
  const subjectValue = filterSubject?.value;
  const categoryValue = filterCategory?.value;

  console.log("Render: filter params", { keyword, subjectValue, categoryValue });

  const filtered = allResources.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(keyword) ||
      item.subject?.toLowerCase().includes(keyword) ||
      item.category?.toLowerCase().includes(keyword) ||
      item.file_name?.toLowerCase().includes(keyword);

    const matchesSubject =
      subjectValue === "All" || item.subject === subjectValue;

    const matchesCategory =
      categoryValue === "All" || item.category === categoryValue;

    return matchesSearch && matchesSubject && matchesCategory;
  });

  console.log("Render: filtered count =", filtered.length);

  resourceGrid.innerHTML = "";

  if (!filtered.length) {
    resourceGrid.innerHTML = `<div class="card"><p>No resources found.</p></div>`;
    console.log("Render: no resources to show");
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className = "resource-card";

    const deleteBtn = currentUser
      ? `<button class="btn btn-delete delete-btn">Delete</button>`
      : "";

    card.innerHTML = `
      <div class="resource-meta">
        <span class="badge">${item.subject}</span>
        <span class="badge">${item.category}</span>
      </div>
      <h3>${item.title}</h3>
      <p><strong>File:</strong> ${item.file_name}</p>
      <p><strong>Uploaded by:</strong> ${item.uploaded_by || "Teacher"}</p>
      <a href="${item.file_url}" target="_blank" rel="noopener noreferrer">Open Resource</a>
      ${deleteBtn}
    `;

    if (currentUser) {
      const deleteButton = card.querySelector(".delete-btn");
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          console.log("Delete click: resource", item.id, item.file_path);
          handleDelete(item.id, item.file_path);
        });
      }
    }

    resourceGrid.appendChild(card);
  });

  console.log("Render: all cards appended");
}

// --- FILTERS
searchInput?.addEventListener("input", () => {
  console.log("Filter: searchInput changed");
  renderResources();
});

filterSubject?.addEventListener("change", () => {
  console.log("Filter: filterSubject changed");
  renderResources();
});

filterCategory?.addEventListener("change", () => {
  console.log("Filter: filterCategory changed");
  renderResources();
});

// --- BOOT: INIT
console.log("Starting app initialization");
initAuth();
loadResources();

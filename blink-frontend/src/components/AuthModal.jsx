import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthModal({ open, onClose }) {
  const { user, login, signup, googleLogin, logout, updateProfile } = useAuth();
  const [tab, setTab] = useState("login"); // "login" | "signup" | "google"
  const [authMsg, setAuthMsg] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [loginFields, setLoginFields] = useState({ email: "", password: "" });
  const [signupFields, setSignupFields] = useState({ name: "", email: "", password: "" });
  const [googleFields, setGoogleFields] = useState({ name: "", email: "", password: "" });

  const [profileFields, setProfileFields] = useState({
    name: "",
    email: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setAuthMsg("");
    setProfileError("");
    setProfileSuccess("");
    if (user) {
      setProfileFields({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        currentPassword: "",
        newPassword: "",
      });
    } else {
      setTab("login");
    }
  }, [open, user]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!open) return null;

  async function handleLogin(e) {
    e.preventDefault();
    setAuthMsg("");
    setAuthBusy(true);
    try {
      await login(loginFields.email.trim(), loginFields.password);
      setLoginFields({ email: "", password: "" });
      onClose();
    } catch (err) {
      setAuthMsg(err.message || "Couldn't reach the backend. Is it running?");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setAuthMsg("");
    setAuthBusy(true);
    try {
      await signup(signupFields.name.trim(), signupFields.email.trim(), signupFields.password);
      setSignupFields({ name: "", email: "", password: "" });
      onClose();
    } catch (err) {
      setAuthMsg(err.message || "Couldn't reach the backend. Is it running?");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleSubmit(e) {
    e.preventDefault();
    setAuthMsg("");
    setAuthBusy(true);

    const email = googleFields.email.trim().toLowerCase();
    const password = googleFields.password;
    const name = googleFields.name.trim() || email.split("@")[0];

    try {
      await googleLogin({
        email,
        name,
        password,
      });
      setGoogleFields({ name: "", email: "", password: "" });
      onClose();
    } catch (err) {
      setAuthMsg(err.message || "Google authentication failed. Please verify your email and password.");
    } finally {
      setAuthBusy(false);
    }
  }

  function handleStartGoogleFlow() {
    setAuthMsg("");
    if (tab === "signup" && signupFields.email) {
      setGoogleFields((f) => ({
        ...f,
        email: signupFields.email,
        name: signupFields.name,
      }));
    } else if (tab === "login" && loginFields.email) {
      setGoogleFields((f) => ({
        ...f,
        email: loginFields.email,
      }));
    }
    setTab("google");
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (profileFields.newPassword && !profileFields.currentPassword) {
      setProfileError("Enter your current password to set a new one.");
      return;
    }

    const body = {
      name: profileFields.name.trim(),
      email: profileFields.email.trim(),
      bio: profileFields.bio,
    };
    if (profileFields.newPassword) {
      body.currentPassword = profileFields.currentPassword;
      body.newPassword = profileFields.newPassword;
    }

    setProfileBusy(true);
    try {
      await updateProfile(body);
      setProfileFields((f) => ({ ...f, currentPassword: "", newPassword: "" }));
      setProfileSuccess("Saved.");
    } catch (err) {
      setProfileError(err.message || "Couldn't reach the backend. Is it running?");
    } finally {
      setProfileBusy(false);
    }
  }

  function handleLogout() {
    logout();
    onClose();
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";

  return (
    <div
      className="modal-overlay open"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="modal-card">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          &times;
        </button>

        {!user ? (
          <div>
            <div className="modal-tabs">
              <button
                type="button"
                className={"modal-tab" + (tab === "login" ? " active" : "")}
                onClick={() => {
                  setTab("login");
                  setAuthMsg("");
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={"modal-tab" + (tab === "signup" ? " active" : "")}
                onClick={() => {
                  setTab("signup");
                  setAuthMsg("");
                }}
              >
                Sign up
              </button>
              <button
                type="button"
                className={"modal-tab" + (tab === "google" ? " active" : "")}
                onClick={() => {
                  setTab("google");
                  setAuthMsg("");
                }}
              >
                Google
              </button>
            </div>

            <div className={"form-msg error" + (authMsg ? " show" : "")}>{authMsg}</div>

            {/* Google Social Action Button on Login/Signup */}
            {tab !== "google" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <button
                  type="button"
                  className="google-btn"
                  onClick={handleStartGoogleFlow}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                    padding: "0.65rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: "#ffffff",
                    color: "#1f2937",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  {tab === "login" ? "Sign in with Google" : "Sign up with Google"}
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    margin: "1.1rem 0 0.5rem 0",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <span style={{ flex: 1, height: "1px", background: "var(--border)" }}></span>
                  <span style={{ padding: "0 0.6rem" }}>or with email</span>
                  <span style={{ flex: 1, height: "1px", background: "var(--border)" }}></span>
                </div>
              </div>
            )}

            {tab === "login" && (
              <form onSubmit={handleLogin}>
                <h2 className="modal-title">Welcome back</h2>
                <p className="modal-sub">Log in to update your profile.</p>
                <div className="form-field">
                  <label htmlFor="loginEmail">Email</label>
                  <input
                    type="email"
                    id="loginEmail"
                    autoComplete="email"
                    required
                    value={loginFields.email}
                    onChange={(e) => setLoginFields((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="loginPassword">Password</label>
                  <input
                    type="password"
                    id="loginPassword"
                    autoComplete="current-password"
                    required
                    value={loginFields.password}
                    onChange={(e) => setLoginFields((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <button type="submit" className="modal-submit" disabled={authBusy}>
                  {authBusy ? "Logging in…" : "Log in"}
                </button>
              </form>
            )}

            {tab === "signup" && (
              <form onSubmit={handleSignup}>
                <h2 className="modal-title">Join Blink</h2>
                <p className="modal-sub">Create a free account — no card, no catch.</p>
                <div className="form-field">
                  <label htmlFor="signupName">Name</label>
                  <input
                    type="text"
                    id="signupName"
                    autoComplete="name"
                    required
                    value={signupFields.name}
                    onChange={(e) => setSignupFields((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="signupEmail">Email</label>
                  <input
                    type="email"
                    id="signupEmail"
                    autoComplete="email"
                    required
                    value={signupFields.email}
                    onChange={(e) => setSignupFields((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="signupPassword">Password</label>
                  <input
                    type="password"
                    id="signupPassword"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={signupFields.password}
                    onChange={(e) => setSignupFields((f) => ({ ...f, password: e.target.value }))}
                  />
                  <span className="form-hint">At least 8 characters.</span>
                </div>
                <button type="submit" className="modal-submit" disabled={authBusy}>
                  {authBusy ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}

            {tab === "google" && (
              <form onSubmit={handleGoogleSubmit}>
                <h2 className="modal-title">Google Authentication</h2>
                <p className="modal-sub">
                  Sign in or register with your Google account. Ensure your email and Google account password match.
                </p>
                <div className="form-field">
                  <label htmlFor="googleName">Your Name</label>
                  <input
                    type="text"
                    id="googleName"
                    placeholder="e.g. Alex"
                    value={googleFields.name}
                    onChange={(e) => setGoogleFields((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="googleEmail">Google Account Email</label>
                  <input
                    type="email"
                    id="googleEmail"
                    placeholder="your.email@gmail.com"
                    autoComplete="email"
                    required
                    value={googleFields.email}
                    onChange={(e) => setGoogleFields((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="googlePassword">Google Account Password</label>
                  <input
                    type="password"
                    id="googlePassword"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    minLength={8}
                    required
                    value={googleFields.password}
                    onChange={(e) => setGoogleFields((f) => ({ ...f, password: e.target.value }))}
                  />
                  <span className="form-hint">Must match your Google account credentials (min 8 characters).</span>
                </div>
                <button type="submit" className="modal-submit" disabled={authBusy}>
                  {authBusy ? "Verifying with Google…" : "Continue with Google"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <div className="profile-head">
              <h2 className="modal-title">Your profile</h2>
              <button className="logout-btn" type="button" onClick={handleLogout}>
                Log out
              </button>
            </div>
            <p className="modal-sub">
              {user.auth_provider === "google" && <span style={{ color: "#4285F4", fontWeight: 600 }}>Google Account · </span>}
              {memberSince ? `Member since ${memberSince}` : ""}
            </p>

            <div className={"form-msg error" + (profileError ? " show" : "")}>{profileError}</div>
            <div className={"form-msg success" + (profileSuccess ? " show" : "")}>{profileSuccess}</div>

            <form onSubmit={handleProfileSave}>
              <div className="form-field">
                <label htmlFor="profileName">Name</label>
                <input
                  type="text"
                  id="profileName"
                  required
                  value={profileFields.name}
                  onChange={(e) => setProfileFields((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="profileEmail">Email</label>
                <input
                  type="email"
                  id="profileEmail"
                  required
                  value={profileFields.email}
                  onChange={(e) => setProfileFields((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="profileBio">Bio</label>
                <textarea
                  id="profileBio"
                  placeholder="What are you learning right now?"
                  value={profileFields.bio}
                  onChange={(e) => setProfileFields((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>

              <div className="form-divider">Change password (optional)</div>
              <div className="form-field">
                <label htmlFor="profileCurrentPassword">Current password</label>
                <input
                  type="password"
                  id="profileCurrentPassword"
                  autoComplete="current-password"
                  value={profileFields.currentPassword}
                  onChange={(e) => setProfileFields((f) => ({ ...f, currentPassword: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="profileNewPassword">New password</label>
                <input
                  type="password"
                  id="profileNewPassword"
                  autoComplete="new-password"
                  minLength={8}
                  value={profileFields.newPassword}
                  onChange={(e) => setProfileFields((f) => ({ ...f, newPassword: e.target.value }))}
                />
                <span className="form-hint">Only fill both password fields if you want to change it.</span>
              </div>

              <button type="submit" className="modal-submit" disabled={profileBusy}>
                Save changes
              </button>
            </form>

            {/* Recently Clicked / Opened Courses */}
            {user.clicked_courses && user.clicked_courses.length > 0 && (
              <div style={{ marginTop: "1.75rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  Your Visited Courses ({user.clicked_courses.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "180px", overflowY: "auto" }}>
                  {user.clicked_courses.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        backgroundColor: "var(--card-bg, rgba(255,255,255,0.04))",
                        border: "1px solid var(--border)",
                        fontSize: "0.825rem",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                        <span className="platform-tag" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                          {item.platform}
                        </span>
                        <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.course_title}
                        </span>
                      </div>
                      <span style={{ color: "var(--accent, #f59e0b)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>&rarr;</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

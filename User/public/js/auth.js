const authForm = document.querySelector("[data-auth-form]");
const authAlert = document.querySelector("#authAlert");

const setAlert = (message, type = "danger") => {
  if (!authAlert) return;
  authAlert.className = `alert alert-${type}`;
  authAlert.textContent = message;
  authAlert.hidden = false;
};

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mode = authForm.dataset.authForm;
    const formData = new FormData(authForm);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setAlert(data.message || data.error_description || data.msg || "Proses gagal");
      return;
    }

    const session = data.session;
    if (session?.access_token) {
      localStorage.setItem("simontir_token", session.access_token);
      localStorage.setItem("simontir_email", session.user?.email || payload.email);
    }

    setAlert(mode === "login" ? "Login berhasil" : "Sign up berhasil", "success");

    setTimeout(() => {
      window.location.href = mode === "login" ? "/dashboard" : "/login";
    }, 600);
  });
}

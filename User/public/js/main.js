const recommendationForm = document.querySelector("#recommendationForm");
const recommendationResult = document.querySelector("#recommendationResult");
const authLinks = document.querySelector("#authLinks");
const userLinks = document.querySelector("#userLinks");
const logoutBtn = document.querySelector("#logoutBtn");

// Check auth status on load
const token = localStorage.getItem("simontir_token");
if (token && authLinks && userLinks) {
  authLinks.style.display = "none";
  userLinks.style.display = "block";
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("simontir_token");
    localStorage.removeItem("simontir_email");
    window.location.href = "/";
  });
}

if (recommendationForm && recommendationResult) {
  recommendationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const kilometer = Number(new FormData(recommendationForm).get("kilometer"));

    const response = await fetch("/api/reservations/recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kilometer })
    });

    const data = await response.json();
    recommendationResult.textContent = data.rekomendasi || "Rekomendasi belum tersedia";
  });
}

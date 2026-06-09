const recommendationForm = document.querySelector("#recommendationForm");
const recommendationResult = document.querySelector("#recommendationResult");

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

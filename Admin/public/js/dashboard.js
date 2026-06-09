const tokenKey = "simontir_admin_token";
const token = () => localStorage.getItem(tokenKey);

const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#adminLoginForm");
const loginAlert = document.querySelector("#loginAlert");
const dashboardAlert = document.querySelector("#dashboardAlert");
const logoutButton = document.querySelector("#logoutButton");
const stats = {
  total_pelanggan: document.querySelector("#totalPelanggan"),
  total_kendaraan: document.querySelector("#totalKendaraan"),
  total_reservasi: document.querySelector("#totalReservasi"),
  reservasi_hari_ini: document.querySelector("#reservasiHariIni")
};
const usersTable = document.querySelector("#usersTable");
const reservationsTable = document.querySelector("#reservationsTable");

const setAlert = (element, message, type = "danger") => {
  if (!element) return;
  element.className = `alert alert-${type}`;
  element.textContent = message;
  element.hidden = false;
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request gagal");
  return data;
};

const showDashboard = (isLoggedIn) => {
  loginView.hidden = isLoggedIn;
  dashboardView.hidden = !isLoggedIn;
};

const renderStats = (data) => {
  Object.entries(stats).forEach(([key, element]) => {
    if (element) element.textContent = data[key] ?? 0;
  });
};

const renderUsers = (users) => {
  usersTable.innerHTML = "";
  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.nama || "-"}</td>
      <td>${user.email}</td>
      <td><span class="badge text-bg-secondary">${user.role || "user"}</span></td>
      <td>${user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID") : "-"}</td>
    `;
    usersTable.appendChild(row);
  });
};

const renderReservations = (reservations) => {
  reservationsTable.innerHTML = "";
  reservations.forEach((reservation) => {
    const customer = reservation.profiles;
    const vehicle = reservation.kendaraan;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${customer?.nama || "-"}</td>
      <td>${vehicle ? `${vehicle.merk} ${vehicle.tipe}` : "-"}</td>
      <td>${reservation.tanggal_servis}</td>
      <td>${reservation.jam_servis}</td>
      <td>${reservation.jenis_servis}</td>
      <td>
        <select class="form-select form-select-sm" data-reservation-id="${reservation.id}">
          ${["Pending", "Dikonfirmasi", "Ditolak", "Selesai"].map((status) => `
            <option value="${status}" ${reservation.status === status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </td>
    `;
    reservationsTable.appendChild(row);
  });
};

const loadDashboard = async () => {
  if (!token()) {
    showDashboard(false);
    return;
  }

  showDashboard(true);

  try {
    const [dashboard, users, reservations] = await Promise.all([
      request("/api/admin/dashboard"),
      request("/api/admin/users"),
      request("/api/admin/reservations")
    ]);

    renderStats(dashboard);
    renderUsers(users);
    renderReservations(reservations);
  } catch (error) {
    setAlert(dashboardAlert, error.message);
  }
};

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(loginForm).entries());

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Login gagal");
      if (!data.session?.access_token) throw new Error("Token login tidak ditemukan");

      localStorage.setItem(tokenKey, data.session.access_token);
      await loadDashboard();
    } catch (error) {
      setAlert(loginAlert, error.message);
    }
  });
}

if (reservationsTable) {
  reservationsTable.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-reservation-id]");
    if (!select) return;

    try {
      await request(`/api/admin/reservations/${select.dataset.reservationId}`, {
        method: "PUT",
        body: JSON.stringify({ status: select.value })
      });
      setAlert(dashboardAlert, "Status reservasi berhasil diperbarui", "success");
    } catch (error) {
      setAlert(dashboardAlert, error.message);
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(tokenKey);
    showDashboard(false);
  });
}

loadDashboard();

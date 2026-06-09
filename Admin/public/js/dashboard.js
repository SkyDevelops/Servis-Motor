const tokenKey = "simontir_admin_token";
const stockKey = "simontir_admin_stock";
const token = () => localStorage.getItem(tokenKey);

const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#adminLoginForm");
const loginAlert = document.querySelector("#loginAlert");
const dashboardAlert = document.querySelector("#dashboardAlert");
const logoutButton = document.querySelector("#logoutButton");
const adminShell = document.querySelector("#adminShell");
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarLinks = document.querySelectorAll("[data-section]");
const contentSections = document.querySelectorAll(".content-section");
const stats = {
  total_pelanggan: document.querySelector("#totalPelanggan"),
  total_kendaraan: document.querySelector("#totalKendaraan"),
  total_reservasi: document.querySelector("#totalReservasi"),
  reservasi_hari_ini: document.querySelector("#reservasiHariIni")
};
const usersTable = document.querySelector("#usersTable");
const reservationsTable = document.querySelector("#reservationsTable");
const historyReservationsTable = document.querySelector("#historyReservationsTable");
const allHistoryTable = document.querySelector("#allHistoryTable");
const supplierBillsTable = document.querySelector("#supplierBillsTable");
const reservationChart = document.querySelector("#reservationChart");
const stockForm = document.querySelector("#stockForm");
const stockTable = document.querySelector("#stockTable");

const statusMeta = {
  pending: { label: "Pending", badge: "text-bg-secondary" },
  cancel: { label: "Cancel", badge: "text-bg-danger" },
  onProgress: { label: "On Progress", badge: "text-bg-warning" },
  success: { label: "Success", badge: "text-bg-success" }
};

const defaultStock = [
  { id: "stock-busi", nama: "Busi", supplier: "Supplier Astra Motor", stok: 24, harga: 18000, jatuh_tempo: "" },
  { id: "stock-lampu", nama: "Lampu", supplier: "Supplier Cahaya Motor", stok: 16, harga: 35000, jatuh_tempo: "" },
  { id: "stock-rantai", nama: "Rantai Motor", supplier: "Supplier Roda Jaya", stok: 9, harga: 145000, jatuh_tempo: "" }
];

let refreshTimer = null;

const formatDateInput = (date) => date.toISOString().slice(0, 10);

const dateDaysFromNow = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
};

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const setAlert = (element, message, type = "danger") => {
  if (!element) return;
  element.className = `alert alert-${type}`;
  element.textContent = message;
  element.hidden = false;
};

const hideAlert = (element) => {
  if (element) element.hidden = true;
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

const reservationStatus = (status) => statusMeta[status] || statusMeta.pending;

const reservationCustomer = (reservation) => reservation.profiles?.nama || "-";

const reservationVehicle = (reservation) => {
  const vehicle = reservation.kendaraan;
  return vehicle ? `${vehicle.merk} ${vehicle.tipe}` : "-";
};

const reservationDateValue = (reservation) =>
  new Date(`${reservation.tanggal_servis || "1970-01-01"}T${reservation.jam_servis || "00:00"}`);

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

const reservationRows = (reservations, withActions = false) => {
  if (reservations.length === 0) {
    return `
      <tr>
        <td class="text-center text-muted" colspan="${withActions ? 7 : 6}">Belum ada reservasi.</td>
      </tr>
    `;
  }

  return reservations.map((reservation) => {
    const currentStatus = reservationStatus(reservation.status);
    return `
      <tr>
        <td>${reservationCustomer(reservation)}</td>
        <td>${reservationVehicle(reservation)}</td>
        <td>${reservation.tanggal_servis || "-"}</td>
        <td>${reservation.jam_servis || "-"}</td>
        <td>${reservation.jenis_servis || "-"}</td>
        <td><span class="badge ${currentStatus.badge}">${currentStatus.label}</span></td>
        ${withActions ? `
          <td>
            <div class="btn-group btn-group-sm" role="group" aria-label="Ubah status reservasi">
              <button class="btn btn-outline-danger" type="button" data-reservation-id="${reservation.id}" data-status="cancel">Cancel</button>
              <button class="btn btn-outline-warning" type="button" data-reservation-id="${reservation.id}" data-status="onProgress">On Progress</button>
              <button class="btn btn-outline-success" type="button" data-reservation-id="${reservation.id}" data-status="success">Success</button>
            </div>
          </td>
        ` : ""}
      </tr>
    `;
  }).join("");
};

const renderReservations = (reservations) => {
  const sortedReservations = [...reservations].sort((a, b) => reservationDateValue(b) - reservationDateValue(a));
  reservationsTable.innerHTML = reservationRows(sortedReservations, true);
  historyReservationsTable.innerHTML = reservationRows(sortedReservations.slice(0, 10));
  allHistoryTable.innerHTML = reservationRows(sortedReservations);
};

const renderReservationChart = (reservations) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: formatDateInput(date),
      label: date.toLocaleDateString("id-ID", { weekday: "short" }),
      count: 0
    };
  });

  const dayByKey = new Map(days.map((day) => [day.key, day]));
  reservations.forEach((reservation) => {
    const day = dayByKey.get(reservation.tanggal_servis);
    if (day) day.count += 1;
  });

  const maxCount = Math.max(...days.map((day) => day.count), 1);
  reservationChart.innerHTML = days.map((day) => {
    const height = Math.max((day.count / maxCount) * 190, day.count ? 16 : 8);
    return `
      <div class="chart-bar">
        <div class="chart-bar-value">${day.count}</div>
        <div class="chart-bar-fill" style="height: ${height}px"></div>
        <div class="chart-bar-label">${day.label}</div>
      </div>
    `;
  }).join("");
};

const normalizeDefaultStock = () =>
  defaultStock.map((item, index) => ({
    ...item,
    jatuh_tempo: item.jatuh_tempo || dateDaysFromNow(index)
  }));

const readStock = () => {
  const stored = localStorage.getItem(stockKey);
  if (stored) return JSON.parse(stored);
  const stock = normalizeDefaultStock();
  localStorage.setItem(stockKey, JSON.stringify(stock));
  return stock;
};

const writeStock = (stock) => {
  localStorage.setItem(stockKey, JSON.stringify(stock));
};

const renderSupplierBills = (stock) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoon = stock
    .map((item) => {
      const dueDate = new Date(`${item.jatuh_tempo}T00:00:00`);
      const daysLeft = Math.ceil((dueDate - today) / 86400000);
      return { ...item, daysLeft };
    })
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 2)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  supplierBillsTable.innerHTML = dueSoon.length
    ? dueSoon.map((item) => `
        <tr>
          <td>${item.supplier}</td>
          <td>${item.nama}</td>
          <td>${item.jatuh_tempo}</td>
          <td>${rupiah(Number(item.harga) * Number(item.stok))}</td>
        </tr>
      `).join("")
    : '<tr><td class="text-center text-muted" colspan="4">Tidak ada tagihan jatuh tempo kurang dari 2 hari.</td></tr>';
};

const renderStock = () => {
  const stock = readStock();
  stockTable.innerHTML = stock.length
    ? stock.map((item) => `
        <tr>
          <td>${item.nama}</td>
          <td>${item.supplier}</td>
          <td>${item.stok}</td>
          <td>${rupiah(item.harga)}</td>
          <td>${item.jatuh_tempo}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" type="button" data-stock-edit="${item.id}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" type="button" data-stock-delete="${item.id}"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join("")
    : '<tr><td class="text-center text-muted" colspan="6">Belum ada barang.</td></tr>';
  renderSupplierBills(stock);
};

const loadDashboard = async () => {
  if (!token()) {
    showDashboard(false);
    if (refreshTimer) clearInterval(refreshTimer);
    return;
  }

  showDashboard(true);

  try {
    hideAlert(dashboardAlert);
    const [dashboard, users, reservations] = await Promise.all([
      request("/api/admin/dashboard"),
      request("/api/admin/users"),
      request("/api/admin/reservations")
    ]);

    renderStats(dashboard);
    renderUsers(users);
    renderReservations(reservations);
    renderReservationChart(reservations);
    renderStock();
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
  reservationsTable.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-reservation-id][data-status]");
    if (!button) return;

    try {
      button.disabled = true;
      await request(`/api/admin/reservations/${button.dataset.reservationId}`, {
        method: "PUT",
        body: JSON.stringify({ status: button.dataset.status })
      });
      setAlert(dashboardAlert, "Status reservasi berhasil diperbarui", "success");
      await loadDashboard();
    } catch (error) {
      setAlert(dashboardAlert, error.message);
    } finally {
      button.disabled = false;
    }
  });
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    adminShell.classList.toggle("sidebar-collapsed");
  });
}

sidebarLinks.forEach((link) => {
  link.addEventListener("click", () => {
    sidebarLinks.forEach((item) => item.classList.remove("active"));
    contentSections.forEach((section) => section.classList.remove("active"));
    link.classList.add("active");
    document.querySelector(`#${link.dataset.section}`)?.classList.add("active");
  });
});

if (stockForm) {
  stockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(stockForm).entries());
    const stock = readStock();
    const payload = {
      id: formData.id || `stock-${Date.now()}`,
      nama: formData.nama,
      supplier: formData.supplier,
      stok: Number(formData.stok),
      harga: Number(formData.harga),
      jatuh_tempo: formData.jatuh_tempo
    };
    const nextStock = formData.id
      ? stock.map((item) => item.id === formData.id ? payload : item)
      : [payload, ...stock];

    writeStock(nextStock);
    stockForm.reset();
    renderStock();
    setAlert(dashboardAlert, "Data barang berhasil disimpan", "success");
  });
}

if (stockTable) {
  stockTable.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-stock-edit]");
    const deleteButton = event.target.closest("[data-stock-delete]");
    const stock = readStock();

    if (editButton) {
      const item = stock.find((stockItem) => stockItem.id === editButton.dataset.stockEdit);
      if (!item) return;
      stockForm.elements.id.value = item.id;
      stockForm.elements.nama.value = item.nama;
      stockForm.elements.supplier.value = item.supplier;
      stockForm.elements.stok.value = item.stok;
      stockForm.elements.harga.value = item.harga;
      stockForm.elements.jatuh_tempo.value = item.jatuh_tempo;
      document.querySelector('[data-section="stockSection"]')?.click();
    }

    if (deleteButton) {
      writeStock(stock.filter((item) => item.id !== deleteButton.dataset.stockDelete));
      renderStock();
      setAlert(dashboardAlert, "Barang berhasil dihapus", "success");
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(tokenKey);
    if (refreshTimer) clearInterval(refreshTimer);
    showDashboard(false);
  });
}

loadDashboard();
renderStock();

if (!refreshTimer) {
  refreshTimer = setInterval(() => {
    if (token()) loadDashboard();
  }, 15000);
}

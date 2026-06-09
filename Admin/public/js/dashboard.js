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

// Cashier Selectors
const cashierModeRadios = document.querySelectorAll('input[name="cashierMode"]');
const cashierOnlineReservationsView = document.querySelector("#cashierOnlineReservationsView");
const cashierReservationsGrid = document.querySelector("#cashierReservationsGrid");
const cashierActiveTransactionView = document.querySelector("#cashierActiveTransactionView");
const cashierOfflineForm = document.querySelector("#cashierOfflineForm");
const offlinePlat = document.querySelector("#offlinePlat");
const offlineMerk = document.querySelector("#offlineMerk");
const cashierActiveReservationHeader = document.querySelector("#cashierActiveReservationHeader");
const activeResCustomer = document.querySelector("#activeResCustomer");
const activeResVehicle = document.querySelector("#activeResVehicle");
const activeResService = document.querySelector("#activeResService");
const btnCancelActiveReservation = document.querySelector("#btnCancelActiveReservation");
const cashierCatalogFilters = document.querySelectorAll("#cashierCatalogFilters button");
const cashierCatalogGrid = document.querySelector("#cashierCatalogGrid");

const cashierCartTable = document.querySelector("#cashierCartTable");
const cashierPaymentForm = document.querySelector("#cashierPaymentForm");
const cashierSubtotalLabel = document.querySelector("#cashierSubtotalLabel");
const cashierDiskon = document.querySelector("#cashierDiskon");
const cashierPajak = document.querySelector("#cashierPajak");
const cashierTotalLabel = document.querySelector("#cashierTotalLabel");
const cashierNominal = document.querySelector("#cashierNominal");
const cashierKembalianLabel = document.querySelector("#cashierKembalianLabel");

let cashierDataState = { reservations: [], stock: [], services: [] };
let cashierCart = [];
let cashierMode = 'online';
let cashierSelectedReservation = null;
let cashierCatalogFilter = 'all';

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
        <td class="text-center text-muted" colspan="${withActions ? 8 : 7}">Belum ada reservasi.</td>
      </tr>
    `;
  }

  return reservations.map((reservation) => {
    const currentStatus = reservationStatus(reservation.status);
    const badgeType = reservation.tipe_reservasi === 'offline' ? '<span class="badge text-bg-secondary">Offline</span>' : '<span class="badge text-bg-primary">Online</span>';
    
    return `
      <tr>
        <td>${badgeType}</td>
        <td>${reservationCustomer(reservation)}</td>
        <td>${reservationVehicle(reservation)}</td>
        <td>${reservation.tanggal_servis || "-"}</td>
        <td>${reservation.jam_servis || "-"}</td>
        <td>${reservation.jenis_servis || "-"}</td>
        <td><span class="badge ${currentStatus.badge}">${currentStatus.label}</span></td>
        ${withActions ? `
          <td>
            <div class="btn-group btn-group-sm" role="group" aria-label="Ubah status reservasi">
              <button class="btn btn-outline-danger" type="button" data-reservation-id="${reservation.id}" data-status="cancel" ${reservation.tipe_reservasi === 'offline' ? 'disabled' : ''}>Cancel</button>
              <button class="btn btn-outline-warning" type="button" data-reservation-id="${reservation.id}" data-status="onProgress" ${reservation.tipe_reservasi === 'offline' ? 'disabled' : ''}>On Progress</button>
              <button class="btn btn-outline-success" type="button" data-reservation-id="${reservation.id}" data-status="success" ${reservation.tipe_reservasi === 'offline' ? 'disabled' : ''}>Success</button>
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

const renderCashierData = (data) => {
  cashierDataState = data || { reservations: [], stock: [], services: [] };
  setupCashierView();
};

const setupCashierView = () => {
  const checkedMode = document.querySelector('input[name="cashierMode"]:checked');
  if (checkedMode) cashierMode = checkedMode.value;
  
  if (cashierMode === 'online') {
    if (!cashierSelectedReservation) {
      if (cashierOnlineReservationsView) cashierOnlineReservationsView.style.display = 'block';
      if (cashierActiveTransactionView) cashierActiveTransactionView.style.display = 'none';
      renderCashierReservationsList();
    } else {
      if (cashierOnlineReservationsView) cashierOnlineReservationsView.style.display = 'none';
      if (cashierActiveTransactionView) cashierActiveTransactionView.style.display = 'block';
      if (cashierOfflineForm) cashierOfflineForm.style.display = 'none';
      if (cashierActiveReservationHeader) cashierActiveReservationHeader.style.display = 'flex';
      const completeContainer = document.querySelector("#cashierSelesaikanReservasiContainer");
      if (completeContainer) completeContainer.style.display = 'block';
      renderCashierCatalog();
    }
  } else {
    if (cashierOnlineReservationsView) cashierOnlineReservationsView.style.display = 'none';
    if (cashierActiveTransactionView) cashierActiveTransactionView.style.display = 'block';
    if (cashierOfflineForm) cashierOfflineForm.style.display = 'block';
    if (cashierActiveReservationHeader) cashierActiveReservationHeader.style.display = 'none';
    const completeContainer = document.querySelector("#cashierSelesaikanReservasiContainer");
    if (completeContainer) completeContainer.style.display = 'none';
    renderCashierCatalog();
  }
};

const renderCashierReservationsList = () => {
  if (!cashierReservationsGrid) return;
  const pendingReservations = cashierDataState.reservations.filter(r => r.status !== 'cancel');
  
  if (pendingReservations.length === 0) {
    cashierReservationsGrid.innerHTML = '<div class="col-12"><div class="alert alert-light border">Tidak ada reservasi aktif.</div></div>';
    return;
  }
  
  cashierReservationsGrid.innerHTML = pendingReservations.map(r => `
    <div class="col-md-6 col-lg-6">
      <div class="reservation-card h-100" onclick="selectCashierReservation('${r.id}')">
        <div class="d-flex justify-content-between mb-2">
          <strong>${r.kendaraan?.nomor_polisi || '-'}</strong>
          <span class="badge text-bg-primary">${r.tanggal_servis}</span>
        </div>
        <div class="mb-1"><i class="bi bi-person"></i> ${r.profiles?.nama || 'Pelanggan'}</div>
        <div class="mb-1"><i class="bi bi-bicycle"></i> ${r.kendaraan?.merk} ${r.kendaraan?.tipe}</div>
        <div class="text-muted small mt-2"><i class="bi bi-tools"></i> ${r.jenis_servis}</div>
      </div>
    </div>
  `).join('');
};

window.selectCashierReservation = (id) => {
  cashierSelectedReservation = cashierDataState.reservations.find(r => r.id === id);
  if (cashierSelectedReservation) {
    if (activeResCustomer) activeResCustomer.textContent = cashierSelectedReservation.profiles?.nama || 'Pelanggan';
    if (activeResVehicle) activeResVehicle.textContent = `${cashierSelectedReservation.kendaraan?.merk} ${cashierSelectedReservation.kendaraan?.tipe} (${cashierSelectedReservation.kendaraan?.nomor_polisi})`;
    if (activeResService) activeResService.textContent = cashierSelectedReservation.jenis_servis;
    setupCashierView();
  }
};

const getCatalogIcon = (tipe, nama) => {
  if (tipe === 'service') return '<i class="bi bi-wrench-adjustable"></i>';
  const n = nama.toLowerCase();
  if (n.includes('oli') || n.includes('pelumas')) return '<i class="bi bi-droplet-fill"></i>';
  if (n.includes('ban')) return '<i class="bi bi-record-circle"></i>';
  if (n.includes('busi')) return '<i class="bi bi-lightning-charge-fill"></i>';
  if (n.includes('lampu')) return '<i class="bi bi-lightbulb-fill"></i>';
  if (n.includes('rantai')) return '<i class="bi bi-link"></i>';
  return '<i class="bi bi-box-seam"></i>';
};

const getCatalogCategory = (tipe, nama) => {
  if (tipe === 'service') return 'service';
  const n = nama.toLowerCase();
  if (n.includes('oli') || n.includes('pelumas')) return 'oli';
  return 'sparepart';
};

const renderCashierCatalog = () => {
  if (!cashierCatalogGrid) return;
  
  let items = [
    ...cashierDataState.services.map(s => ({ ...s, tipe_item: 'service', cat: 'service' })),
    ...cashierDataState.stock.map(s => ({ ...s, tipe_item: 'barang', cat: getCatalogCategory('barang', s.nama) }))
  ];
  
  if (cashierCatalogFilter !== 'all') {
    items = items.filter(item => item.cat === cashierCatalogFilter);
  }
  
  if (items.length === 0) {
    cashierCatalogGrid.innerHTML = '<div class="col-12"><div class="alert alert-light border">Tidak ada item dalam kategori ini.</div></div>';
    return;
  }
  
  cashierCatalogGrid.innerHTML = items.map(item => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="catalog-card h-100" onclick="addCashierItemToCart('${item.tipe_item}', '${item.id}')">
        <div class="catalog-card-icon">${getCatalogIcon(item.tipe_item, item.nama)}</div>
        <div class="catalog-card-body">
          <div class="catalog-card-title" title="${item.nama}">${item.nama}</div>
          <div class="catalog-card-price">${rupiah(item.harga || item.harga_jual)}</div>
          ${item.tipe_item === 'barang' ? `<small class="text-muted d-block mt-1">Stok: ${item.stok}</small>` : ''}
        </div>
      </div>
    </div>
  `).join('');
};

window.addCashierItemToCart = (tipe_item, id) => {
  let itemData = null;
  if (tipe_item === 'service') {
    itemData = cashierDataState.services.find(s => s.id === id);
  } else {
    itemData = cashierDataState.stock.find(s => s.id === id);
  }
  
  if (!itemData) return;
  
  const existing = cashierCart.find(c => c.tipe_item === tipe_item && (c.service_id === id || c.stok_barang_id === id));
  if (existing) {
    existing.qty += 1;
  } else {
    cashierCart.push({
      tipe_item: tipe_item,
      stok_barang_id: tipe_item === "barang" ? id : null,
      service_id: tipe_item === "service" ? id : null,
      nama_item: itemData.nama,
      qty: 1,
      harga: Number(itemData.harga || itemData.harga_jual)
    });
  }
  renderCashierCart();
};

const renderCashierCart = () => {
  if (!cashierCartTable) return;
  if (cashierCart.length === 0) {
    cashierCartTable.innerHTML = '<tr><td class="text-center text-muted" colspan="4">Keranjang masih kosong.</td></tr>';
  } else {
    cashierCartTable.innerHTML = cashierCart.map((item, index) => `
      <tr>
        <td>
          <div class="fw-bold" style="font-size: 0.85rem; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.nama_item}">${item.nama_item}</div>
          <small class="text-muted">${rupiah(item.harga)}</small>
        </td>
        <td>
          <div class="input-group input-group-sm" style="width: 80px;">
            <button class="btn btn-outline-secondary px-2" type="button" onclick="updateCashierItemQty(${index}, -1)">-</button>
            <input type="text" class="form-control text-center px-0" value="${item.qty}" readonly>
            <button class="btn btn-outline-secondary px-2" type="button" onclick="updateCashierItemQty(${index}, 1)">+</button>
          </div>
        </td>
        <td class="fw-bold" style="font-size: 0.85rem">${rupiah(item.qty * item.harga)}</td>
        <td><button class="btn btn-sm btn-outline-danger" type="button" onclick="removeCashierItem(${index})"><i class="bi bi-trash"></i></button></td>
      </tr>
    `).join("");
  }
  calculateCashierTotal();
};

window.updateCashierItemQty = (index, delta) => {
  cashierCart[index].qty += delta;
  if (cashierCart[index].qty <= 0) {
    cashierCart.splice(index, 1);
  }
  renderCashierCart();
};

window.removeCashierItem = (index) => {
  cashierCart.splice(index, 1);
  renderCashierCart();
};

const calculateCashierTotal = () => {
  if (!cashierSubtotalLabel) return;
  const subtotal = cashierCart.reduce((sum, item) => sum + (item.qty * item.harga), 0);
  const diskon = Number(cashierDiskon.value || 0);
  const pajak = Number(cashierPajak.value || 0);
  const total = Math.max(0, subtotal - diskon + pajak);
  const nominal = Number(cashierNominal.value || 0);
  const kembalian = Math.max(0, nominal - total);
  
  cashierSubtotalLabel.textContent = rupiah(subtotal);
  cashierTotalLabel.textContent = rupiah(total);
  cashierKembalianLabel.textContent = rupiah(kembalian);
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
    const [dashboard, users, reservations, cashierDataResp] = await Promise.all([
      request("/api/admin/dashboard"),
      request("/api/admin/users"),
      request("/api/admin/reservations"),
      request("/api/admin/cashier")
    ]);

    renderStats(dashboard);
    renderUsers(users);
    renderReservations(reservations);
    renderReservationChart(reservations);
    renderStock();
    if (typeof renderCashierData === "function") renderCashierData(cashierDataResp);
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

if (cashierModeRadios) {
  cashierModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      cashierSelectedReservation = null;
      cashierCart = [];
      renderCashierCart();
      setupCashierView();
    });
  });
}

if (btnCancelActiveReservation) {
  btnCancelActiveReservation.addEventListener('click', () => {
    cashierSelectedReservation = null;
    cashierCart = [];
    renderCashierCart();
    setupCashierView();
  });
}

if (cashierCatalogFilters) {
  cashierCatalogFilters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      cashierCatalogFilters.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      cashierCatalogFilter = e.target.dataset.filter;
      renderCashierCatalog();
    });
  });
}

if (cashierDiskon) {
  [cashierDiskon, cashierPajak, cashierNominal].forEach(el => {
    if (el) el.addEventListener("input", calculateCashierTotal);
  });
}

if (cashierPaymentForm) {
  cashierPaymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (cashierCart.length === 0) {
      setAlert(dashboardAlert, "Keranjang belanja kosong!");
      window.scrollTo(0, 0);
      return;
    }
    
    let reservasi_id = null;
    let catatan = cashierPaymentForm.elements.catatan.value;
    
    if (cashierMode === 'online') {
      if (!cashierSelectedReservation) {
        setAlert(dashboardAlert, "Pilih reservasi terlebih dahulu!");
        window.scrollTo(0, 0);
        return;
      }
      reservasi_id = cashierSelectedReservation.id;
    } else {
      const plat = offlinePlat?.value || '-';
      const merk = offlineMerk?.value || '-';
      catatan = `[Kendaraan Langsung: ${plat} - ${merk}]\n${catatan}`;
    }
    
    const payload = {
      reservasi_id,
      diskon: Number(cashierDiskon.value || 0),
      pajak: Number(cashierPajak.value || 0),
      nominal_bayar: Number(cashierNominal.value || 0),
      metode_bayar: document.querySelector("#cashierMetode").value,
      catatan,
      selesaikan_reservasi: cashierMode === 'online' ? document.querySelector("#cashierSelesaikanReservasi").checked : false,
      items: cashierCart
    };
    
    const subtotal = cashierCart.reduce((sum, item) => sum + (item.qty * item.harga), 0);
    const total = Math.max(0, subtotal - payload.diskon + payload.pajak);
    if (payload.nominal_bayar < total) {
      setAlert(dashboardAlert, "Nominal bayar kurang dari total tagihan!");
      window.scrollTo(0, 0);
      return;
    }
    
    try {
      const btn = cashierPaymentForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      await request("/api/admin/cashier", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      hideAlert(dashboardAlert);
      Swal.fire({
        title: "Transaksi Berhasil!",
        text: "Data kasir dan riwayat kendaraan telah tersimpan.",
        icon: "success",
        confirmButtonText: "Tutup",
        confirmButtonColor: "var(--admin-red)"
      });
      
      cashierCart = [];
      cashierPaymentForm.reset();
      cashierSelectedReservation = null;
      if (offlinePlat) offlinePlat.value = '';
      if (offlineMerk) offlineMerk.value = '';
      renderCashierCart();
      setupCashierView();
      await loadDashboard();
    } catch (error) {
      setAlert(dashboardAlert, error.message);
      window.scrollTo(0, 0);
    } finally {
      const btn = cashierPaymentForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = false;
    }
  });
}

loadDashboard();
renderStock();

if (!refreshTimer) {
  refreshTimer = setInterval(() => {
    if (token()) loadDashboard();
  }, 15000);
}

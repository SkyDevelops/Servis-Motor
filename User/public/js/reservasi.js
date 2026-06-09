const token = localStorage.getItem("simontir_token");
const vehicleForm = document.querySelector("#vehicleForm");
const reservationForm = document.querySelector("#reservationForm");
const vehicleSelect = document.querySelector("#kendaraan_id");
const vehicleTable = document.querySelector("#vehicleTable");
const reservationTable = document.querySelector("#reservationTable");
const pageAlert = document.querySelector("#pageAlert");
const logoutButton = document.querySelector("#logoutButton");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
});

const showAlert = (message, type = "danger") => {
  if (!pageAlert) return;
  pageAlert.className = `alert alert-${type}`;
  pageAlert.textContent = message;
  pageAlert.hidden = false;
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request gagal");
  return data;
};

const renderVehicles = (vehicles) => {
  if (!vehicleTable || !vehicleSelect) return;

  vehicleSelect.innerHTML = '<option value="">Pilih kendaraan</option>';
  vehicleTable.innerHTML = "";

  vehicles.forEach((vehicle) => {
    const option = document.createElement("option");
    option.value = vehicle.id;
    option.textContent = `${vehicle.merk} ${vehicle.tipe} - ${vehicle.nomor_polisi}`;
    vehicleSelect.appendChild(option);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${vehicle.merk}</td>
      <td>${vehicle.tipe}</td>
      <td>${vehicle.nomor_polisi}</td>
      <td>${vehicle.tahun || "-"}</td>
      <td>${vehicle.kilometer || 0}</td>
    `;
    vehicleTable.appendChild(row);
  });
};

const renderReservations = (reservations) => {
  if (!reservationTable) return;
  reservationTable.innerHTML = "";

  reservations.forEach((reservation) => {
    const vehicle = reservation.kendaraan;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${reservation.tanggal_servis}</td>
      <td>${reservation.jam_servis}</td>
      <td>${vehicle ? `${vehicle.merk} ${vehicle.tipe}` : "-"}</td>
      <td>${reservation.jenis_servis}</td>
      <td><span class="badge text-bg-secondary">${reservation.status}</span></td>
    `;
    reservationTable.appendChild(row);
  });
};

const loadPage = async () => {
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const [vehicles, reservations] = await Promise.all([
      request("/api/vehicles"),
      request("/api/reservations")
    ]);
    renderVehicles(vehicles);
    renderReservations(reservations);
  } catch (error) {
    showAlert(error.message);
  }
};

if (vehicleForm) {
  vehicleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(vehicleForm).entries());
      payload.tahun = payload.tahun ? Number(payload.tahun) : null;
      payload.kilometer = payload.kilometer ? Number(payload.kilometer) : 0;
      await request("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      vehicleForm.reset();
      showAlert("Kendaraan berhasil ditambahkan", "success");
      await loadPage();
    } catch (error) {
      showAlert(error.message);
    }
  });
}

if (reservationForm) {
  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(reservationForm).entries());
      await request("/api/reservations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      reservationForm.reset();
      showAlert("Reservasi berhasil dibuat", "success");
      await loadPage();
    } catch (error) {
      showAlert(error.message);
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("simontir_token");
    localStorage.removeItem("simontir_email");
    window.location.href = "/";
  });
}

loadPage();

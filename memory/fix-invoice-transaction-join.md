---
name: fix-invoice-transaction-join
description: Fix for empty transaksi_kasir in reservation data due to inner joins on service_catalog and stok_barang
metadata:
  type: project
---

Changed the nested selects in src/services/reservationService.js getReservationById function to use optional joins (removed !inner) for service_catalog and stok_barang within detail_transaksi_kasir. This prevents rows from being filtered out when either service_catalog or stok_barang is null (which is normal for service vs sparepart items). The frontend already handles missing nested data via getNested fallback to nama_item.

Why: The original inner joins caused detail_transaksi_kasir rows to be omitted when the related service_catalog or stok_barang was missing, and in some cases this resulted in the entire transaksi_kasir array being empty (observed behavior). Changing to left joins preserves the transaction rows.

How to apply: The change has been applied to the codebase. No further action needed.

Related: [[session-summary-2026-06-23]]
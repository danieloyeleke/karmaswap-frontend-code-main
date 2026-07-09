import api from "./axios";

const pickFirst = (obj, keys, fallback = null) => {
  if (!obj) return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return fallback;
};

export const mapEscrowToOrder = (payload = {}, fallback = {}) => {
  const statusRaw =
    pickFirst(payload, [
      "status",
      "transactionStatus",
      "transaction_status",
      "state",
    ]) ||
    fallback.status ||
    "Awaiting_Dispatch";

  const status = (() => {
    const upper = String(statusRaw || "").toUpperCase();
    if (upper === "AWAITING_DISPATCH") return "ESCROW"; // normalize alias
    if (upper === "IN_TRANSIT") return "DISPATCHED"; // normalize alias
    if (upper === "RECEIVED_PENDING_REVIEW") return "DELIVERED";
    if (upper === "FUNDS_RELEASED" || upper === "CLOSED_LOOP_COMPLETE")
      return "COMPLETED";
    // ESCROW, DISPATCHED, DELIVERED, COMPLETED, CANCELLED, ABANDONED pass through
    if (
      [
        "ESCROW",
        "DISPATCHED",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
        "ABANDONED",
      ].includes(upper)
    )
      return upper;
    return "ESCROW"; // safe default
  })();

  const escrowId = pickFirst(
    payload,
    ["id", "escrowId", "escrow_id"],
    fallback.id,
  );
  const item = payload.item || fallback.item;
  const lockedKarma =
    pickFirst(
      payload,
      ["lockedKarma", "locked_karma", "escrowAmount", "karmaLocked"],
      fallback.lockedKarma,
    ) || 0;

  const carbonSaved =
    payload.carbonSavedKg ??
    payload.carbon_saved_kg ??
    fallback.carbonSavedKg ??
    Math.max(1, Math.round((lockedKarma || fallback.lockedKarma || 10) * 0.4));

  const API_ORIGIN =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:8080";

  const normalizeUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_ORIGIN}/uploads/${url}`;
  };

  return {
    id: payload.id || fallback.id,
    escrowId: payload.id || fallback.id,
    status: status,
    item,
    itemId: payload.itemId || fallback.itemId,
    itemTitle: payload.itemTitle || payload.item?.title || fallback.itemTitle,
    itemImageUrl: normalizeUrl(
      payload.itemImageUrl || payload.item?.imageUrl || fallback.itemImageUrl,
    ),
    itemOwnerId: payload.itemOwnerId || fallback.itemOwnerId,
    itemOwnerUsername: payload.itemOwnerUsername || fallback.itemOwnerUsername,

    karmaAmount:
      payload.karmaAmount || payload.lockedKarma || fallback.karmaAmount || 0,
    lockedKarma:
      payload.lockedKarma || payload.karmaAmount || fallback.lockedKarma || 0,

    buyerId: payload.buyerId || fallback.buyerId,
    buyerName: payload.buyerName || fallback.buyerName,
    sellerId: payload.sellerId || fallback.sellerId,
    sellerName: payload.sellerName || fallback.sellerName,
    sellerRating: payload.sellerRating || fallback.sellerRating,

    deliveryMethod: payload.deliveryMethod || fallback.deliveryMethod,
    trackingNumber: payload.trackingNumber || fallback.trackingNumber || "",

    disputeStatus: payload.disputeStatus || null,
    dispatchedTime: payload.dispatchedTime || fallback.dispatchedTime,
    releaseTime:
      payload.releaseTime || payload.escrowReleaseAt || fallback.releaseTime,
    escrowReleaseAt:
      payload.escrowReleaseAt ||
      payload.releaseTime ||
      new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    remainingSeconds: payload.remainingSeconds || 0,
    acknowledged: payload.acknowledged || false,

    createdAt:
      payload.createdAt || fallback.createdAt || new Date().toISOString(),
    raw: payload,
  };
};

export const startEscrow = async (
  itemId,
  { deliveryMethod, deliveryDetails },
) => {
  const response = await api.post(`/escrow/start/${itemId}`); // ← no body
  return mapEscrowToOrder(response.data, {
    itemId,
    deliveryMethod,
    deliveryDetails,
    status: "Awaiting_Dispatch",
  });
};

export const fetchEscrow = async (escrowId) => {
  const response = await api.get(`/escrow/${escrowId}`);
  return mapEscrowToOrder(response.data);
};

export const dispatchEscrow = async (
  escrowId,
  { trackingNumber, preShipmentPhoto },
) => {
  const response = await api.post(`/escrow/${escrowId}/dispatch`, {
    trackingNumber: trackingNumber || "",
    preShipmentPhoto,
  });
  return mapEscrowToOrder(response.data, {
    id: escrowId,
    trackingNumber,
    preShipmentPhoto,
    status: "In_Transit",
  });
};

export const completeEscrow = async (escrowId) => {
  const response = await api.post(`/escrow/${escrowId}/complete`);
  return mapEscrowToOrder(response.data, {
    id: escrowId,
    status: "Funds_Released",
  });
};

export const cancelEscrow = async (escrowId) => {
  const response = await api.post(`/escrow/${escrowId}/cancel`);
  return mapEscrowToOrder(response.data, { id: escrowId, status: "Cancelled" });
};

export const markDelivered = async (escrowId) => {
  const response = await api.post(`/escrow/${escrowId}/deliver`);
  return mapEscrowToOrder(response.data, {
    id: escrowId,
    status: "Received_Pending_Review",
  });
};

export const getSellerEscrows = async () => {
  try {
    const response = await api.get("/escrow/seller/active");
    if (!Array.isArray(response.data)) return [];
    return response.data.map((item) => mapEscrowToOrder(item));
  } catch (error) {
    console.warn("Could not fetch seller escrows:", error?.message);
    return [];
  }
};

export const getSellerEscrowSummary = async () => {
  try {
    const response = await api.get("/escrow/seller/summary");
    return (
      response.data || {
        totalLockedKarma: 0,
        activeEscrows: 0,
        pendingDispatch: 0,
      }
    );
  } catch (error) {
    console.warn("Could not fetch escrow summary:", error?.message);
    return { totalLockedKarma: 0, activeEscrows: 0, pendingDispatch: 0 };
  }
};

export const getSellerNotifications = async () => {
  const response = await api.get("/notifications/seller");
  return Array.isArray(response.data) ? response.data : [];
};

export const acknowledgeNotification = async (notificationId) => {
  const response = await api.patch(
    `/notifications/${notificationId}/acknowledge`,
  );
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

export const fetchEscrowDetails = async (escrowId) => {
  const response = await api.get(`/escrow/${escrowId}/details`);
  return mapEscrowToOrder(response.data, { id: escrowId });
};

export const getEscrowActivities = async () => {
  const response = await api.get("/escrow/activities");
  return Array.isArray(response.data) ? response.data : [];
};

export const getSellerEscrowHistory = async () => {
  const response = await api.get("/escrow/seller/history");
  return Array.isArray(response.data)
    ? response.data.map((item) => mapEscrowToOrder(item))
    : [];
};

export const getBuyerActiveTrades = async () => {
  const response = await api.get("/escrow/buyer/active");
  return Array.isArray(response.data)
    ? response.data.map((item) => mapEscrowToOrder(item))
    : [];
};

export const getAllActiveTrades = async () => {
  const response = await api.get("/escrow/activities");
  return Array.isArray(response.data)
    ? response.data.map((item) => mapEscrowToOrder(item))
    : [];
};

export const getTradeHistory = async () => {
  const response = await api.get("/escrow/history");
  return Array.isArray(response.data)
    ? response.data.map((item) => mapEscrowToOrder(item))
    : [];
};

export const acknowledgeEscrow = async (escrowId) => {
  await api.patch(`/escrow/${escrowId}/acknowledge`);
};

export const rateSeller = async (escrowId, rating) => {
  const response = await api.post(`/reviews/${escrowId}`, { rating });
  return response.data;
};

export const getUnreadSummary = async () => {
  const response = await api.get("/escrow/unread-summary");
  return response.data;
};
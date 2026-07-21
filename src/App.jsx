import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { getUnreadSummary } from "./api/escrow";
import Auth from "./components/Auth";
import Marketplace from "./components/Marketplace";
import ListItem from "./components/ListItem";
import ItemDetail from "./components/ItemDetail";
import CheckoutEscrowConfirmation from "./components/CheckoutEscrowConfirmation";
import BuyerEscrowView from "./components/BuyerEscrowView";
import Profile from "./components/Profile";
import Social from "./components/Social";
import { SellerDashboard } from "./components/SellerDashboard";
import TransactionComplete from "./components/TransactionComplete";
import DisputeResolution from "./components/DisputeResolution";
import AdminLogin from "./components/AdminLogin";
import AdminApp from "./components/AdminApp";
import AdminBootstrap from "./components/AdminBootstrap";
import MyTrades from "./components/MyTrades";
import TradeDetail from "./components/TradeDetail";
import NotificationBell from "./components/NotificationBell";
import Notifications from "./components/Notifications";
import PublicProfile from "./components/PublicProfile";
import { dispatchEscrow, fetchEscrow } from "./api/escrow";
import "./styles/App.css";
import {
  ShoppingBag,
  Users,
  LayoutDashboard,
  LogOut,
  Plus,
  Package,
} from "lucide-react";

const getActiveOrderStorageKey = (user) =>
  `karma_active_order:${user?.id || user?.email || "guest"}`;

const readStoredOrder = (user) => {
  if (!user) return null;
  try {
    const rawValue = localStorage.getItem(getActiveOrderStorageKey(user));
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
};

function AppContent() {
  const [hasTradeUpdates, setHasTradeUpdates] = useState(false);
  const { user, profile, loading, logout, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedItem, setSelectedItem] = useState(null);
  const [checkoutState, setCheckoutState] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [alertChannel, setAlertChannel] = useState(null);
  const [sellerAlerts, setSellerAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("seller_alerts")) || [];
    } catch {
      return [];
    }
  });
  const [sellerOrders, setSellerOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("seller_orders")) || [];
    } catch {
      return [];
    }
  });
  const [marketplaceRefreshKey, setMarketplaceRefreshKey] = useState(0);

  const activeOrderStorageKey = useMemo(
    () => getActiveOrderStorageKey(user),
    [user],
  );

  useEffect(() => {
    localStorage.removeItem("karma_active_order");
  }, []);

  useEffect(() => {
    if (!user || !authReady) return;
    const stored = readStoredOrder(user);
    setActiveOrder(stored);
    const escrowId = stored?.escrowId || stored?.id;
    if (!escrowId) return;
    fetchEscrow(escrowId)
      .then((latest) => {
        if (!latest) return;
        setActiveOrder((prev) => ({
          ...prev,
          ...latest,
          id: latest.escrowId || latest.id || prev?.id,
          escrowId: latest.escrowId || latest.id || prev?.escrowId,
          item: prev?.item || latest.item,
        }));
        upsertSellerOrder(latest);
      })
      .catch((err) => console.error("Unable to refresh escrow", err));
  }, [user, authReady]);

  useEffect(() => {
    if (!user) return;
    if (activeOrder) {
      localStorage.setItem(activeOrderStorageKey, JSON.stringify(activeOrder));
      return;
    }
    localStorage.removeItem(activeOrderStorageKey);
  }, [activeOrder, activeOrderStorageKey, user]);

  useEffect(() => {
    try {
      localStorage.setItem("seller_alerts", JSON.stringify(sellerAlerts));
    } catch {}
  }, [sellerAlerts]);

  useEffect(() => {
    try {
      localStorage.setItem("seller_orders", JSON.stringify(sellerOrders));
    } catch {}
  }, [sellerOrders]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("seller_alerts_channel");
    setAlertChannel(channel);
    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === "add-alert" && payload)
        setSellerAlerts((prev) => [payload, ...prev]);
      if (type === "update-alerts" && Array.isArray(payload))
        setSellerAlerts(payload);
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkUpdates = async () => {
      try {
        const summary = await getUnreadSummary();
        setHasTradeUpdates(summary?.hasAnyUnread || false);
      } catch (err) {
        // silent fail — indicator is non-critical
      }
    };

    checkUpdates();
    const interval = setInterval(checkUpdates, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (location.pathname.startsWith("/trades")) {
      setHasTradeUpdates(false);
    }
  }, [location.pathname]);

  const syncAlerts = (updater) => {
    setSellerAlerts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      alertChannel?.postMessage?.({ type: "update-alerts", payload: next });
      return next;
    });
  };

  const logSellerAlert = (draft, escrowOrder = null) => {
    const sellerId =
      draft?.item?.owner?.id ||
      draft?.item?.ownerId ||
      draft?.item?.owner_id ||
      draft?.item?.ownerEmail ||
      draft?.item?.owner_email;
    if (!sellerId) return;
    const alert = {
      id: `${draft.item.id || draft.item._id || Date.now()}-${Date.now()}`,
      sellerId,
      itemTitle: draft.item.title,
      buyerName: user?.username || user?.fullName || user?.email || "Buyer",
      deliveryMethod: draft.deliveryMethod,
      createdAt: new Date().toISOString(),
      status: "initiated",
      lockedKarma: escrowOrder?.lockedKarma || 0,
      escrowId: escrowOrder?.escrowId || escrowOrder?.id,
    };
    setSellerAlerts((prev) => [alert, ...prev]);
    if (escrowOrder) upsertSellerOrder(escrowOrder);
    alertChannel?.postMessage?.({ type: "add-alert", payload: alert });
  };

  const openItemDetail = (item) => {
    setSelectedItem(item);
    setCheckoutState(null);
    navigate("/item-detail");
  };

  const openCheckout = (draft) => {
    setCheckoutState(draft);
    navigate("/checkout");
  };

  const openOrderFromAlert = (alertId) => {
    const order = sellerOrders.find(
      (o) => o.escrowId === alertId || o.id === alertId,
    );
    if (order) {
      setActiveOrder(order);
      navigate("/order-tracking");
    } else alert("Could not load order details. Please try again.");
  };

  function upsertSellerOrder(orderPatch) {
    if (!orderPatch) return;
    const patchId = orderPatch.escrowId || orderPatch.id;
    if (!patchId) return;
    setSellerOrders((prev) => {
      const existingIndex = prev.findIndex(
        (order) => String(order.escrowId || order.id) === String(patchId),
      );
      if (existingIndex === -1) return [orderPatch, ...prev];
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...orderPatch };
      return next;
    });
  }

  async function dispatchOrderByEscrowId(
    escrowId,
    trackingNumber,
    preShipmentPhoto,
  ) {
    if (!escrowId) return null;
    const updated = await dispatchEscrow(escrowId, {
      trackingNumber,
      preShipmentPhoto,
    });
    const shippingPatch = {
      ...(updated || {}),
      status: updated?.status || "In_Transit",
      trackingNumber:
        updated?.trackingNumber || trackingNumber || "Tracking pending",
      shippedAt: updated?.shippedAt || new Date().toISOString(),
      preShipmentPhoto: updated?.preShipmentPhoto || preShipmentPhoto || "",
      escrowReleaseAt:
        updated?.escrowReleaseAt ||
        new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
    upsertSellerOrder({ escrowId, id: escrowId, ...shippingPatch });
    setActiveOrder((prev) => {
      if (!prev) return prev;
      if (String(prev.escrowId || prev.id) !== String(escrowId)) return prev;
      return { ...prev, ...shippingPatch };
    });
    return shippingPatch;
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return <Auth />;

  const currentPath = location.pathname;

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <h1 onClick={() => navigate("/marketplace")}>
              <img
                src="/karmaswap-logo.png"
                alt="Karmaswap logo"
                className="nav-logo"
              />
              Karmaswap
            </h1>
          </div>

          <div className="nav-menu">
            <button
              className={currentPath === "/marketplace" ? "active" : ""}
              onClick={() => navigate("/marketplace")}
            >
              <ShoppingBag size={16} /> Marketplace
            </button>
            <button
              className={currentPath === "/social" ? "active" : ""}
              onClick={() => navigate("/social")}
            >
              <Users size={16} /> Social
            </button>
            <button
              className={currentPath === "/trades" ? "active" : ""}
              onClick={() => navigate("/trades")}
            >
              <span className="nav-btn-indicator-wrap">
                <Package size={16} />
                {hasTradeUpdates && <span className="nav-red-dot" />}
              </span>
              My Trades
            </button>
          </div>

          <div className="nav-actions">
            <button
              className={`btn-primary nav-list-btn ${currentPath === "/list-item" ? "active" : ""}`}
              onClick={() => navigate("/list-item")}
            >
              <Plus size={14} /> List Item
            </button>
            <span className="nav-karma">
              ✨ {profile?.karmaBalance ?? profile?.karma_balance ?? 0}
            </span>
            <NotificationBell />
            <button
              className={`nav-avatar ${currentPath === "/profile" ? "active" : ""}`}
              onClick={() => navigate("/profile")}
              title={profile?.username || user?.email || "Profile"}
            >
              {(profile?.username || profile?.email || user?.email || "U")
                .charAt(0)
                .toUpperCase()}
            </button>
            <button className="btn-secondary nav-logout-btn" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mobile-header">
        <div className="mobile-header-brand">
          <img src="/karmaswap-logo.png" alt="Karmaswap" className="nav-logo" />
          <span>Karmaswap</span>
        </div>
        <div className="mobile-header-actions">
          <span className="mobile-karma-balance">
            ✨ {profile?.karmaBalance ?? profile?.karma_balance ?? 0}
          </span>
          <NotificationBell />
        </div>
      </div>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/marketplace" replace />} />
          <Route
            path="/marketplace"
            element={
              <Marketplace
                onItemClick={openItemDetail}
                refreshKey={marketplaceRefreshKey}
              />
            }
          />
          <Route
            path="/item-detail"
            element={
              selectedItem ? (
                <ItemDetail
                  item={selectedItem}
                  onBack={() => navigate("/marketplace")}
                  onStartCheckout={openCheckout}
                />
              ) : (
                <Navigate to="/marketplace" replace />
              )
            }
          />
          <Route
            path="/checkout"
            element={
              checkoutState?.item ? (
                <CheckoutEscrowConfirmation
                  item={checkoutState.item}
                  deliveryMethod={checkoutState.deliveryMethod}
                  onBack={() => navigate("/item-detail")}
                  onConfirmed={(order) => {
                    setActiveOrder(order);
                    logSellerAlert(checkoutState, order);
                    upsertSellerOrder(order);
                    setMarketplaceRefreshKey((v) => v + 1);
                    navigate("/order-tracking");
                  }}
                />
              ) : (
                <Navigate to="/marketplace" replace />
              )
            }
          />
          <Route
            path="/order-tracking"
            element={
              activeOrder ? (
                <Navigate
                  to={`/trades/${activeOrder.escrowId || activeOrder.id}`}
                  replace
                />
              ) : (
                <Navigate to="/marketplace" replace />
              )
            }
          />
          <Route
            path="/transaction-complete"
            element={
              activeOrder ? (
                <TransactionComplete
                  order={activeOrder}
                  onBack={() => navigate("/marketplace")}
                  onRate={(rating) =>
                    setActiveOrder((prev) =>
                      prev ? { ...prev, sellerRating: rating } : prev,
                    )
                  }
                />
              ) : (
                <Navigate to="/marketplace" replace />
              )
            }
          />
          <Route path="/dispute/:escrowId" element={<DisputeResolution />} />
          <Route
            path="/social"
            element={<Social onItemClick={openItemDetail} />}
          />
          <Route path="/trades" element={<MyTrades />} />
          <Route path="/trades/:escrowId" element={<TradeDetail />} />
          <Route
            path="/profile"
            element={
              <Profile
                activeOrder={activeOrder}
                onOpenOrderTracking={() => {
                  if (activeOrder)
                    navigate(
                      `/trades/${activeOrder.escrowId || activeOrder.id}`,
                    );
                }}
              />
            }
          />
          <Route
            path="/list-item"
            element={
              <ListItem
                onBack={() => navigate("/marketplace")}
                onSuccess={() => {
                  setMarketplaceRefreshKey((v) => v + 1);
                  navigate("/marketplace");
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/marketplace" replace />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile/:username" element={<PublicProfile />} />
        </Routes>
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="bottom-tab-bar">
        <button
          className={`tab-btn ${currentPath === "/marketplace" ? "active" : ""}`}
          onClick={() => navigate("/marketplace")}
        >
          <ShoppingBag size={20} />
          <span>Market</span>
        </button>
        <button
          className={`tab-btn ${currentPath === "/social" ? "active" : ""}`}
          onClick={() => navigate("/social")}
        >
          <Users size={20} />
          <span>Social</span>
        </button>
        <button
          className={`tab-btn tab-btn-center ${currentPath === "/list-item" ? "active" : ""}`}
          onClick={() => navigate("/list-item")}
        >
          <Plus size={24} />
          <span>List</span>
        </button>
        <button
          className={`tab-btn ${currentPath.startsWith("/trades") ? "active" : ""}`}
          onClick={() => navigate("/trades")}
        >
          <span className="nav-btn-indicator-wrap">
            <Package size={20} />
            {hasTradeUpdates && <span className="nav-red-dot" />}
          </span>
          <span>Trades</span>
        </button>
        <button
          className={`tab-btn ${currentPath === "/profile" ? "active" : ""}`}
          onClick={() => navigate("/profile")}
        >
          <span className="tab-avatar">
            {(profile?.username || user?.email || "U").charAt(0).toUpperCase()}
          </span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/admin/bootstrap" element={<AdminBootstrap />} />
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}

"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const MAX_QTY_PER_ADD = 10;
const MAX_CART_LINES = 15;

const colors = {
  bg: "#120C22",
  surface: "#1E1638",
  surfaceAlt: "#241C42",
  border: "#382C5C",
  gold: "#E3B23C",
  goldSoft: "#F0D48A",
  text: "#F3EFFF",
  textDim: "#A79CC9",
  danger: "#E2483D",
  dangerBg: "#3A1620",
  dangerBorder: "#7A2B2B",
  success: "#3FBF7F",
};

function formatBaht(n) {
  return Number(n || 0).toLocaleString("th-TH");
}

export default function OrderPage({ params }) {
  // โปรเจกต์นี้ใช้ Next.js เวอร์ชันที่ params เป็น Promise เสมอ ต้อง unwrap ด้วย use()
  const { roomNumber } = use(params);

  // phase: "checking" | "closed" | "ordering" | "thanks"
  const [phase, setPhase] = useState("checking");
  const [session, setSession] = useState(null);

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  const [qtyDraft, setQtyDraft] = useState({}); // itemId -> 1..10
  const [cart, setCart] = useState([]); // { id, name, price, quantity }
  const [cartOpen, setCartOpen] = useState(false);
  const [cartError, setCartError] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const [billOpen, setBillOpen] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [billTotal, setBillTotal] = useState(0);
  const [billConfirming, setBillConfirming] = useState(false);
  const [billError, setBillError] = useState("");
  const [thanksTotal, setThanksTotal] = useState(0);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber]);

  async function checkSession() {
    setPhase("checking");
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, room_number, status, created_at")
        .eq("room_number", roomNumber)
        .eq("status", "open")
        .maybeSingle();

      if (error || !data) {
        setPhase("closed");
        return;
      }

      setSession(data);
      await loadMenu();
      setPhase("ordering");
    } catch (err) {
      console.error(err);
      setPhase("closed");
    }
  }

  async function loadMenu() {
    const [{ data: cats, error: catsError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name, sort_order")
          .order("sort_order", { ascending: true }),
        supabase.from("menu_items").select("id, category_id, name, price"),
      ]);

    if (catsError) console.error(catsError);
    if (itemsError) console.error(itemsError);

    const safeCats = cats || [];
    setCategories(safeCats);
    setMenuItems(items || []);
    if (safeCats.length > 0) setActiveCategory(safeCats[0].id);
  }

  const itemsInActiveCategory = useMemo(
    () => menuItems.filter((it) => it.category_id === activeCategory),
    [menuItems, activeCategory]
  );

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.price, 0);

  function getDraftQty(itemId) {
    return qtyDraft[itemId] || 1;
  }

  function bumpDraftQty(itemId, delta) {
    setQtyDraft((prev) => {
      const current = prev[itemId] || 1;
      const next = Math.min(MAX_QTY_PER_ADD, Math.max(1, current + delta));
      return { ...prev, [itemId]: next };
    });
  }

  function handleAddToCart(item) {
    const draftQty = getDraftQty(item.id);
    setCartError("");

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        const nextQty = Math.min(MAX_QTY_PER_ADD, existing.quantity + draftQty);
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: nextQty } : c
        );
      }
      if (prev.length >= MAX_CART_LINES) {
        setCartError(`ตะกร้าเต็มแล้ว (สูงสุด ${MAX_CART_LINES} รายการต่อการส่งออเดอร์)`);
        return prev;
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: Math.min(MAX_QTY_PER_ADD, draftQty),
        },
      ];
    });

    // reset ตัวเลือกจำนวนของเมนูนี้กลับเป็น 1 หลังเพิ่มลงตะกร้าแล้ว
    setQtyDraft((prev) => ({ ...prev, [item.id]: 1 }));
  }

  function adjustCartLine(itemId, delta) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === itemId
            ? { ...c, quantity: Math.min(MAX_QTY_PER_ADD, Math.max(1, c.quantity + delta)) }
            : c
        )
    );
  }

  function removeCartLine(itemId) {
    setCart((prev) => prev.filter((c) => c.id !== itemId));
  }

  async function handleSubmitOrder() {
    if (cart.length === 0 || !session) return;
    setSending(true);
    setCartError("");
    try {
      const orderItems = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price,
      }));

      const { error } = await supabase.from("orders").insert({
        session_id: session.id,
        room_number: roomNumber,
        items: orderItems,
        status: "received",
      });

      if (error) throw error;

      setCart([]);
      setCartOpen(false);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
    } catch (err) {
      console.error(err);
      setCartError("ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  async function handleOpenBill() {
    if (!session) return;
    setBillOpen(true);
    setBillLoading(true);
    setBillError("");
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("items")
        .eq("session_id", session.id);

      if (error) throw error;

      const map = new Map();
      let total = 0;
      (orders || []).forEach((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((it) => {
          const qty = Number(it.quantity) || 0;
          const price = Number(it.price) || 0;
          total += qty * price;
          const key = `${it.name}__${price}`;
          if (map.has(key)) {
            map.get(key).quantity += qty;
          } else {
            map.set(key, { name: it.name, price, quantity: qty });
          }
        });
      });

      setBillItems(Array.from(map.values()));
      setBillTotal(total);
    } catch (err) {
      console.error(err);
      setBillError("ดึงยอดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBillLoading(false);
    }
  }

  async function handleConfirmBill() {
    if (!session) return;
    setBillConfirming(true);
    setBillError("");
    try {
      const { data, error } = await supabase
        .from("sessions")
        .update({ status: "closed" })
        .eq("id", session.id)
        .eq("status", "open")
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        setBillError("ห้องนี้ถูกปิดไปแล้ว");
        return;
      }

      setThanksTotal(billTotal);
      setBillOpen(false);
      setPhase("thanks");
    } catch (err) {
      console.error(err);
      setBillError("ปิดบิลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBillConfirming(false);
    }
  }

  return (
    <main style={styles.main}>
      <style>{globalCss}</style>

      {phase === "checking" && (
        <div style={styles.centerScreen}>
          <p style={styles.centerText}>กำลังตรวจสอบห้อง...</p>
        </div>
      )}

      {phase === "closed" && (
        <div style={styles.centerScreen}>
          <span style={styles.centerIcon}>🔒</span>
          <p style={styles.centerTitle}>ห้องนี้ยังไม่เปิดใช้งาน</p>
          <p style={styles.centerText}>กรุณาแจ้งพนักงาน</p>
        </div>
      )}

      {phase === "thanks" && (
        <div style={styles.centerScreen}>
          <span style={styles.centerIcon}>🎤</span>
          <p style={styles.centerTitle}>ขอบคุณที่ใช้บริการ</p>
          <p style={styles.thanksAmount}>{formatBaht(thanksTotal)} บาท</p>
        </div>
      )}

      {phase === "ordering" && (
        <>
          {/* top bar */}
          <div style={styles.topBar}>
            <div>
              <p style={styles.topBarEyebrow}>ไมค์ทอง คาราโอเกะ</p>
              <p style={styles.topBarRoom}>ห้อง {roomNumber}</p>
            </div>
            <button
              type="button"
              style={styles.billButton}
              onClick={handleOpenBill}
            >
              เรียกเก็บเงิน
            </button>
          </div>

          {/* category tabs */}
          <div style={styles.tabsRow}>
            {categories.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    ...styles.tabButton,
                    ...(isActive ? styles.tabButtonActive : {}),
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* menu list */}
          <div style={styles.menuList}>
            {itemsInActiveCategory.length === 0 && (
              <p style={styles.emptyText}>ไม่มีเมนูในหมวดนี้</p>
            )}
            {itemsInActiveCategory.map((item) => (
              <div key={item.id} style={styles.menuCard}>
                <div style={styles.menuCardInfo}>
                  <p style={styles.menuName}>{item.name}</p>
                  <p style={styles.menuPrice}>{formatBaht(item.price)} บาท</p>
                </div>

                <div style={styles.menuCardActions}>
                  <div style={styles.stepper}>
                    <button
                      type="button"
                      style={styles.stepperBtn}
                      onClick={() => bumpDraftQty(item.id, -1)}
                      aria-label="ลดจำนวน"
                    >
                      −
                    </button>
                    <span style={styles.stepperVal}>{getDraftQty(item.id)}</span>
                    <button
                      type="button"
                      style={styles.stepperBtn}
                      onClick={() => bumpDraftQty(item.id, 1)}
                      aria-label="เพิ่มจำนวน"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    style={styles.addBtn}
                    onClick={() => handleAddToCart(item)}
                  >
                    เพิ่มลงตะกร้า
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ส่งออเดอร์แล้ว toast */}
          {justSent && (
            <div style={styles.toast} className="fade-in">
              ✓ ส่งออเดอร์แล้ว
            </div>
          )}

          {/* floating cart bar */}
          {cartCount > 0 && !cartOpen && (
            <button
              type="button"
              style={styles.floatingCartBar}
              onClick={() => setCartOpen(true)}
            >
              <span>🛒 {cartCount} รายการ</span>
              <span>{formatBaht(cartTotal)} บาท</span>
            </button>
          )}

          {/* cart drawer */}
          {cartOpen && (
            <div style={styles.overlay} onClick={() => setCartOpen(false)}>
              <div
                style={styles.cartDrawer}
                className="slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.cartDrawerHeader}>
                  <p style={styles.cartDrawerTitle}>ตะกร้าของคุณ</p>
                  <button
                    type="button"
                    style={styles.closeBtn}
                    onClick={() => setCartOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.cartLines}>
                  {cart.map((line) => (
                    <div key={line.id} style={styles.cartLine}>
                      <div style={styles.cartLineInfo}>
                        <p style={styles.cartLineName}>{line.name}</p>
                        <p style={styles.cartLinePrice}>
                          {formatBaht(line.price)} บาท/หน่วย
                        </p>
                      </div>
                      <div style={styles.stepper}>
                        <button
                          type="button"
                          style={styles.stepperBtn}
                          onClick={() => adjustCartLine(line.id, -1)}
                        >
                          −
                        </button>
                        <span style={styles.stepperVal}>{line.quantity}</span>
                        <button
                          type="button"
                          style={styles.stepperBtn}
                          onClick={() => adjustCartLine(line.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        style={styles.removeBtn}
                        onClick={() => removeCartLine(line.id)}
                        aria-label={`ลบ ${line.name}`}
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>

                {cartError && <p style={styles.errorText}>{cartError}</p>}

                <div style={styles.cartDrawerFooter}>
                  <div style={styles.cartTotalRow}>
                    <span style={styles.cartTotalLabel}>ยอดรวม</span>
                    <span style={styles.cartTotalValue}>
                      {formatBaht(cartTotal)} บาท
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{
                      ...styles.primaryButton,
                      opacity: sending || cart.length === 0 ? 0.6 : 1,
                    }}
                    onClick={handleSubmitOrder}
                    disabled={sending || cart.length === 0}
                  >
                    {sending ? "กำลังส่ง..." : "ส่งออเดอร์"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* bill modal */}
          {billOpen && (
            <div style={styles.overlay} onClick={() => !billConfirming && setBillOpen(false)}>
              <div
                style={styles.billBox}
                className="fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <p style={styles.billTitle}>สรุปยอดห้อง {roomNumber}</p>

                {billLoading && <p style={styles.centerText}>กำลังคำนวณยอด...</p>}

                {!billLoading && billItems.length === 0 && (
                  <p style={styles.centerText}>ยังไม่มีออเดอร์ในห้องนี้</p>
                )}

                {!billLoading && billItems.length > 0 && (
                  <div style={styles.billLines}>
                    {billItems.map((it, idx) => (
                      <div key={idx} style={styles.billLine}>
                        <span style={styles.billLineName}>
                          {it.name} × {it.quantity}
                        </span>
                        <span style={styles.billLineValue}>
                          {formatBaht(it.price * it.quantity)} บาท
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.billTotalRow}>
                  <span style={styles.cartTotalLabel}>ยอดรวมทั้งหมด</span>
                  <span style={styles.billTotalValue}>
                    {formatBaht(billTotal)} บาท
                  </span>
                </div>

                {billError && <p style={styles.errorText}>{billError}</p>}

                <div style={styles.confirmActions}>
                  <button
                    type="button"
                    style={styles.ghostButton}
                    onClick={() => setBillOpen(false)}
                    disabled={billConfirming}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.dangerButton,
                      opacity: billConfirming || billLoading ? 0.7 : 1,
                    }}
                    onClick={handleConfirmBill}
                    disabled={billConfirming || billLoading}
                  >
                    {billConfirming ? "กำลังปิดบิล..." : "ยืนยันปิดบิล"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const globalCss = `
  .fade-in { animation: fadeIn 0.18s ease-out; }
  .slide-up { animation: slideUp 0.2s ease-out; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .fade-in, .slide-up { animation: none; }
  }
  button:focus-visible {
    outline: 3px solid #E3B23C;
    outline-offset: 2px;
  }
  ::-webkit-scrollbar { height: 0; width: 0; }
`;

const styles = {
  main: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    fontFamily:
      "'Segoe UI', 'Noto Sans Thai', 'Sarabun', system-ui, sans-serif",
    paddingBottom: "6rem",
  },
  centerScreen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "2rem",
    gap: "0.5rem",
  },
  centerIcon: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  centerTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    margin: 0,
  },
  centerText: {
    fontSize: "1.05rem",
    color: colors.textDim,
    margin: 0,
  },
  thanksAmount: {
    fontSize: "2.25rem",
    fontWeight: 800,
    color: colors.gold,
    margin: "0.5rem 0 0 0",
  },
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    background: colors.bg,
    borderBottom: `1px solid ${colors.border}`,
  },
  topBarEyebrow: {
    margin: 0,
    fontSize: "0.8rem",
    color: colors.gold,
    fontWeight: 600,
  },
  topBarRoom: {
    margin: "0.15rem 0 0 0",
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  billButton: {
    padding: "0.65rem 1rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    borderRadius: "10px",
    border: `2px solid ${colors.gold}`,
    background: "transparent",
    color: colors.gold,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabsRow: {
    display: "flex",
    gap: "0.5rem",
    overflowX: "auto",
    padding: "1rem 1.25rem 0.25rem 1.25rem",
  },
  tabButton: {
    flexShrink: 0,
    padding: "0.6rem 1.1rem",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: "999px",
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.textDim,
    cursor: "pointer",
  },
  tabButtonActive: {
    background: colors.gold,
    borderColor: colors.gold,
    color: "#241A0A",
  },
  menuList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
  },
  emptyText: {
    color: colors.textDim,
    textAlign: "center",
    padding: "2rem 0",
  },
  menuCard: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "14px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  menuCardInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  menuName: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
  },
  menuPrice: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: colors.gold,
    whiteSpace: "nowrap",
  },
  menuCardActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: colors.surfaceAlt,
    borderRadius: "10px",
    padding: "0.25rem 0.5rem",
  },
  stepperBtn: {
    width: "2.2rem",
    height: "2.2rem",
    fontSize: "1.3rem",
    fontWeight: 700,
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: colors.text,
    cursor: "pointer",
  },
  stepperVal: {
    minWidth: "1.5rem",
    textAlign: "center",
    fontSize: "1.05rem",
    fontWeight: 700,
  },
  addBtn: {
    flex: 1,
    padding: "0.75rem",
    fontSize: "1rem",
    fontWeight: 700,
    borderRadius: "10px",
    border: "none",
    background: colors.gold,
    color: "#241A0A",
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    top: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
    background: colors.success,
    color: "#0A2A18",
    fontWeight: 700,
    padding: "0.75rem 1.25rem",
    borderRadius: "999px",
    zIndex: 40,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  },
  floatingCartBar: {
    position: "fixed",
    left: "1rem",
    right: "1rem",
    bottom: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    borderRadius: "14px",
    border: "none",
    background: colors.gold,
    color: "#241A0A",
    fontSize: "1.05rem",
    fontWeight: 700,
    cursor: "pointer",
    zIndex: 30,
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(6, 4, 14, 0.7)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 50,
  },
  cartDrawer: {
    width: "100%",
    maxWidth: "520px",
    maxHeight: "80vh",
    background: colors.surface,
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    border: `1px solid ${colors.border}`,
    borderBottom: "none",
    padding: "1.25rem",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cartDrawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartDrawerTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
  },
  closeBtn: {
    width: "2.25rem",
    height: "2.25rem",
    borderRadius: "999px",
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: colors.text,
    fontSize: "1rem",
    cursor: "pointer",
  },
  cartLines: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    overflowY: "auto",
    maxHeight: "40vh",
  },
  cartLine: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: colors.surfaceAlt,
    borderRadius: "12px",
    padding: "0.75rem",
  },
  cartLineInfo: {
    flex: 1,
    minWidth: 0,
  },
  cartLineName: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cartLinePrice: {
    margin: "0.15rem 0 0 0",
    fontSize: "0.85rem",
    color: colors.textDim,
  },
  removeBtn: {
    flexShrink: 0,
    padding: "0.5rem 0.75rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: "8px",
    border: `1px solid ${colors.dangerBorder}`,
    background: "transparent",
    color: colors.danger,
    cursor: "pointer",
  },
  cartDrawerFooter: {
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cartTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cartTotalLabel: {
    fontSize: "1rem",
    color: colors.textDim,
  },
  cartTotalValue: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: colors.gold,
  },
  primaryButton: {
    width: "100%",
    padding: "1rem",
    fontSize: "1.15rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: "none",
    background: colors.gold,
    color: "#241A0A",
    cursor: "pointer",
  },
  errorText: {
    color: colors.danger,
    fontSize: "0.9rem",
    margin: 0,
  },
  billBox: {
    width: "100%",
    maxWidth: "480px",
    maxHeight: "85vh",
    overflowY: "auto",
    background: colors.surface,
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    border: `2px solid ${colors.dangerBorder}`,
    borderBottom: "none",
    padding: "1.5rem",
    boxSizing: "border-box",
  },
  billTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  billLines: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "0.75rem",
  },
  billLine: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.95rem",
    padding: "0.4rem 0",
    borderBottom: `1px solid ${colors.border}`,
  },
  billLineName: {
    color: colors.textDim,
  },
  billLineValue: {
    fontWeight: 600,
  },
  billTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "0.75rem 0",
    borderTop: `1px solid ${colors.border}`,
    marginTop: "0.25rem",
  },
  billTotalValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
    color: colors.danger,
  },
  confirmActions: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1rem",
  },
  ghostButton: {
    flex: 1,
    padding: "0.85rem",
    fontSize: "1.05rem",
    fontWeight: 600,
    borderRadius: "12px",
    border: `2px solid ${colors.border}`,
    background: "transparent",
    color: colors.text,
    cursor: "pointer",
  },
  dangerButton: {
    flex: 1,
    padding: "0.85rem",
    fontSize: "1.05rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: "none",
    background: colors.danger,
    color: "#FFF",
    cursor: "pointer",
  },
};

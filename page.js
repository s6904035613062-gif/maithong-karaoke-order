"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// สี/โทนของหน้านี้ — คอนเซปต์ "ไมค์ทอง" (ไมโครโฟนสีทองบนเวทีคาราโอเกะ)
const colors = {
  bg: "#1A1330",
  bgGradientEnd: "#241A42",
  surface: "#2A2049",
  surfaceBorder: "#40325F",
  gold: "#E3B23C",
  goldDim: "#B88F2E",
  text: "#F3EFFF",
  textDim: "#B8AFD6",
  danger: "#E2483D",
  dangerBg: "#3A1620",
  dangerBorder: "#7A2B2B",
};

function computeSessionTotal(orders) {
  if (!orders || orders.length === 0) return 0;
  let total = 0;
  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      total += qty * price;
    }
  }
  return total;
}

function minutesSince(dateString) {
  const created = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - created);
  return Math.floor(diffMs / 60000);
}

export default function GenerateQrPage() {
  // view: "form" | "confirming" | "result"
  const [view, setView] = useState("form");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ข้อมูล session เก่าที่ค้างอยู่ (แสดงในกล่องเตือน + กล่องยืนยัน)
  const [existingSession, setExistingSession] = useState(null); // { id, room_number, created_at }
  const [existingTotal, setExistingTotal] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  // ผลลัพธ์ QR เมื่อเปิดห้องสำเร็จ
  const [qrRoom, setQrRoom] = useState("");
  const [copied, setCopied] = useState(false);

  function resetToForm(keepRoom) {
    setView("form");
    setExistingSession(null);
    setExistingTotal(0);
    setShowConfirm(false);
    setError("");
    if (!keepRoom) {
      setRoom("");
    }
  }

  async function handleOpenRoom(e) {
    e.preventDefault();
    setError("");

    const roomNumber = room.trim();
    if (!roomNumber || !/^\d+$/.test(roomNumber)) {
      setError("กรุณากรอกเลขห้องเป็นตัวเลข");
      return;
    }

    setLoading(true);
    try {
      // 1. เช็คว่ามี session ที่ยังเปิดอยู่สำหรับห้องนี้หรือไม่
      const { data: openSession, error: findError } = await supabase
        .from("sessions")
        .select("id, room_number, status, created_at")
        .eq("room_number", roomNumber)
        .eq("status", "open")
        .maybeSingle();

      if (findError) throw findError;

      if (openSession) {
        // 2. มี session ค้างอยู่ -> ดึงออเดอร์ทั้งหมดมาคำนวณยอดรวม
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("items")
          .eq("session_id", openSession.id);

        if (ordersError) throw ordersError;

        setExistingSession(openSession);
        setExistingTotal(computeSessionTotal(orders));
        setView("warning");
      } else {
        // ไม่มี session ค้าง -> สร้างใหม่
        const { error: insertError } = await supabase
          .from("sessions")
          .insert({ room_number: roomNumber, status: "open" });

        if (insertError) throw insertError;

        setQrRoom(roomNumber);
        setCopied(false);
        setView("result");
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาด ไม่สามารถเปิดห้องได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmClose() {
    if (!existingSession) return;
    setClosing(true);
    setError("");
    try {
      // เช็คซ้ำว่า status ยังเป็น open ตอน update เพื่อกันกดซ้ำซ้อน
      const { data, error: updateError } = await supabase
        .from("sessions")
        .update({ status: "closed" })
        .eq("id", existingSession.id)
        .eq("status", "open")
        .select();

      if (updateError) throw updateError;

      if (!data || data.length === 0) {
        // มีคนอื่นปิดไปแล้วระหว่างนี้
        setError("ห้องนี้ถูกปิดออเดอร์ไปแล้ว กรุณาลองกด \"เปิดห้อง\" อีกครั้ง");
        setShowConfirm(false);
        resetToForm(true);
        return;
      }

      // ปิดสำเร็จ -> กลับไปฟอร์มเดิม (เลขห้องยังอยู่)
      setShowConfirm(false);
      resetToForm(true);
    } catch (err) {
      console.error(err);
      setError("ปิดออเดอร์เดิมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setClosing(false);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/order/${qrRoom}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
      });
  }

  const orderUrl =
    view === "result" && typeof window !== "undefined"
      ? `${window.location.origin}/order/${qrRoom}`
      : "";
  const qrImageSrc = orderUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        orderUrl
      )}`
    : "";

  return (
    <main style={styles.main}>
      <style>{globalCss}</style>

      <div style={styles.wrap}>
        <div style={styles.brand}>
          <span style={styles.brandMic}>🎤</span>
          <span style={styles.brandName}>ไมค์ทอง คาราโอเกะ</span>
        </div>
        <h1 style={styles.title}>เปิดห้องให้ลูกค้า</h1>

        {/* ฟอร์มปกติ + กล่องเตือน (แสดงแทนกัน) */}
        {view !== "result" && (
          <div style={styles.card}>
            <form onSubmit={handleOpenRoom}>
              <label style={styles.label} htmlFor="room-input">
                เลขห้อง
              </label>
              <input
                id="room-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="เช่น 3"
                style={styles.input}
                disabled={loading || view === "warning"}
                autoFocus
              />

              {error && <p style={styles.errorText}>{error}</p>}

              {view === "form" && (
                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    opacity: loading ? 0.7 : 1,
                  }}
                  disabled={loading}
                >
                  {loading ? "กำลังตรวจสอบ..." : "เปิดห้อง"}
                </button>
              )}
            </form>

            {/* กล่องเตือน: ห้องนี้มี session เปิดค้างอยู่ */}
            {view === "warning" && existingSession && (
              <div style={styles.warningBox} className="fade-in">
                <p style={styles.warningText}>
                  ห้องนี้มีลูกค้าอยู่ระหว่างใช้บริการ
                  กรุณาปิดออเดอร์เดิมก่อน
                </p>
                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => setShowConfirm(true)}
                >
                  ปิดออเดอร์เดิม
                </button>
              </div>
            )}
          </div>
        )}

        {/* ผลลัพธ์ QR */}
        {view === "result" && (
          <div style={styles.card} className="fade-in">
            <p style={styles.resultLabel}>เปิดห้องสำเร็จ</p>
            <div style={styles.qrBox}>
              {qrImageSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageSrc}
                  alt={`QR Code สำหรับห้อง ${qrRoom}`}
                  width={220}
                  height={220}
                  style={styles.qrImage}
                />
              )}
            </div>

            <p style={styles.roomLabel}>ห้อง {qrRoom}</p>

            <div style={styles.linkRow}>
              <span style={styles.linkText}>{orderUrl}</span>
              <button
                type="button"
                style={styles.copyButton}
                onClick={handleCopyLink}
              >
                {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
              </button>
            </div>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => resetToForm(false)}
            >
              เปิดห้องใหม่
            </button>
          </div>
        )}
      </div>

      {/* กล่องยืนยันปิดห้องเดิม */}
      {showConfirm && existingSession && (
        <div style={styles.overlay}>
          <div style={styles.confirmBox} className="fade-in">
            <p style={styles.confirmTitle}>ยืนยันปิดออเดอร์เดิม</p>

            <div style={styles.confirmRow}>
              <span style={styles.confirmKey}>ห้อง</span>
              <span style={styles.confirmVal}>
                {existingSession.room_number}
              </span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmKey}>เปิดมาแล้ว</span>
              <span style={styles.confirmVal}>
                {minutesSince(existingSession.created_at)} นาที
              </span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmKey}>ยอดค้างจากออเดอร์เดิม</span>
              <span style={styles.confirmValStrong}>
                {existingTotal.toLocaleString("th-TH")} บาท
              </span>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.confirmActions}>
              <button
                type="button"
                style={styles.ghostButton}
                onClick={() => setShowConfirm(false)}
                disabled={closing}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                style={{
                  ...styles.dangerButton,
                  opacity: closing ? 0.7 : 1,
                }}
                onClick={handleConfirmClose}
                disabled={closing}
              >
                {closing ? "กำลังปิด..." : "ยืนยันปิดห้องเดิม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const globalCss = `
  .fade-in {
    animation: fadeIn 0.18s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .fade-in { animation: none; }
  }
  input:focus, button:focus-visible {
    outline: 3px solid #E3B23C;
    outline-offset: 2px;
  }
`;

const styles = {
  main: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgGradientEnd} 100%)`,
    fontFamily:
      "'Segoe UI', 'Noto Sans Thai', 'Sarabun', system-ui, sans-serif",
    color: colors.text,
  },
  wrap: {
    width: "100%",
    maxWidth: "440px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem",
  },
  brandMic: {
    fontSize: "1.5rem",
  },
  brandName: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: colors.gold,
    letterSpacing: "0.02em",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    margin: "0 0 1.5rem 0",
    textAlign: "center",
  },
  card: {
    width: "100%",
    background: colors.surface,
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: "16px",
    padding: "1.75rem",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    fontSize: "1.05rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    color: colors.textDim,
  },
  input: {
    width: "100%",
    fontSize: "2rem",
    fontWeight: 700,
    textAlign: "center",
    padding: "0.9rem 1rem",
    borderRadius: "12px",
    border: `2px solid ${colors.surfaceBorder}`,
    background: "#160F28",
    color: colors.text,
    boxSizing: "border-box",
    letterSpacing: "0.05em",
  },
  primaryButton: {
    width: "100%",
    marginTop: "1.25rem",
    padding: "1rem",
    fontSize: "1.25rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: "none",
    background: colors.gold,
    color: "#241A0A",
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    marginTop: "1.5rem",
    padding: "0.9rem",
    fontSize: "1.05rem",
    fontWeight: 600,
    borderRadius: "12px",
    border: `2px solid ${colors.gold}`,
    background: "transparent",
    color: colors.gold,
    cursor: "pointer",
  },
  ghostButton: {
    flex: 1,
    padding: "0.85rem",
    fontSize: "1.05rem",
    fontWeight: 600,
    borderRadius: "12px",
    border: `2px solid ${colors.surfaceBorder}`,
    background: "transparent",
    color: colors.text,
    cursor: "pointer",
  },
  dangerButton: {
    padding: "0.85rem 1.25rem",
    fontSize: "1.05rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: "none",
    background: colors.danger,
    color: "#FFF",
    cursor: "pointer",
    width: "100%",
  },
  errorText: {
    color: colors.danger,
    fontSize: "0.95rem",
    marginTop: "0.75rem",
    marginBottom: 0,
  },
  warningBox: {
    marginTop: "1.5rem",
    padding: "1.25rem",
    borderRadius: "12px",
    background: colors.dangerBg,
    border: `2px solid ${colors.dangerBorder}`,
  },
  warningText: {
    fontSize: "1.1rem",
    fontWeight: 600,
    lineHeight: 1.5,
    margin: "0 0 1rem 0",
    color: "#FFD9D4",
  },
  resultLabel: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: colors.gold,
    textAlign: "center",
    margin: "0 0 1rem 0",
  },
  qrBox: {
    display: "flex",
    justifyContent: "center",
    background: "#FFFFFF",
    borderRadius: "12px",
    padding: "1rem",
  },
  qrImage: {
    display: "block",
    width: "220px",
    height: "220px",
  },
  roomLabel: {
    fontSize: "1.5rem",
    fontWeight: 700,
    textAlign: "center",
    margin: "1.25rem 0 0.5rem 0",
  },
  linkRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#160F28",
    border: `1px solid ${colors.surfaceBorder}`,
    borderRadius: "10px",
    padding: "0.6rem 0.75rem",
  },
  linkText: {
    flex: 1,
    fontSize: "0.9rem",
    color: colors.textDim,
    wordBreak: "break-all",
  },
  copyButton: {
    flexShrink: 0,
    padding: "0.5rem 0.75rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: "8px",
    border: `1px solid ${colors.gold}`,
    background: "transparent",
    color: colors.gold,
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 6, 20, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 50,
  },
  confirmBox: {
    width: "100%",
    maxWidth: "380px",
    background: colors.surface,
    border: `2px solid ${colors.dangerBorder}`,
    borderRadius: "16px",
    padding: "1.75rem",
    boxSizing: "border-box",
  },
  confirmTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    margin: "0 0 1.25rem 0",
    color: "#FFD9D4",
  },
  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "0.5rem 0",
    borderBottom: `1px solid ${colors.surfaceBorder}`,
  },
  confirmKey: {
    fontSize: "0.95rem",
    color: colors.textDim,
  },
  confirmVal: {
    fontSize: "1.1rem",
    fontWeight: 600,
  },
  confirmValStrong: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: colors.danger,
  },
  confirmActions: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
};

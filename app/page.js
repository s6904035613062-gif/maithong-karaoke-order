"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// คำนวณยอดรวมของ session จากออเดอร์ทั้งหมด (quantity x price ต่อรายการ)
function calcSessionTotal(orders) {
  return orders.reduce((sum, order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const orderTotal = items.reduce(
      (s, item) => s + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
    return sum + orderTotal;
  }, 0);
}

function formatBaht(amount) {
  return amount.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export default function GenerateQrPage() {
  const [roomNumber, setRoomNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ข้อมูล session เก่าที่ยังเปิดอยู่ (แสดงกล่องเตือน)
  const [existingSession, setExistingSession] = useState(null); // { id, room_number, created_at, total }
  const [showConfirm, setShowConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  // ผลลัพธ์ QR หลังเปิดห้องสำเร็จ
  const [qrResult, setQrResult] = useState(null); // { roomNumber, url }
  const [copied, setCopied] = useState(false);

  function resetAll() {
    setRoomNumber("");
    setErrorMsg("");
    setExistingSession(null);
    setShowConfirm(false);
    setQrResult(null);
    setCopied(false);
  }

  async function handleOpenRoom(e) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = roomNumber.trim();
    if (!trimmed) {
      setErrorMsg("กรุณากรอกเลขห้อง");
      return;
    }

    setLoading(true);
    try {
      // 1) เช็คว่าห้องนี้มี session ที่ status = 'open' อยู่แล้วหรือไม่
      const { data: openSession, error: findError } = await supabase
        .from("sessions")
        .select("id, room_number, created_at")
        .eq("room_number", trimmed)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;

      if (openSession) {
        // มี session เปิดค้างอยู่ -> ดึงออเดอร์ทั้งหมดของ session นี้มาคิดยอดรวม
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("items")
          .eq("session_id", openSession.id);

        if (ordersError) throw ordersError;

        const total = calcSessionTotal(orders || []);

        setExistingSession({
          id: openSession.id,
          room_number: openSession.room_number,
          created_at: openSession.created_at,
          total,
        });
        setLoading(false);
        return;
      }

      // 2) ไม่มี session เปิดค้าง -> สร้างแถวใหม่
      const { error: insertError } = await supabase
        .from("sessions")
        .insert({ room_number: trimmed, status: "open" });

      if (insertError) throw insertError;

      const orderUrl = `${window.location.origin}/order/${trimmed}`;
      setQrResult({ roomNumber: trimmed, url: orderUrl });
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถเปิดห้องได้"));
    } finally {
      setLoading(false);
    }
  }

  function getMinutesElapsed(createdAt) {
    const start = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 60000));
  }

  async function handleConfirmClose() {
    if (!existingSession) return;
    setClosing(true);
    try {
      // update พร้อมเช็คซ้ำว่า status ยังเป็น 'open' อยู่ (กันกดซ้ำซ้อน/แข่งกันปิด)
      const { data, error } = await supabase
        .from("sessions")
        .update({ status: "closed" })
        .eq("id", existingSession.id)
        .eq("status", "open")
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        // ไม่มีแถวถูกอัปเดต แปลว่ามีคนปิดไปก่อนแล้ว
        setErrorMsg('ออเดอร์นี้ถูกปิดไปแล้วโดยคนอื่น กรุณาลองกด "เปิดห้อง" อีกครั้ง');
        setShowConfirm(false);
        setExistingSession(null);
        setClosing(false);
        return;
      }

      // ปิดสำเร็จ -> เอากล่องเตือน/ยืนยันออก กลับไปที่ฟอร์มเดิม (เลขห้องยังอยู่)
      setShowConfirm(false);
      setExistingSession(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถปิดห้องเดิมได้"));
    } finally {
      setClosing(false);
    }
  }

  async function handleCopyLink() {
    if (!qrResult) return;
    try {
      await navigator.clipboard.writeText(qrResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  const qrImageSrc = qrResult
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        qrResult.url
      )}`
    : null;

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>เปิดห้อง — ไมค์ทอง คาราโอเกะ</h1>

      {/* ผลลัพธ์ QR หลังเปิดห้องสำเร็จ */}
      {qrResult && (
        <div style={styles.qrBox}>
          <img
            src={qrImageSrc}
            alt={`QR Code สำหรับห้อง ${qrResult.roomNumber}`}
            width={300}
            height={300}
            style={styles.qrImage}
          />
          <p style={styles.qrRoomLabel}>ห้อง {qrResult.roomNumber}</p>
          <div style={styles.linkRow}>
            <span style={styles.linkText}>{qrResult.url}</span>
            <button type="button" onClick={handleCopyLink} style={styles.copyButton}>
              {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
            </button>
          </div>
          <button type="button" onClick={resetAll} style={styles.primaryButton}>
            เปิดห้องใหม่
          </button>
        </div>
      )}

      {/* กล่องเตือน: ห้องนี้มี session เปิดค้างอยู่แล้ว */}
      {!qrResult && existingSession && !showConfirm && (
        <div style={styles.warningBox}>
          <p style={styles.warningText}>
            ห้องนี้มีลูกค้าอยู่ระหว่างใช้บริการ กรุณาปิดออเดอร์เดิมก่อน
          </p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            style={styles.dangerButton}
          >
            ปิดออเดอร์เดิม
          </button>
        </div>
      )}

      {/* กล่องยืนยันปิดห้องเดิม */}
      {!qrResult && existingSession && showConfirm && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <p style={styles.confirmTitle}>ยืนยันปิดห้องเดิม</p>
            <p style={styles.confirmLine}>ห้อง {existingSession.room_number}</p>
            <p style={styles.confirmLine}>
              เปิดมาแล้ว {getMinutesElapsed(existingSession.created_at)} นาที
            </p>
            <p style={styles.confirmLine}>
              ยอดค้างจากออเดอร์เดิม {formatBaht(existingSession.total)} บาท
            </p>
            <div style={styles.confirmButtonRow}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={styles.secondaryButton}
                disabled={closing}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                style={styles.dangerButton}
                disabled={closing}
              >
                {closing ? "กำลังปิด..." : "ยืนยันปิดห้องเดิม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ฟอร์มกรอกเลขห้อง */}
      {!qrResult && !existingSession && (
        <form onSubmit={handleOpenRoom} style={styles.form}>
          <label style={styles.label} htmlFor="roomNumber">
            เลขห้อง
          </label>
          <input
            id="roomNumber"
            type="number"
            inputMode="numeric"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            style={styles.input}
            placeholder="เช่น 3"
            disabled={loading}
          />

          {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}

          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? "กำลังเปิดห้อง..." : "เปิดห้อง"}
          </button>
        </form>
      )}
    </main>
  );
}

const styles = {
  page: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "2rem 1.5rem",
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: "1.75rem",
    marginBottom: "1.5rem",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  label: {
    fontSize: "1.25rem",
    fontWeight: "bold",
  },
  input: {
    fontSize: "2rem",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: "2px solid #ccc",
    textAlign: "center",
  },
  errorText: {
    color: "#c0392b",
    fontSize: "1.1rem",
    fontWeight: "bold",
  },
  primaryButton: {
    fontSize: "1.5rem",
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#1e8e5a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  secondaryButton: {
    fontSize: "1.25rem",
    padding: "0.9rem 1.2rem",
    borderRadius: "0.5rem",
    border: "2px solid #999",
    background: "#fff",
    color: "#333",
    fontWeight: "bold",
    cursor: "pointer",
    flex: 1,
  },
  dangerButton: {
    fontSize: "1.25rem",
    padding: "0.9rem 1.2rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#d93025",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    flex: 1,
  },
  warningBox: {
    border: "3px solid #d93025",
    background: "#fdecea",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  warningText: {
    fontSize: "1.3rem",
    fontWeight: "bold",
    color: "#8a1c14",
    margin: 0,
  },
  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  confirmBox: {
    background: "#fff",
    borderRadius: "0.75rem",
    padding: "1.75rem",
    maxWidth: 400,
    width: "100%",
    border: "3px solid #d93025",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  confirmTitle: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#8a1c14",
    marginTop: 0,
    marginBottom: "1rem",
    textAlign: "center",
  },
  confirmLine: {
    fontSize: "1.2rem",
    margin: "0.4rem 0",
    textAlign: "center",
  },
  confirmButtonRow: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1.25rem",
  },
  qrBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    border: "2px solid #ddd",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  },
  qrImage: {
    borderRadius: "0.5rem",
  },
  qrRoomLabel: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: 0,
  },
  linkRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  linkText: {
    fontSize: "1rem",
    color: "#333",
    wordBreak: "break-all",
  },
  copyButton: {
    fontSize: "0.9rem",
    padding: "0.4rem 0.75rem",
    borderRadius: "0.4rem",
    border: "1px solid #999",
    background: "#f5f5f5",
    cursor: "pointer",
  },
};

import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", margin: 0 }}>ไมค์ทอง คาราโอเกะ</h1>
      <p style={{ color: "#555", margin: 0 }}>
        ระบบสั่งเครื่องดื่ม/อาหาร — หน้านี้ใช้สำหรับทดสอบว่า deploy สำเร็จ
      </p>

      <nav
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/generate-qr"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#111",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          ไปหน้า Generate QR
        </Link>
        <Link
          href="/kitchen"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#eee",
            color: "#111",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          ไปหน้า Kitchen
        </Link>
      </nav>
    </main>
  );
}

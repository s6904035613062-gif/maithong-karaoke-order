import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ไมค์ทอง คาราโอเกะ</h1>
      <p>ระบบสั่งเครื่องดื่ม/อาหาร</p>
      <ul>
        <li>
          <Link href="/generate-qr">สร้าง QR Code (ทดสอบ deploy)</Link>
        </li>
        <li>
          <Link href="/kitchen">หน้าครัว (ทดสอบ deploy)</Link>
        </li>
      </ul>
    </main>
  );
}

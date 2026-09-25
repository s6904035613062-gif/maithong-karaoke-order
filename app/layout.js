export const metadata = {
  title: "ไมค์ทอง คาราโอเกะ",
  description: "ระบบสั่งเครื่องดื่ม/อาหาร ร้านไมค์ทอง คาราโอเกะ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}

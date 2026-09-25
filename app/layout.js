export const metadata = {
  title: "ไมค์ทอง คาราโอเกะ",
  description: "ระบบสั่งเครื่องดื่ม/อาหารร้านคาราโอเกะ ไมค์ทอง",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

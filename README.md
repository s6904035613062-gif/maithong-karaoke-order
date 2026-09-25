# ไมค์ทอง คาราโอเกะ

ระบบสั่งเครื่องดื่ม/อาหารสำหรับร้านคาราโอเกะ "ไมค์ทอง คาราโอเกะ"
สร้างด้วย Next.js (App Router, JavaScript) และ Supabase, deploy บน Vercel

> 📌 ดูบันทึกทางเทคนิคสำหรับ AI/นักพัฒนาที่จะทำงานต่อในโปรเจกต์นี้ที่ [`CLAUDE.md`](./CLAUDE.md)
> (โครงสร้างฐานข้อมูล, กติกาการคิดเงิน, และข้อควรระวังเรื่อง Dynamic Route params ใน Next.js เวอร์ชันล่าสุด)

## เริ่มต้นใช้งาน (Local Development)

1. ติดตั้ง dependencies:
   ```bash
   npm install
   ```

2. คัดลอกไฟล์ env:
   ```bash
   cp .env.local.example .env.local
   ```
   แล้วใส่ค่า `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   จาก Supabase Dashboard > Settings > API

3. รัน dev server:
   ```bash
   npm run dev
   ```
   เปิด [http://localhost:3000](http://localhost:3000)

## Deploy บน Vercel

1. Push โปรเจกต์นี้ขึ้น Git repository (GitHub/GitLab/Bitbucket)
2. Import repository ใน Vercel
3. ตั้งค่า Environment Variables ใน Vercel Project Settings ให้ตรงกับ `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel จะรัน `npm run build` และ `npm run start` โดยอัตโนมัติ

หลัง deploy สำเร็จ เข้าหน้าแรก (`/`) จะเห็นชื่อร้านและลิงก์ไปหน้า `/generate-qr` กับ `/kitchen`
ซึ่งเป็นหน้าทดสอบว่า routing และ deploy ทำงานถูกต้อง

---

### 📁 สรุปรายชื่อไฟล์ทั้งหมดที่สร้างในโครงสร้างโปรเจกต์นี้

```text
mike-thong-karaoke/
├── app/
│   ├── generate-qr/
│   │   └── page.js           # หน้าเปิดห้อง + สร้าง QR สำหรับพนักงาน
│   ├── kitchen/
│   │   └── page.js           # placeholder รอทำในขั้นถัดไป
│   ├── layout.js
│   └── page.js                # หน้าแรก
├── lib/
│   └── supabaseClient.js     # Supabase client
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
├── CLAUDE.md                  # บันทึกอ้างอิงสำคัญสำหรับ AI/นักพัฒนา
└── README.md
```

## ฐานข้อมูล (Supabase)

ตารางทั้งหมด (`sessions`, `menu_categories`, `menu_items`, `orders`) มีอยู่แล้วใน Supabase
รายละเอียดคอลัมน์และกติกาการคิดเงินแบบราคาต่อรายการ ดูที่ [`CLAUDE.md`](./CLAUDE.md)

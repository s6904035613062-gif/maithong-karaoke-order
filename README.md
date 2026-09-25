# ไมค์ทอง คาราโอเกะ

ระบบสั่งเครื่องดื่ม/อาหารสำหรับร้านคาราโอเกะ "ไมค์ทอง คาราโอเกะ"
สร้างด้วย Next.js (App Router, JavaScript) และ Supabase, deploy บน Vercel

> ดูรายละเอียดเชิงลึก (โครงสร้างฐานข้อมูล, กฎการคิดเงิน, ข้อควรระวังเรื่อง
> dynamic route params) ได้ที่ [`CLAUDE.md`](./CLAUDE.md)

## เริ่มต้นใช้งาน

1. ติดตั้ง dependencies:
   ```bash
   npm install
   ```

2. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่า Supabase ของคุณ:
   ```bash
   cp .env.local.example .env.local
   ```
   จากนั้นแก้ไข `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. รัน dev server:
   ```bash
   npm run dev
   ```
   เปิด [http://localhost:3000](http://localhost:3000)

## Deploy บน Vercel

1. Push โปรเจกต์นี้ขึ้น GitHub repo
2. Import repo เข้า Vercel
3. ตั้งค่า Environment Variables ใน Vercel Project Settings ให้ตรงกับ `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — ทดสอบว่า deploy สำเร็จโดยเข้าหน้าแรก แล้วกดลิงก์ไปยัง `/generate-qr`
   และ `/kitchen`

## โครงสร้างโปรเจกต์

```
miketong-karaoke/
├── app/
│   ├── layout.js
│   ├── page.js              # หน้าแรก
│   ├── generate-qr/
│   │   └── page.js          # placeholder
│   └── kitchen/
│       └── page.js          # placeholder
├── lib/
│   └── supabaseClient.js    # Supabase client
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
├── CLAUDE.md                 # โครงสร้าง DB, กฎการคิดเงิน, ข้อควรระวัง Next.js
└── README.md
```

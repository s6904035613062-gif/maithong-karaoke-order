# ไมค์ทอง คาราโอเกะ — Project Notes

โปรเจกต์ Next.js (App Router, JavaScript) สำหรับระบบสั่งเครื่องดื่ม/อาหารร้านคาราโอเกะ
"ไมค์ทอง คาราโอเกะ" deploy บน Vercel เชื่อมต่อกับ Supabase

## Stack
- Next.js (App Router, JavaScript — **ไม่ใช่ TypeScript**)
- React
- Supabase (`@supabase/supabase-js`) ผ่าน `lib/supabaseClient.js`
- Deploy: Vercel

## Environment Variables
ตั้งค่าใน `.env.local` (ดูตัวอย่างที่ `.env.local.example`) และใน Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## ⚠️ ข้อควรระวังสำคัญ: Dynamic Route Params เป็น Promise

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง **`params` (และ `searchParams`) ของ Dynamic Route
เป็น Promise** ไม่ใช่ object ธรรมดาอีกต่อไป

- ใน **Server Component**: ต้อง `await params` ก่อนใช้งาน
  ```js
  export default async function Page({ params }) {
    const { roomId } = await params;
    ...
  }
  ```
- ใน **Client Component**: ต้อง unwrap ด้วย `use()` จาก React เสมอ
  ```js
  "use client";
  import { use } from "react";

  export default function Page({ params }) {
    const { roomId } = use(params);
    ...
  }
  ```

กฎนี้สำคัญมากสำหรับขั้นตอนถัดไปที่จะสร้างหน้าสั่งเครื่องดื่ม/อาหาร (เช่น
`/order/[roomId]` หรือ dynamic route อื่น ๆ) — ห้ามใช้ `params.xxx` ตรง ๆ โดยไม่ unwrap ก่อน

## Database Schema (มีอยู่แล้วใน Supabase — ไม่ต้องสร้างใหม่)

โปรเจกต์นี้อ้างอิงตารางที่มีอยู่แล้วในฐานข้อมูล Supabase ดังนี้:

### `sessions`
| column        | type      | note                       |
|---------------|-----------|----------------------------|
| id            |           | primary key                |
| room_number   |           | หมายเลขห้อง                |
| status        |           | สถานะของ session           |
| created_at    |           | เวลาที่สร้าง                |

### `menu_categories`
| column      | type | note              |
|-------------|------|-------------------|
| id          |      | primary key       |
| name        |      | ชื่อหมวดหมู่เมนู     |
| sort_order  |      | ลำดับการแสดงผล     |

### `menu_items`
| column       | type | note                              |
|--------------|------|------------------------------------|
| id           |      | primary key                       |
| category_id  |      | FK -> menu_categories.id          |
| name         |      | ชื่อเมนู                            |
| price        |      | ราคาต่อหน่วย                       |

### `orders`
| column       | type   | note                                                        |
|--------------|--------|---------------------------------------------------------------|
| id           |        | primary key                                                  |
| session_id   |        | FK -> sessions.id                                             |
| room_number  |        | หมายเลขห้อง (denormalized)                                    |
| items        | jsonb  | array ของรายการ แต่ละรายการมี `name`, `quantity`, `price`      |
| status       |        | สถานะออเดอร์                                                  |
| created_at   |        | เวลาที่สร้าง                                                  |

## ⚠️ กฎการคิดเงิน (สำคัญ)

ระบบนี้คิดเงินแบบ **"ราคาต่อรายการ" ไม่ใช่เหมาจ่ายต่อหัว**

บิลรวมของแต่ละห้อง (room) คำนวณจาก:

```
บิลรวม = Σ (quantity × price) ของทุกรายการ (item) ในทุก order
         ที่อยู่ภายใต้ session เดียวกัน
```

กล่าวคือ ต้อง loop ผ่านทุก `order` ที่มี `session_id` เดียวกัน แล้วสำหรับแต่ละ order
loop ผ่าน array `items` (jsonb) แล้วรวม `quantity * price` ของทุกรายการเข้าด้วยกัน
**ห้าม**คำนวณแบบเหมาจ่ายต่อหัว หรือคิดราคาคงที่ต่อ session

ตัวอย่าง (pseudo-code):
```js
const total = orders
  .filter((o) => o.session_id === sessionId)
  .flatMap((o) => o.items)
  .reduce((sum, item) => sum + item.quantity * item.price, 0);
```

## Routes ที่มีในโครงเริ่มต้น (placeholder สำหรับทดสอบ deploy)
- `/` — หน้าแรก แสดงชื่อร้านและลิงก์ทดสอบ
- `/generate-qr` — placeholder
- `/kitchen` — placeholder

หน้าสั่งเครื่องดื่ม/อาหาร (เช่น per-room ordering page) จะสร้างในขั้นตอนถัดไป
โดยต้องปฏิบัติตามกฎ unwrap `params` ด้วย `use()` ตามที่ระบุไว้ข้างต้น

# CLAUDE.md — บันทึกอ้างอิงสำหรับโปรเจกต์ "ไมค์ทอง คาราโอเกะ"

ไฟล์นี้มีไว้ให้ AI (Claude) อ่านและจำไว้ใช้อ้างอิงตลอดทั้งโปรเจกต์
ในขั้นตอนถัดไป ไม่ต้องรันคำสั่งสร้างตารางใด ๆ — ตารางเหล่านี้ **มีอยู่แล้วใน Supabase**

## Stack
- Next.js (App Router) — **JavaScript เท่านั้น ไม่ใช้ TypeScript**
- React
- Supabase (@supabase/supabase-js) ผ่าน `lib/supabaseClient.js`
- Deploy บน Vercel

## Environment Variables (ตั้งค่าใน Vercel Project Settings ด้วย)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## โครงสร้างฐานข้อมูล (มีอยู่แล้ว — ห้ามสร้างซ้ำ)

### `sessions`
| column       | type      | หมายเหตุ                              |
|--------------|-----------|-----------------------------------------|
| id           | uuid/int  | primary key                             |
| room_number  | text/int  | หมายเลขห้องคาราโอเกะ                    |
| status       | text      | เช่น 'open', 'closed'                   |
| created_at   | timestamp | เวลาที่เปิด session                     |

### `menu_categories`
| column     | type      | หมายเหตุ                |
|------------|-----------|--------------------------|
| id         | uuid/int  | primary key              |
| name       | text      | ชื่อหมวดหมู่เมนู          |
| sort_order | int       | ลำดับการแสดงผล           |

### `menu_items`
| column      | type      | หมายเหตุ                          |
|-------------|-----------|-------------------------------------|
| id          | uuid/int  | primary key                        |
| category_id | uuid/int  | FK -> menu_categories.id           |
| name        | text      | ชื่อเมนู                          |
| price       | numeric   | ราคาต่อหน่วย                       |

### `orders`
| column      | type      | หมายเหตุ                                                      |
|-------------|-----------|-----------------------------------------------------------------|
| id          | uuid/int  | primary key                                                    |
| session_id  | uuid/int  | FK -> sessions.id                                               |
| room_number | text/int  | หมายเลขห้อง (denormalized ไว้เพื่อ query ง่าย)                  |
| items       | jsonb     | array ของรายการ แต่ละรายการมี `{ name, quantity, price }`       |
| status      | text      | เช่น 'pending', 'served', 'cancelled'                           |
| created_at  | timestamp | เวลาที่สั่ง                                                     |

ตัวอย่างรูปแบบ `items` ใน `orders`:
```json
[
  { "name": "โค้ก", "quantity": 2, "price": 40 },
  { "name": "เปปซี่", "quantity": 1, "price": 40 }
]
```

## ⚠️ กติกาการคิดเงิน (สำคัญมาก)

ระบบนี้คิดเงินแบบ **"ราคาต่อรายการ" (per-item)** ไม่ใช่แบบเหมาจ่ายต่อหัว (ไม่ใช่ per-person / cover charge)

**บิลรวมของแต่ละห้อง (session) คำนวณจาก:**

```
total = Σ (quantity × price)
```

โดยรวมทุกรายการ (`items` array) ของ**ทุกออเดอร์** (`orders`) ที่มี `session_id` เดียวกัน

ตัวอย่างเช่น ห้อง 5 มี session เดียว แต่สั่งอาหาร/เครื่องดื่ม 3 รอบ (3 แถวใน `orders`) —
ต้องดึง `orders` ทั้ง 3 แถวที่ `session_id` ตรงกัน แล้ววนลูปรวม `quantity * price` ของทุก item ในทุกออเดอร์
**ห้ามคิดเป็นค่าหัวคงที่คูณจำนวนคน** และห้ามคิดแค่ออเดอร์ล่าสุดออเดอร์เดียว

## ⚠️ Next.js เวอร์ชันล่าสุด: params ของ Dynamic Route เป็น Promise

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง `params` (และ `searchParams`) ที่ส่งเข้า
Page/Layout component ของ Dynamic Route **เป็น Promise** ไม่ใช่ object ตรง ๆ เหมือนเวอร์ชันเก่า

เวลาสร้างหน้าแบบ dynamic route (เช่น `/order/[room]/page.js` ที่จะสร้างในขั้นตอนถัดไป)
**ต้อง unwrap ด้วย `use()` จาก React เสมอ** ตัวอย่าง:

```jsx
"use client";
import { use } from "react";

export default function OrderPage({ params }) {
  const { room } = use(params); // ต้อง unwrap ด้วย use() ก่อนใช้งาน
  // ...
}
```

หรือถ้าเป็น Server Component (async function) ให้ `await params` แทน:

```jsx
export default async function OrderPage({ params }) {
  const { room } = await params;
  // ...
}
```

**ห้ามอ่าน `params.room` ตรง ๆ โดยไม่ unwrap** เพราะจะพังหรือ error บน Next.js เวอร์ชันนี้

## หน้าที่มีอยู่แล้ว (placeholder สำหรับทดสอบ deploy)
- `/` — หน้าแรก แสดงชื่อร้านและลิงก์ไปหน้าอื่น
- `/generate-qr` — placeholder รอสร้างฟีเจอร์สร้าง QR ต่อห้อง
- `/kitchen` — placeholder รอสร้างฟีเจอร์แสดงออเดอร์แบบเรียลไทม์

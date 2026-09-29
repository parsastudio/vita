# ویتا | Vita

<p align="center">
  <strong>پلتفرم شخصی ماژولار، لوکس و اول-آفلاین (Local-First)؛ مجهز به سیستم یادگیری تطبیقی FSRS و دستیار پردازش زبان طبیعی فارسی.</strong>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS v4" /></a>
  <a href="https://dexie.com"><img src="https://img.shields.io/badge/Dexie.js-IndexedDB_Reactive-10B981?style=for-the-badge" alt="Dexie.js" /></a>
  <a href="https://orm.drizzle.team"><img src="https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=for-the-badge&logo=postgresql&logoColor=black" alt="Drizzle" /></a>
  <a href="https://github.com/open-spaced-repetition/fsrs4anki"><img src="https://img.shields.io/badge/FSRS--6-Spaced_Repetition-8B5CF6?style=for-the-badge" alt="FSRS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge" alt="PWA" /></a>
</p>

---

## چکیده و فلسفه طراحی

**ویتا** یک هاب شخصی مدرن، مستقل و متمرکز بر حریم خصوصی است که مرز میان کارایی اپلیکیشن‌های بومی و انعطاف وب مدرن را از بین می‌برد. تمام تراکنش‌ها و داده‌ها ابتدا به‌صورت اتمیک روی دیتابیس محلی دستگاه (IndexedDB) ثبت شده و رابط کاربری را بدون کوچک‌ترین تاخیر شبکه (Zero-Latency) به‌روزرسانی می‌کنند؛ سپس در پس‌زمینه از طریق یک موتور همگام‌سازی ناهمگام دوطرفه با پایگاه داده PostgreSQL سرور همگام می‌شوند.

---

## ارکان معماری سیستم

- **معماری کلاینت-محور (Local-First Agnosticism):** قطع اینترنت به هیچ وجه عملکرد سیستم را متوقف نمی‌کند. خواندن و نوشتن داده‌ها مستقیماً با لایه محلی انجام شده و سیستم در حالت آفلاین کامل کار می‌کند.
- **موتور حل تعارض و همگام‌سازی ارتجاعی (Resilient Sync Engine):** استفاده از تایم‌استمپ‌های شناور، لایه میانی حذف متوازن (`deleted_records`) و بافر زمانی ایمن برای مهار نوسانات ساعت (Clock Drift) و مدیریت تراکنش‌های انباشته.
- **تفکیک کامل دغدغه‌ها (Clean Architecture):** تفکیک مطلق لایه دامنه، مدل‌های FSRS و منطق پردازشگر مالی از لایه کامپوننت‌های ارائه‌دهنده (Pure Presentational Components).
- **ناوبری هماهنگ با URL (SSR Hydration Safe):** مدیریت هوشمند تب‌ها و فضاهای کاری از طریق هوک اختصاصی مبتنی بر استاندارد App Router بدون بروز پدیده Hydration Mismatch.

---

## فضاهای کاری اصلی

### ۱. فضای یادگیری تطبیقی زبان (FSRS Spaced Repetition)

- پیاده‌سازی نسل ششم الگوریتم **Free Spaced Repetition Scheduler (FSRS-6)** جهت پیش‌بینی دقیق فرآیند تثبیت داده در حافظه بلندمدت بر پایه متغیرهای پایداری (Stability) و سختی (Difficulty).
- مدیریت هوشمند بار شناختی با قابلیت تنظیم سقف یادگیری کلمات جدید در روز (۵ تا ۱۰ کلمه بهینه) و صف‌بندی خودکار کلمات مازاد.
- مجهز به موتور تلفظ صوتی با کش مرورگر (Web Speech API) و ابزار ورودی/خروجی استاندارد داده‌ها با ساختار JSON.

### ۲. فضای حسابداری شخصی هوشمند (NLP Financial Engine)

- پردازش زبان طبیعی فارسی در سمت کلاینت (Client-Side NLP) برای استخراج مستقیم مبالغ عددی از عبارات عامیانه و متن‌های محاوره‌ای (نظیر _«۵۰ تومن بنزین»_ یا _«۴.۵ میلیون حقوق»_).
- ردیاب واکنشی بودجه ماهانه؛ هشدار پیش‌دستانه اتمیک به محض نزدیک شدن مخارج به ۸۰٪ سقف بودجه تعیین‌شده.
- تحلیل الگوهای خرج‌کرد، محاسبه خودکار نرخ پس‌انداز فعال، استخراج شاخص سلامت مالی و مصورسازی سهم دسته‌بندی‌ها با متغیرهای بومی چارت.

---

## پشته فناوری (Tech Stack)

| لایه                 | فناوری                            | نقش در سیستم                                                            |
| :------------------- | :-------------------------------- | :---------------------------------------------------------------------- |
| **هسته فریم‌ورک**    | Next.js 16 + React 19             | اجرای هیبریدی Server/Client Components با خروجی Standalone              |
| **پایگاه داده محلی** | Dexie.js (IndexedDB)              | ذخیره‌سازی محلی با کوئری‌های واکنشی (Reactive Live Queries)             |
| **لایه داده سرور**   | Drizzle ORM + PostgreSQL          | نگاشت ساختار داده‌ها، مایگریشن‌های اتمیک و مدیریت همگام‌سازی ابری       |
| **موتور یادگیری**    | ts-fsrs                           | الگوریتم شناختی زمان‌بندی فواصل مرور کارت‌ها                            |
| **استایل و طراحی**   | Tailwind CSS v4 + Framer Motion   | طراحی مدرن با پالت رنگی داینامیک اوکلب (oklch) و انیمیشن‌های روان       |
| **اعتبارسنجی**       | Zod                               | حفظ منبع واحد حقیقت (Single Source of Truth) برای تمام فرم‌ها و داده‌ها |
| **قابلیت PWA**       | Web App Manifest + Service Worker | نصب‌پذیری کامل به عنوان نرم‌افزار بومی با کش فایل‌های ایستا             |

---

## استانداردهای عملکردی و تجربه کاربری

- **ثبات صفر در چیدمان (CLS = 0):** بارگذاری داده‌ها با اسکلتون‌های پیکسلی دقیق جهت جلوگیری از پرش المان‌های صفحه حین اجرای کوئری‌ها.
- **جداسازی با مرزهای خطا (Component Isolation):** محصور شدن هر فضای کاری درون یک `ErrorBoundary` اختصاصی جهت حفظ پایداری کل داشبورد در مواجهه با خطاهای پیش‌بینی‌نشده.
- **امنیت محلی و حریم خصوصی:** ایزوله‌سازی نشست‌های کاربری با کوکی‌های HttpOnly و پاک‌سازی کامل حافظه محلی در زمان خروج از حساب.

---

<p align="center">
  <sub>طراحی‌شده با تمرکز بر بالاترین بازدهی، کارایی شناختی و استقلال کامل از سرور ابری.</sub>
</p>

# 🎬 Scene Prompt Copier (Web Version)

Web Application siap deploy di **Vercel** untuk membantu alur kerja menyalin prompt per adegan secara berurutan (*multitasking Gemini ➡️ Google Flow*).

---

## 🌟 Fitur Utama
1. **Desain Sesuai Sketsa Asli:**
   - Kotak abu-abu di atas untuk **"tempel teks prompt"** atau buka file `.txt`.
   - Di bawahnya langsung berupa daftar **`Scene 1`**, **`Scene 2`**, **`Scene 3`**, dst.
   - Tombol **HIJAU** persegi bertuliskan **`salin`**.
   - Saat diklik:
     - Prompt adegan langsung tersalin ke clipboard.
     - Teks label `scene 010` atau `Scene 1` otomatis dibuang (hanya isi prompt).
     - Tombol otomatis berubah menjadi **MERAH** tanda sudah selesai.
2. **Tombol "🪟 Jendela Mini":**
   - Membuka aplikasi dalam jendela pop-up kecil mandiri tanpa tab browser, sehingga bisa ditaruh pas di samping tab Google Flow.
3. **Data Aman di Browser:**
   - Tersimpan otomatis di `localStorage`. Jika di-refresh, daftar adegan dan tombol yang sudah merah tidak akan hilang.
4. **Tombol Reset Warna:**
   - Mengembalikan semua tombol menjadi hijau lagi jika ingin mengulang antrean.

---

## 🚀 Cara Deploy ke Vercel

### Cara 1: Lewat GitHub (Paling Direkomendasikan & Otomatis)
1. Unggah (push) seluruh isi folder ini ke repository **GitHub** lu:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Scene Prompt Copier"
   git branch -M main
   git remote add origin https://github.com/<username-lu>/<nama-repo>.git
   git push -u origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com/) dan login.
3. Klik **"Add New..."** ➡️ **"Project"**.
4. Pilih repository GitHub lu tadi, lalu klik **"Import"**.
5. Pada bagian **Framework Preset**, pilih **"Other"** (atau biarkan default, Vercel otomatis mendeteksi file `index.html`).
6. Klik **"Deploy"**. Selesai dalam hitungan detik!

---

### Cara 2: Lewat Vercel CLI (Lewat Terminal Komputer)
Jika sudah install Node.js di komputer:
1. Buka terminal/cmd di folder ini (`c:\Users\Administrator\Downloads\extention`).
2. Jalankan perintah:
   ```bash
   npx vercel
   ```
3. Ikuti panduan di layar (tekan Enter untuk opsi default).
4. Web lu langsung aktif dan punya domain publik gratis (misal: `https://scene-prompt-copier.vercel.app`).

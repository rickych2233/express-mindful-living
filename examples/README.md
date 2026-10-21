# Contoh chapter multibahasa

- `chapter-success.html`: pratinjau susunan dua bahasa dari respons baca ulang API lokal.
- `chapter-success.json`: respons API sesudah simpan dan baca ulang dari PostgreSQL uji nyata.
- `translation-success.json`: hasil permintaan nyata ke penyedia terjemahan untuk dua kalimat umum. HTML dan penanda media tetap utuh.

URL media adalah fixture ilustratif; contoh ini tidak membuktikan upload atau pemutaran file media. Tidak ada perubahan yang dipasang di produksi.

## Menjalankan ulang

```sh
npm test
```

Tes database dilewati secara default. Siapkan database PostgreSQL khusus pengujian dengan nama berakhiran `_test`, lalu jalankan:

```sh
RUN_DB_TESTS=1 DB_HOST=127.0.0.1 DB_PORT=55439 DB_USER=satya_test DB_NAME=satya_chapter_test npm test
```

Tes membuat schema sementara, memakai endpoint HTTP lokal, lalu menghapus schema tersebut. Tes mencakup simpan/baca ulang, metadata media, penolakan layout bahasa yang berbeda, dan rollback setelah INSERT media sengaja digagalkan.

## Saat menerapkan perubahan

Backend memerlukan `npm ci`. Inisialisasi database menambahkan kolom `duration` dan `instructions` pada `section_contents`. Pasang backend sebelum frontend baru. Format lama tanpa penanda inline tetap diterima. Format inline mengharuskan semua bahasa yang dikirim memiliki penanda media lengkap dan sama urutannya.

-- Teamsync one-time data migration. Back up teamsync_db before importing.
-- Admin CRUD will use mata_kuliah, kelompok, and users after this migration.
-- The admin_courses and admin_groups tables are retained as legacy archives.

ALTER TABLE mata_kuliah
  ADD COLUMN IF NOT EXISTS dosen_label VARCHAR(180) NULL;

ALTER TABLE kelompok
  ADD COLUMN IF NOT EXISTS jumlah_anggota INT NOT NULL DEFAULT 0;

-- status_aktif is the canonical account flag. Preserve accounts disabled by either old flag.
UPDATE users
SET status_aktif = 0
WHERE COALESCE(aktif, 1) = 0 OR COALESCE(status_aktif, 1) = 0;

START TRANSACTION;

-- Import old Admin course rows into the shared course table without replacing existing rows.
INSERT IGNORE INTO mata_kuliah
  (kode_matkul, nama_matkul, id_dosen, dosen_label, status_aktif)
SELECT
  c.kode,
  c.nama,
  (SELECT MIN(u.id)
   FROM users u
   WHERE u.role = 'Dosen'
     AND LOWER(TRIM(u.nama)) = LOWER(TRIM(c.dosen))),
  NULLIF(TRIM(c.dosen), ''),
  c.aktif
FROM admin_courses c;

-- Import old Admin group rows.
INSERT IGNORE INTO kelompok
  (nama_kelompok, kode_kelompok, id_matkul, jumlah_anggota, status_aktif)
SELECT
  g.nama,
  g.kode,
  (
    SELECT m.id_matkul
    FROM mata_kuliah AS m
    WHERE
      LOWER(m.kode_matkul) COLLATE utf8mb4_unicode_ci =
      LOWER(TRIM(SUBSTRING_INDEX(g.mata_kuliah, '/', 1)))
        COLLATE utf8mb4_unicode_ci
      OR LOWER(m.nama_matkul) COLLATE utf8mb4_unicode_ci =
      LOWER(TRIM(g.mata_kuliah)) COLLATE utf8mb4_unicode_ci
    ORDER BY
      (
        LOWER(m.kode_matkul) COLLATE utf8mb4_unicode_ci =
        LOWER(TRIM(SUBSTRING_INDEX(g.mata_kuliah, '/', 1)))
          COLLATE utf8mb4_unicode_ci
      ) DESC
    LIMIT 1
  ),
  g.anggota,
  g.aktif
FROM admin_groups AS g;

-- Hubungkan kelompok yang sudah ada dengan mata kuliahnya.
UPDATE kelompok AS main_group
JOIN admin_groups AS legacy_group
  ON legacy_group.kode = main_group.kode_kelompok
SET
  main_group.id_matkul = COALESCE(
    main_group.id_matkul,
    (
      SELECT m.id_matkul
      FROM mata_kuliah AS m
      WHERE
        LOWER(m.kode_matkul) COLLATE utf8mb4_unicode_ci =
        LOWER(TRIM(SUBSTRING_INDEX(legacy_group.mata_kuliah, '/', 1)))
          COLLATE utf8mb4_unicode_ci
        OR LOWER(m.nama_matkul) COLLATE utf8mb4_unicode_ci =
        LOWER(TRIM(legacy_group.mata_kuliah))
          COLLATE utf8mb4_unicode_ci
      ORDER BY
        (
          LOWER(m.kode_matkul) COLLATE utf8mb4_unicode_ci =
          LOWER(TRIM(SUBSTRING_INDEX(legacy_group.mata_kuliah, '/', 1)))
            COLLATE utf8mb4_unicode_ci
        ) DESC
      LIMIT 1
    )
  ),
  main_group.jumlah_anggota = GREATEST(
    COALESCE(main_group.jumlah_anggota, 0),
    COALESCE(legacy_group.anggota, 0)
  ),
  main_group.status_aktif = CASE
    WHEN legacy_group.aktif = 0 THEN 0
    ELSE main_group.status_aktif
  END;


-- Backfill id_pic only when a task name matches exactly one user. Ambiguous names remain untouched.
UPDATE tugas t
SET t.id_pic = (
  SELECT MIN(u.id)
  FROM users u
  WHERE LOWER(TRIM(u.nama)) = LOWER(TRIM(t.penanggung_jawab))
)
WHERE t.id_pic IS NULL
  AND t.penanggung_jawab IS NOT NULL
  AND (SELECT COUNT(*)
       FROM users u
       WHERE LOWER(TRIM(u.nama)) = LOWER(TRIM(t.penanggung_jawab))) = 1;

COMMIT;
const crypto = require('crypto');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
app.use(bodyParser.json());
app.use(express.static(require('path').join(__dirname, '..', 'frontend')));
const PORT = Number(process.env.PORT) || 3000;
const TOKEN_LIFETIME = 12 * 60 * 60 * 1000;
const TOKEN_SECRET =
    process.env.TEAMSYNC_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const allowedRoles = ['Mahasiswa', 'Dosen', 'Admin'];

// Konfigurasi Database
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teamsync_db'
});

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function createToken(user) {
    const payload = Buffer.from(JSON.stringify({
        email: user.email,
        role: user.role,
        expiresAt: Date.now() + TOKEN_LIFETIME
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET)
        .update(payload)
        .digest('base64url');
    return `${payload}.${signature}`;
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
    const stored = String(storedPassword || '');
    if (/^\$2[aby]\$/.test(stored)) {
        return { valid: bcrypt.compareSync(password, stored), needsUpgrade: true };
    }
    if (!stored.startsWith('scrypt$')) {
        return { valid: password === stored, needsUpgrade: true };
    }

    const [, salt, savedHash] = stored.split('$');
    if (!salt || !savedHash) return { valid: false, needsUpgrade: false };

    const enteredHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const enteredBuffer = Buffer.from(enteredHash);
    const savedBuffer = Buffer.from(savedHash);
    const valid =
        enteredBuffer.length === savedBuffer.length &&
        crypto.timingSafeEqual(enteredBuffer, savedBuffer);
    return { valid, needsUpgrade: false };
}

function readToken(token) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;

    const expected = crypto.createHmac('sha256', TOKEN_SECRET)
        .update(payload)
        .digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;

    try {
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return session.expiresAt > Date.now() ? session : null;
    } catch {
        return null;
    }
}

function requireStudent(req, res, next) {
    const authorization = req.get('authorization') || '';
    const session = readToken(authorization.replace(/^Bearer\s+/i, ''));
    if (!session) {
        return res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
    }
    if (session.role !== 'Mahasiswa') {
        return res.status(403).json({ error: 'Fitur kelompok hanya tersedia untuk mahasiswa.' });
    }
    db.promise()
        .query(
            'SELECT id, nama, email, nim, role, status_aktif FROM users WHERE email = ? LIMIT 1',
            [session.email]
        )
        .then(([rows]) => {
            const account = rows[0];
            if (!account || account.role !== 'Mahasiswa' || !Number(account.status_aktif)) {
                return res.status(403).json({ error: 'Akun mahasiswa ini sudah dinonaktifkan atau rolenya berubah.' });
            }
            req.account = account;
            next();
        })
        .catch(next);
}

function requireLecturer(req, res, next) {
    const authorization = req.get('authorization') || '';
    const session = readToken(authorization.replace(/^Bearer\s+/i, ''));
    if (!session) {
        return res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
    }
    if (session.role !== 'Dosen') {
        return res.status(403).json({ error: 'Fitur ini hanya tersedia untuk Dosen.' });
    }
    db.promise()
        .query(
            "SELECT id, nama, email, role, status_aktif FROM users WHERE email = ? LIMIT 1",
            [session.email]
        )
        .then(([rows]) => {
            const account = rows[0];
            if (!account || account.role !== 'Dosen' || !Number(account.status_aktif)) {
                return res.status(403).json({ error: 'Akun Dosen ini sudah dinonaktifkan atau rolenya berubah.' });
            }
            req.account = account;
            next();
        })
        .catch(next);
}

function requireStudentGroup(req, res, next) {
    requireStudent(req, res, () => {
        const groupId = Number(req.params.groupId);
        if (!Number.isInteger(groupId) || groupId < 1) {
            return res.status(400).json({ error: 'Kelompok tidak valid.' });
        }
        db.promise()
            .query(
                'SELECT id_kelompok FROM anggota_kelompok WHERE id_kelompok = ? AND id_user = ? LIMIT 1',
                [groupId, req.account.id]
            )
            .then(([rows]) => {
                if (!rows.length) {
                    return res.status(403).json({ error: 'Anda bukan anggota kelompok ini.' });
                }
                req.groupId = groupId;
                next();
            })
            .catch(next);
    });
}

function requireAdmin(req, res, next) {
    const authorization = req.get('authorization') || '';
    const session = readToken(authorization.replace(/^Bearer\s+/i, ''));
    if (!session) {
        return res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
    }
    if (session.role !== 'Admin') {
        return res.status(403).json({ error: 'Akses hanya tersedia untuk Admin.' });
    }
    db.promise()
        .query(
            'SELECT role, status_aktif FROM users WHERE email = ? LIMIT 1',
            [session.email]
        )
        .then(([rows]) => {
            const account = rows[0];
            if (account &&
                (account.role !== 'Admin' || !Number(account.status_aktif))) {
                return res.status(403).json({
                    error: 'Akun Admin ini sudah dinonaktifkan atau rolenya berubah.'
                });
            }
            req.auth = session;
            next();
        })
        .catch(next);
}

async function ensureColumn(table, column, definition) {
    const [columns] = await db.promise().query(
        `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
        [column]
    );
    if (!columns.length) {
        await db.promise().query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    }
}

async function migratePlaintextPasswords() {
    const [accounts] = await db.promise().query(
        'SELECT id, password FROM users'
    );
    for (const account of accounts) {
        const stored = String(account.password || '');
        const isScrypt = stored.startsWith('scrypt$');
        const isBcrypt = /^\$2[aby]\$/.test(stored);
        if (!isScrypt && !isBcrypt) {
            await db.promise().query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashPassword(stored), account.id]
            );
        }
    }
}

async function initializeDatabase() {
    await db.promise().query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(150) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await ensureColumn('users', 'role',
        "role VARCHAR(20) NOT NULL DEFAULT 'Mahasiswa'");
    await ensureColumn('users', 'status_aktif',
        'status_aktif TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('users', 'aktif',
        'aktif TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('mata_kuliah', 'status_aktif',
        'status_aktif TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('mata_kuliah', 'dosen_label',
        'dosen_label VARCHAR(180) NULL');
    await ensureColumn('kelompok', 'status_aktif',
        'status_aktif TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('kelompok', 'jumlah_anggota',
        'jumlah_anggota INT NOT NULL DEFAULT 0');
    await ensureColumn('tugas', 'client_key',
        'client_key VARCHAR(80) NULL');
    const [taskIndexes] = await db.promise().query(
        "SHOW INDEX FROM tugas WHERE Key_name = 'uq_tugas_kelompok_client'"
    );
    if (!taskIndexes.length) {
        await db.promise().query(
            'ALTER TABLE tugas ADD UNIQUE KEY uq_tugas_kelompok_client (kelompok_id, client_key)'
        );
    }
    await db.promise().query(
        'ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL'
    );
    await db.promise().query(
        'UPDATE users SET status_aktif = 0 WHERE aktif = 0 AND status_aktif <> 0'
    );
    await migratePlaintextPasswords();
}
db.connect(async err => {
    if (err) {
        console.error('Database MySQL belum siap:', err.message);
        process.exitCode = 1;
        return;
    }

    try {
        await initializeDatabase();
        console.log('Database MySQL Terhubung!');
        app.listen(PORT, () => {
            console.log(`Server berjalan di http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Inisialisasi database gagal:', error.message);
        process.exitCode = 1;
    }
});

// Route: Registrasi
app.post('/api/register', asyncRoute(async (req, res) => {
    const nama = String(req.body.nama || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!nama || !email || password.length < 6) {
        return res.status(400).json({
            error: 'Nama, email, dan kata sandi minimal 6 karakter wajib diisi.'
        });
    }
    const [existingUsers] = await db.promise().query(
        'SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1',
        [email]
    );
    if (existingUsers.length) {
        return res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
    }
    const query = "INSERT INTO users (nama, email, password) VALUES (?, ?, ?)";
    db.query(query, [nama, email, hashPassword(password)], (err, result) => {
        if (err) {
            const status = err.code === 'ER_DUP_ENTRY' ? 409 : 500;
            return res.status(status).json({ error: "Email sudah terdaftar" });
        }
        const user = { nama, email, role: 'Mahasiswa' };
        res.status(201).json({
            message: "Registrasi Berhasil!",
            user,
            token: createToken(user)
        });
    });
}));

// Dosen may create an account through the lecturer registration form.
app.post('/api/lecturer/register', asyncRoute(async (req, res) => {
    const nama = String(req.body.nama || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!nama || !email || password.length < 6) {
        return res.status(400).json({
            error: 'Nama, email, dan kata sandi minimal 6 karakter wajib diisi.'
        });
    }
    const [existingUsers] = await db.promise().query(
        'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]
    );
    if (existingUsers.length) {
        return res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
    }
    await db.promise().query(
        "INSERT INTO users (nama, email, password, role, status_aktif, aktif) VALUES (?, ?, ?, 'Dosen', 1, 1)",
        [nama, email, hashPassword(password)]
    );
    const user = { nama, email, role: 'Dosen' };
    res.status(201).json({ message: 'Akun Dosen berhasil dibuat.', user, token: createToken(user) });
}));

function loginByRole(role) {
    return asyncRoute(async (req, res) => {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const [rows] = await db.promise().query(
            'SELECT nama, email, password, role, status_aktif FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        const account = rows[0];
        const passwordCheck = account
            ? verifyPassword(password, account.password)
            : { valid: false, needsUpgrade: false };
        if (!account || account.role !== role || !passwordCheck.valid || !Number(account.status_aktif)) {
            return res.status(401).json({
                success: false,
                error: 'Email atau kata sandi belum sesuai untuk jenis akun ini.'
            });
        }
        if (passwordCheck.needsUpgrade) {
            await db.promise().query(
                'UPDATE users SET password = ? WHERE email = ?',
                [hashPassword(password), account.email]
            );
        }
        const user = { nama: account.nama, email: account.email, role: account.role };
        res.json({ success: true, user, token: createToken(user) });
    });
}

app.post('/api/login', loginByRole('Mahasiswa'));
app.post('/api/lecturer/login', loginByRole('Dosen'));
app.post('/api/admin/login', loginByRole('Admin'));

app.post('/api/admin/demo-login', asyncRoute(async (req, res) => {
    const origin = req.get('origin') || '';
    let hostname = '';
    try {
        hostname = new URL(origin).hostname;
    } catch {
        // Browser Origin is required for the local demo login.
    }

    const localOrigins = ['localhost', '127.0.0.1', '::1'];
    const demoEnabled =
        process.env.NODE_ENV !== 'production' &&
        process.env.ENABLE_ADMIN_DEMO !== 'false';
    if (!demoEnabled || !localOrigins.includes(hostname)) {
        return res.status(403).json({
            error: 'Login Demo Admin hanya tersedia untuk preview lokal.'
        });
    }

    const user = {
        nama: 'Admin Teamsync',
        email: 'admin@teamsync.id',
        role: 'Admin'
    };
    res.json({ success: true, user, token: createToken(user) });
}));

app.post('/api/student/demo-login', asyncRoute(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Login Demo Mahasiswa tidak tersedia di lingkungan produksi.' });
    }
    const [rows] = await db.promise().query(
        "SELECT nama, email, role, nim FROM users WHERE email = 'mahasiswa.demo@teamsync.id' AND role = 'Mahasiswa' AND status_aktif = 1 LIMIT 1"
    );
    const account = rows[0];
    if (!account) {
        return res.status(404).json({ error: 'Akun demo mahasiswa belum tersedia. Daftar atau masuk dengan akun Anda.' });
    }
    const user = { nama: account.nama, email: account.email, role: account.role, nim: account.nim };
    res.json({ success: true, user, token: createToken(user) });
}));

app.get('/api/groups/me', requireStudent, asyncRoute(async (req, res) => {
    const [groups] = await db.promise().query(
        'SELECT g.id, g.nama_kelompok, g.kode_kelompok, g.id_matkul, g.id_ketua, g.tautan_dokumen, g.status_aktif, g.tanggal_dibuat, m.nama_matkul, m.kode_matkul, leader.nama AS nama_ketua, COUNT(DISTINCT a2.id_user) AS jumlah_anggota ' +
        'FROM anggota_kelompok a JOIN kelompok g ON g.id = a.id_kelompok ' +
        'LEFT JOIN mata_kuliah m ON m.id_matkul = g.id_matkul ' +
        'LEFT JOIN users leader ON leader.id = g.id_ketua ' +
        'LEFT JOIN anggota_kelompok a2 ON a2.id_kelompok = g.id ' +
        'WHERE a.id_user = ? GROUP BY g.id, g.nama_kelompok, g.kode_kelompok, g.id_matkul, g.id_ketua, g.tautan_dokumen, g.status_aktif, g.tanggal_dibuat, m.nama_matkul, m.kode_matkul, leader.nama LIMIT 1',
        [req.account.id]
    );
    const group = groups[0];
    if (!group) return res.json({ group: null, members: [] });
    const [members] = await db.promise().query(
        "SELECT u.id, u.nama, u.nim, a.peran FROM anggota_kelompok a JOIN users u ON u.id = a.id_user WHERE a.id_kelompok = ? ORDER BY (a.peran = 'Ketua kelompok') DESC, a.tanggal_bergabung, u.nama",
        [group.id]
    );
    const [lecturerNotes] = await db.promise().query(
        `SELECT n.id_catatan AS id, n.isi, n.waktu, u.nama AS dosen
         FROM catatan_dosen n JOIN users u ON u.id = n.id_dosen
         WHERE n.id_kelompok = ? ORDER BY n.waktu DESC`,
        [group.id]
    );
    res.json({ group, members, lecturerNotes });
}));

app.put('/api/groups/:groupId/document-link', requireStudentGroup, asyncRoute(async (req, res) => {
    const url = String(req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'URL dokumen wajib diisi.' });
    if (url.length > 1000) return res.status(400).json({ error: 'URL dokumen maksimal 1.000 karakter.' });

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return res.status(400).json({ error: 'URL dokumen tidak valid.' });
    }
    if (parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'URL dokumen harus menggunakan HTTPS.' });
    }

    await db.promise().query(
        'UPDATE kelompok SET tautan_dokumen = ? WHERE id = ?',
        [url, req.groupId]
    );
    res.json({ message: 'Tautan dokumen kelompok berhasil disimpan.', tautan_dokumen: url });
}));

app.get('/api/groups/courses', requireStudent, asyncRoute(async (req, res) => {
    const [rows] = await db.promise().query(
        'SELECT id_matkul, kode_matkul, nama_matkul FROM mata_kuliah WHERE status_aktif = 1 ORDER BY nama_matkul'
    );
    res.json(rows);
}));

app.post('/api/groups', requireStudent, asyncRoute(async (req, res) => {
    const nama = String(req.body.nama || '').trim();
    const idMatkul = req.body.id_matkul ? Number(req.body.id_matkul) : null;
    if (!nama) return res.status(400).json({ error: 'Nama kelompok wajib diisi.' });
    if (nama.length > 100) return res.status(400).json({ error: 'Nama kelompok maksimal 100 karakter.' });
    if (idMatkul !== null && (!Number.isInteger(idMatkul) || idMatkul < 1)) {
        return res.status(400).json({ error: 'Mata kuliah tidak valid.' });
    }
    const [existing] = await db.promise().query(
        'SELECT id_kelompok FROM anggota_kelompok WHERE id_user = ? LIMIT 1', [req.account.id]
    );
    if (existing.length) return res.status(409).json({ error: 'Anda sudah tergabung dalam kelompok.' });
    if (idMatkul !== null) {
        const [courses] = await db.promise().query(
            'SELECT id_matkul FROM mata_kuliah WHERE id_matkul = ? AND status_aktif = 1 LIMIT 1', [idMatkul]
        );
        if (!courses.length) return res.status(400).json({ error: 'Mata kuliah tidak ditemukan atau tidak aktif.' });
    }
    const code = 'TS-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const [created] = await db.promise().query(
        'INSERT INTO kelompok (nama_kelompok, kode_kelompok, id_matkul, id_ketua, jumlah_anggota, status_aktif) VALUES (?, ?, ?, ?, 1, 1)',
        [nama, code, idMatkul, req.account.id]
    );
    try {
        await db.promise().query(
            "INSERT INTO anggota_kelompok (id_kelompok, id_user, peran) VALUES (?, ?, 'Ketua kelompok')",
            [created.insertId, req.account.id]
        );
    } catch (error) {
        await db.promise().query('DELETE FROM kelompok WHERE id = ?', [created.insertId]);
        throw error;
    }
    res.status(201).json({ message: 'Kelompok berhasil dibuat.', code });
}));

app.post('/api/groups/join', requireStudent, asyncRoute(async (req, res) => {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Kode undangan wajib diisi.' });
    const [existing] = await db.promise().query(
        'SELECT id_kelompok FROM anggota_kelompok WHERE id_user = ? LIMIT 1', [req.account.id]
    );
    if (existing.length) return res.status(409).json({ error: 'Anda sudah tergabung dalam kelompok.' });
    const [groups] = await db.promise().query(
        'SELECT id, id_ketua FROM kelompok WHERE UPPER(kode_kelompok) = ? AND status_aktif = 1 LIMIT 1', [code]
    );
    if (!groups.length) return res.status(404).json({ error: 'Kode undangan tidak ditemukan atau kelompok tidak aktif.' });
    const groupId = groups[0].id;
    const [leaderRows] = await db.promise().query(
        'SELECT id_user FROM anggota_kelompok WHERE id_kelompok = ? AND id_user = ? LIMIT 1',
        [groupId, groups[0].id_ketua]
    );
    const becomesLeader = !groups[0].id_ketua || !leaderRows.length;
    await db.promise().query(
        'INSERT INTO anggota_kelompok (id_kelompok, id_user, peran) VALUES (?, ?, ?)',
        [groupId, req.account.id, becomesLeader ? 'Ketua kelompok' : 'Anggota']
    );
    if (becomesLeader) {
        await db.promise().query('UPDATE kelompok SET id_ketua = ? WHERE id = ?', [req.account.id, groupId]);
    }
    await db.promise().query(
        'UPDATE kelompok SET jumlah_anggota = (SELECT COUNT(*) FROM anggota_kelompok WHERE id_kelompok = ?) WHERE id = ?',
        [groupId, groupId]
    );
    const [members] = await db.promise().query(
        "SELECT u.id, u.nama, u.nim, a.peran FROM anggota_kelompok a JOIN users u ON u.id = a.id_user WHERE a.id_kelompok = ? ORDER BY (a.peran = 'Ketua kelompok') DESC, a.tanggal_bergabung, u.nama",
        [groupId]
    );
    res.json({ message: 'Berhasil bergabung ke kelompok.', members });
}));

app.post('/api/groups/leave', requireStudent, asyncRoute(async (req, res) => {
    const [memberships] = await db.promise().query(
        'SELECT a.id_kelompok, g.id_ketua FROM anggota_kelompok a JOIN kelompok g ON g.id = a.id_kelompok WHERE a.id_user = ? LIMIT 1',
        [req.account.id]
    );
    if (!memberships.length) {
        return res.status(404).json({ error: 'Anda belum tergabung dalam kelompok.' });
    }

    const groupId = memberships[0].id_kelompok;
    const currentLeaderId = memberships[0].id_ketua;
    await db.promise().query(
        'DELETE FROM anggota_kelompok WHERE id_kelompok = ? AND id_user = ?',
        [groupId, req.account.id]
    );
    const [remaining] = await db.promise().query(
        'SELECT id_user FROM anggota_kelompok WHERE id_kelompok = ? ORDER BY tanggal_bergabung, id_anggota',
        [groupId]
    );
    const leaderStillMember = remaining.some(member => Number(member.id_user) === Number(currentLeaderId));
    const nextLeaderId = leaderStillMember ? currentLeaderId : (remaining[0]?.id_user || null);

    if (!leaderStillMember) {
        await db.promise().query(
            "UPDATE anggota_kelompok SET peran = 'Anggota' WHERE id_kelompok = ?",
            [groupId]
        );
        if (nextLeaderId) {
            await db.promise().query(
                "UPDATE anggota_kelompok SET peran = 'Ketua kelompok' WHERE id_kelompok = ? AND id_user = ?",
                [groupId, nextLeaderId]
            );
        }
    }
    await db.promise().query(
        'UPDATE kelompok SET id_ketua = ?, jumlah_anggota = ? WHERE id = ?',
        [nextLeaderId, remaining.length, groupId]
    );
    res.json({ message: 'Anda sudah keluar dari kelompok.' });
}));

async function taskAssigneeId(groupId, name) {
    const label = String(name || '').trim();
    if (!label) return null;
    const [rows] = await db.promise().query(
        `SELECT u.id FROM users u
         JOIN anggota_kelompok a ON a.id_user = u.id
         WHERE a.id_kelompok = ? AND u.status_aktif = 1
           AND LOWER(TRIM(u.nama)) = LOWER(?)
         ORDER BY u.id LIMIT 2`,
        [groupId, label]
    );
    return rows.length === 1 ? rows[0].id : null;
}

function normalizeTaskInput(input = {}) {
    const judul = String(input.judul || '').trim();
    const deskripsi = String(input.deskripsi || '').trim();
    const penanggungJawab = String(input.penanggung_jawab || '').trim();
    const rawDeadline = String(input.deadline || '').slice(0, 10);
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(rawDeadline) ? rawDeadline : null;
    const status = ['Terjadwal', 'Dikerjakan', 'Selesai'].includes(input.status)
        ? input.status
        : 'Terjadwal';
    const kategori = ['design', 'research', 'writing', 'presentation'].includes(input.category || input.kategori)
        ? (input.category || input.kategori)
        : 'research';
    if (!judul || judul.length > 255 || penanggungJawab.length > 100) {
        throw Object.assign(new Error('Judul tugas wajib diisi dan maksimal 255 karakter.'), { status: 400 });
    }
    return { judul, deskripsi, penanggungJawab, deadline, status, kategori };
}

async function listGroupTasks(groupId) {
    const [rows] = await db.promise().query(
        `SELECT t.id, t.client_key, t.judul, t.deskripsi,
                COALESCE(pic.nama, t.penanggung_jawab, '') AS penanggung_jawab,
                DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline, t.status,
                t.kategori AS category, t.created_at
         FROM tugas t
         LEFT JOIN users pic ON pic.id = t.id_pic
         WHERE t.kelompok_id = ?
         ORDER BY t.created_at DESC, t.id DESC`,
        [groupId]
    );
    return rows;
}

app.post('/api/groups/:groupId/tasks/sync', requireStudentGroup, asyncRoute(async (req, res) => {
    const incoming = Array.isArray(req.body.tasks) ? req.body.tasks : [];
    if (incoming.length > 100) {
        return res.status(400).json({ error: 'Maksimal 100 tugas dapat disinkronkan sekaligus.' });
    }
    for (const item of incoming) {
        const task = normalizeTaskInput(item);
        const clientKey = String(item.clientKey || item.client_key || item.id || '').trim();
        if (!clientKey || clientKey.length > 80) {
            return res.status(400).json({ error: 'Identitas tugas tidak valid.' });
        }
        const assigneeId = await taskAssigneeId(req.groupId, task.penanggungJawab);
        const [matched] = await db.promise().query(
            `SELECT id, client_key FROM tugas
             WHERE kelompok_id = ? AND judul = ? AND deadline <=> ?
             ORDER BY id LIMIT 1`,
            [req.groupId, task.judul, task.deadline]
        );
        if (matched.length) {
            if (!matched[0].client_key) {
                await db.promise().query(
                    'UPDATE tugas SET client_key = ? WHERE id = ?',
                    [clientKey, matched[0].id]
                );
            }
            continue;
        }
        await db.promise().query(
            `INSERT IGNORE INTO tugas
             (kelompok_id, judul, deskripsi, penanggung_jawab, deadline, status,
              id_pembuat, id_pic, kategori, client_key)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.groupId, task.judul, task.deskripsi || null, task.penanggungJawab || null,
                task.deadline, task.status, req.account.id, assigneeId, task.kategori, clientKey]
        );
    }
    res.json(await listGroupTasks(req.groupId));
}));

app.post('/api/groups/:groupId/tasks', requireStudentGroup, asyncRoute(async (req, res) => {
    const task = normalizeTaskInput(req.body);
    const clientKey = String(req.body.clientKey || `task-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`).trim();
    if (clientKey.length > 80) return res.status(400).json({ error: 'Identitas tugas tidak valid.' });
    const assigneeId = await taskAssigneeId(req.groupId, task.penanggungJawab);
    await db.promise().query(
        `INSERT INTO tugas
         (kelompok_id, judul, deskripsi, penanggung_jawab, deadline, status,
          id_pembuat, id_pic, kategori, client_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.groupId, task.judul, task.deskripsi || null, task.penanggungJawab || null,
            task.deadline, task.status, req.account.id, assigneeId, task.kategori, clientKey]
    );
    const [rows] = await db.promise().query(
        `SELECT id, client_key, judul, deskripsi, penanggung_jawab,
                DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline, status,
                kategori AS category, created_at
         FROM tugas WHERE kelompok_id = ? AND client_key = ? LIMIT 1`,
        [req.groupId, clientKey]
    );
    res.status(201).json(rows[0]);
}));

app.put('/api/groups/:groupId/tasks/:taskId', requireStudentGroup, asyncRoute(async (req, res) => {
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId) || taskId < 1) {
        return res.status(400).json({ error: 'Tugas tidak valid.' });
    }
    const task = normalizeTaskInput(req.body);
    const assigneeId = await taskAssigneeId(req.groupId, task.penanggungJawab);
    const [result] = await db.promise().query(
        `UPDATE tugas SET judul = ?, deskripsi = ?, penanggung_jawab = ?, deadline = ?,
                          status = ?, id_pic = ?, kategori = ?
         WHERE id = ? AND kelompok_id = ?`,
        [task.judul, task.deskripsi || null, task.penanggungJawab || null, task.deadline,
            task.status, assigneeId, task.kategori, taskId, req.groupId]
    );
    if (!result.affectedRows) {
        const [existing] = await db.promise().query(
            'SELECT id FROM tugas WHERE id = ? AND kelompok_id = ? LIMIT 1',
            [taskId, req.groupId]
        );
        if (!existing.length) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }
    const [rows] = await db.promise().query(
        `SELECT id, client_key, judul, deskripsi, penanggung_jawab,
                DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline, status,
                kategori AS category, created_at
         FROM tugas WHERE id = ? LIMIT 1`,
        [taskId]
    );
    res.json(rows[0]);
}));

app.delete('/api/groups/:groupId/tasks/:taskId', requireStudentGroup, asyncRoute(async (req, res) => {
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId) || taskId < 1) {
        return res.status(400).json({ error: 'Tugas tidak valid.' });
    }
    const [result] = await db.promise().query(
        'DELETE FROM tugas WHERE id = ? AND kelompok_id = ?',
        [taskId, req.groupId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    res.json({ message: 'Tugas berhasil dihapus.' });
}));

app.get('/api/lecturer/monitoring', requireLecturer, asyncRoute(async (req, res) => {
    const [groups] = await db.promise().query(
        `SELECT g.id, g.nama_kelompok, g.kode_kelompok, g.id_matkul, g.tanggal_dibuat,
                m.kode_matkul, m.nama_matkul,
                COUNT(DISTINCT a.id_user) AS jumlah_anggota
         FROM mata_kuliah m
         JOIN kelompok g ON g.id_matkul = m.id_matkul
         LEFT JOIN anggota_kelompok a ON a.id_kelompok = g.id
         WHERE m.id_dosen = ? AND m.status_aktif = 1 AND g.status_aktif = 1
         GROUP BY g.id, g.nama_kelompok, g.kode_kelompok, g.id_matkul,
                  g.tanggal_dibuat, m.kode_matkul, m.nama_matkul
         ORDER BY m.nama_matkul, g.nama_kelompok`,
        [req.account.id]
    );
    if (!groups.length) return res.json({ groups: [], courseCount: 0 });

    const groupIds = groups.map(group => group.id);
    const [tasks] = await db.promise().query(
        `SELECT t.id, t.kelompok_id, t.client_key, t.judul, t.deskripsi,
                COALESCE(pic.nama, t.penanggung_jawab, '') AS penanggung_jawab,
                DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline, t.status,
                t.kategori AS category, t.created_at
         FROM tugas t
         LEFT JOIN users pic ON pic.id = t.id_pic
         WHERE t.kelompok_id IN (?)
         ORDER BY t.deadline, t.id`,
        [groupIds]
    );
    const [members] = await db.promise().query(
        `SELECT a.id_kelompok, u.id, u.nama, u.nim, a.peran
         FROM anggota_kelompok a JOIN users u ON u.id = a.id_user
         WHERE a.id_kelompok IN (?)
         ORDER BY a.id_kelompok, (a.peran = 'Ketua kelompok') DESC, a.tanggal_bergabung, u.nama`,
        [groupIds]
    );
    const [notes] = await db.promise().query(
        `SELECT n.id_catatan AS id, n.id_kelompok, n.isi, n.waktu, u.nama AS dosen
         FROM catatan_dosen n JOIN users u ON u.id = n.id_dosen
         WHERE n.id_kelompok IN (?)
         ORDER BY n.waktu DESC`,
        [groupIds]
    );
    const groupsWithData = groups.map(group => ({
        ...group,
        tasks: tasks.filter(task => Number(task.kelompok_id) === Number(group.id)),
        members: members.filter(member => Number(member.id_kelompok) === Number(group.id)),
        notes: notes.filter(note => Number(note.id_kelompok) === Number(group.id))
    }));
    res.json({
        groups: groupsWithData,
        courseCount: new Set(groups.map(group => Number(group.id_matkul))).size
    });
}));

app.post('/api/lecturer/groups/:groupId/notes', requireLecturer, asyncRoute(async (req, res) => {
    const groupId = Number(req.params.groupId);
    const isi = String(req.body.isi || '').trim();
    if (!Number.isInteger(groupId) || groupId < 1 || !isi) {
        return res.status(400).json({ error: 'Kelompok dan isi catatan wajib dipilih.' });
    }
    if (isi.length > 5000) return res.status(400).json({ error: 'Catatan maksimal 5.000 karakter.' });
    const [assignedGroups] = await db.promise().query(
        `SELECT g.id FROM kelompok g JOIN mata_kuliah m ON m.id_matkul = g.id_matkul
         WHERE g.id = ? AND g.status_aktif = 1 AND m.status_aktif = 1 AND m.id_dosen = ? LIMIT 1`,
        [groupId, req.account.id]
    );
    if (!assignedGroups.length) {
        return res.status(403).json({ error: 'Kelompok ini tidak terhubung ke mata kuliah yang Anda ampu.' });
    }
    const [result] = await db.promise().query(
        'INSERT INTO catatan_dosen (id_kelompok, id_dosen, isi) VALUES (?, ?, ?)',
        [groupId, req.account.id, isi]
    );
    res.status(201).json({
        id: result.insertId,
        id_kelompok: groupId,
        isi,
        dosen: req.account.nama,
        waktu: new Date().toISOString()
    });
}));

app.get('/api/admin/users', requireAdmin, asyncRoute(async (req, res) => {
    const [rows] = await db.promise().query(
        'SELECT id, nama, email, role, status_aktif AS aktif FROM users ORDER BY nama'
    );
    res.json(rows.map(row => ({
        ...row,
        userId: row.id,
        id: row.email,
        role: row.role || 'Mahasiswa',
        aktif: Boolean(Number(row.aktif))
    })));
}));

app.post('/api/admin/users', requireAdmin, asyncRoute(async (req, res) => {
    const nama = String(req.body.nama || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'Mahasiswa');
    if (!nama || !email || password.length < 6 || !allowedRoles.includes(role)) {
        return res.status(400).json({
            error: 'Nama, email, role, dan kata sandi minimal 6 karakter wajib diisi.'
        });
    }
    const [existingUsers] = await db.promise().query(
        'SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1',
        [email]
    );
    if (existingUsers.length) {
        return res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
    }

    await db.promise().query(
        'INSERT INTO users (nama, email, password, role, status_aktif, aktif) VALUES (?, ?, ?, ?, 1, 1)',
        [nama, email, hashPassword(password), role]
    );
    res.status(201).json({ message: 'Pengguna berhasil ditambahkan.' });
}));

app.put('/api/admin/users/:email', requireAdmin, asyncRoute(async (req, res) => {
    const previousEmail = String(req.params.email || '').trim().toLowerCase();
    const nama = String(req.body.nama || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'Mahasiswa');
    if (!nama || !email || !allowedRoles.includes(role) || (password && password.length < 6)) {
        return res.status(400).json({ error: 'Data pengguna tidak valid.' });
    }
    const [duplicateUsers] = await db.promise().query(
        `SELECT email FROM users
         WHERE LOWER(email) = ? AND LOWER(email) <> ?
         LIMIT 1`,
        [email, previousEmail]
    );
    if (duplicateUsers.length) {
        return res.status(409).json({ error: 'Email tersebut sudah digunakan.' });
    }
    if (previousEmail === req.auth.email.toLowerCase() &&
        (email !== previousEmail || role !== 'Admin')) {
        return res.status(400).json({
            error: 'Akun Admin yang sedang digunakan tidak dapat diganti email atau rolenya.'
        });
    }

    const [existing] = await db.promise().query(
        'SELECT email FROM users WHERE email = ? LIMIT 1',
        [req.params.email]
    );
    if (!existing.length) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    await db.promise().query(
        `UPDATE users
         SET nama = ?, email = ?, role = ?,
             password = COALESCE(NULLIF(?, ''), password)
         WHERE email = ?`,
        [
            nama,
            email,
            role,
            password ? hashPassword(password) : null,
            req.params.email
        ]
    );
    res.json({ message: 'Data pengguna berhasil diperbarui.' });
}));

app.patch('/api/admin/users/:email/status', requireAdmin, asyncRoute(async (req, res) => {
    const email = String(req.params.email || '').trim().toLowerCase();
    const aktif = Boolean(req.body.aktif);
    if (email === req.auth.email.toLowerCase() && !aktif) {
        return res.status(400).json({
            error: 'Akun Admin yang sedang digunakan tidak dapat dinonaktifkan.'
        });
    }
    const [result] = await db.promise().query(
        'UPDATE users SET status_aktif = ?, aktif = ? WHERE email = ?',
        [aktif ? 1 : 0, aktif ? 1 : 0, req.params.email]
    );
    if (!result.affectedRows) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    res.json({ message: 'Status pengguna berhasil diperbarui.' });
}));

async function resolveLecturer(dosen) {
    const label = String(dosen || '').trim();
    if (!label) return { id: null, label: null };
    if (/^\d+$/.test(label)) {
        const [accounts] = await db.promise().query(
            "SELECT id FROM users WHERE id = ? AND role = 'Dosen' AND status_aktif = 1 LIMIT 1",
            [Number(label)]
        );
        if (!accounts.length) {
            throw Object.assign(
                new Error('Akun Dosen yang dipilih tidak aktif atau tidak ditemukan.'),
                { status: 400 }
            );
        }
        return { id: accounts[0].id, label: null };
    }
    const [rows] = await db.promise().query(
        `SELECT id FROM users
         WHERE role = 'Dosen' AND status_aktif = 1
           AND LOWER(TRIM(nama)) = LOWER(?)
         ORDER BY id LIMIT 2`,
        [label]
    );
    return rows.length === 1
        ? { id: rows[0].id, label: null }
        : { id: null, label };
}

async function resolveCourseId(value) {
    const label = String(value || '').trim();
    if (!label) return null;
    const codeOrName = label.split('/')[0].trim();
    const [rows] = await db.promise().query(
        `SELECT id_matkul FROM mata_kuliah
         WHERE status_aktif = 1
           AND (LOWER(kode_matkul) = LOWER(?) OR LOWER(nama_matkul) = LOWER(?))
         ORDER BY (LOWER(kode_matkul) = LOWER(?)) DESC
         LIMIT 1`,
        [codeOrName, label, codeOrName]
    );
    if (!rows.length) {
        throw Object.assign(
            new Error('Mata kuliah belum terdaftar atau sedang nonaktif.'),
            { status: 400 }
        );
    }
    return rows[0].id_matkul;
}

app.get('/api/admin/courses', requireAdmin, asyncRoute(async (req, res) => {
    const [rows] = await db.promise().query(
        `SELECT m.id_matkul AS id, m.kode_matkul AS kode,
                m.nama_matkul AS nama, m.id_dosen,
                COALESCE(u.nama, m.dosen_label, '') AS dosen,
                m.status_aktif AS aktif
         FROM mata_kuliah m
         LEFT JOIN users u ON u.id = m.id_dosen
         ORDER BY m.nama_matkul`
    );
    res.json(rows.map(row => ({ ...row, aktif: Boolean(Number(row.aktif)) })));
}));

app.post('/api/admin/courses', requireAdmin, asyncRoute(async (req, res) => {
    const kode = String(req.body.kode || '').trim().toUpperCase();
    const nama = String(req.body.nama || '').trim();
    const dosen = await resolveLecturer(req.body.dosen);
    if (!kode || !nama) {
        return res.status(400).json({ error: 'Nama dan kode mata kuliah wajib diisi.' });
    }
    const [result] = await db.promise().query(
        `INSERT INTO mata_kuliah
         (kode_matkul, nama_matkul, id_dosen, dosen_label, status_aktif)
         VALUES (?, ?, ?, ?, 1)`,
        [kode, nama, dosen.id, dosen.label]
    );
    res.status(201).json({ id: result.insertId, message: 'Mata kuliah berhasil ditambahkan.' });
}));

app.put('/api/admin/courses/:id', requireAdmin, asyncRoute(async (req, res) => {
    const kode = String(req.body.kode || '').trim().toUpperCase();
    const nama = String(req.body.nama || '').trim();
    const dosen = await resolveLecturer(req.body.dosen);
    if (!kode || !nama) {
        return res.status(400).json({ error: 'Nama dan kode mata kuliah wajib diisi.' });
    }
    const [result] = await db.promise().query(
        `UPDATE mata_kuliah
         SET kode_matkul = ?, nama_matkul = ?, id_dosen = ?, dosen_label = ?
         WHERE id_matkul = ?`,
        [kode, nama, dosen.id, dosen.label, req.params.id]
    );
    if (!result.affectedRows) {
        const [existing] = await db.promise().query(
            'SELECT id_matkul FROM mata_kuliah WHERE id_matkul = ? LIMIT 1',
            [req.params.id]
        );
        if (!existing.length) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
    }
    res.json({ message: 'Mata kuliah berhasil diperbarui.' });
}));

app.patch('/api/admin/courses/:id/status', requireAdmin, asyncRoute(async (req, res) => {
    const [result] = await db.promise().query(
        'UPDATE mata_kuliah SET status_aktif = ? WHERE id_matkul = ?',
        [req.body.aktif ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) {
        const [existing] = await db.promise().query(
            'SELECT id_matkul FROM mata_kuliah WHERE id_matkul = ? LIMIT 1',
            [req.params.id]
        );
        if (!existing.length) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
    }
    res.json({ message: 'Status mata kuliah berhasil diperbarui.' });
}));

app.get('/api/admin/groups', requireAdmin, asyncRoute(async (req, res) => {
    const [rows] = await db.promise().query(
        `SELECT g.id, g.nama_kelompok AS nama, g.kode_kelompok AS kode,
                CONCAT(m.kode_matkul, ' / ', m.nama_matkul) AS mataKuliah,
                GREATEST(g.jumlah_anggota, COUNT(DISTINCT a.id_user)) AS anggota,
                g.status_aktif AS aktif
         FROM kelompok g
         LEFT JOIN mata_kuliah m ON m.id_matkul = g.id_matkul
         LEFT JOIN anggota_kelompok a ON a.id_kelompok = g.id
         GROUP BY g.id, g.nama_kelompok, g.kode_kelompok, m.kode_matkul,
                  m.nama_matkul, g.jumlah_anggota, g.status_aktif
         ORDER BY g.nama_kelompok`
    );
    res.json(rows.map(row => ({ ...row, aktif: Boolean(Number(row.aktif)) })));
}));

app.post('/api/admin/groups', requireAdmin, asyncRoute(async (req, res) => {
    const nama = String(req.body.nama || '').trim();
    const kode = String(req.body.kode || `TS-${Date.now().toString().slice(-6)}`)
        .trim()
        .toUpperCase();
    const mataKuliahId = await resolveCourseId(req.body.mataKuliah);
    const anggota = Math.max(0, Number(req.body.anggota) || 0);
    if (!nama) return res.status(400).json({ error: 'Nama kelompok wajib diisi.' });
    const [result] = await db.promise().query(
        `INSERT INTO kelompok
         (nama_kelompok, kode_kelompok, id_matkul, jumlah_anggota, status_aktif)
         VALUES (?, ?, ?, ?, 1)`,
        [nama, kode, mataKuliahId, anggota]
    );
    res.status(201).json({ id: result.insertId, message: 'Kelompok berhasil ditambahkan.' });
}));

app.put('/api/admin/groups/:id', requireAdmin, asyncRoute(async (req, res) => {
    const nama = String(req.body.nama || '').trim();
    const kode = String(req.body.kode || '').trim().toUpperCase();
    const mataKuliahId = await resolveCourseId(req.body.mataKuliah);
    const anggota = Math.max(0, Number(req.body.anggota) || 0);
    if (!nama || !kode) {
        return res.status(400).json({ error: 'Nama dan kode kelompok wajib diisi.' });
    }
    const [result] = await db.promise().query(
        `UPDATE kelompok
         SET nama_kelompok = ?, kode_kelompok = ?, id_matkul = ?, jumlah_anggota = ?
         WHERE id = ?`,
        [nama, kode, mataKuliahId, anggota, req.params.id]
    );
    if (!result.affectedRows) {
        const [existing] = await db.promise().query(
            'SELECT id FROM kelompok WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (!existing.length) return res.status(404).json({ error: 'Kelompok tidak ditemukan.' });
    }
    res.json({ message: 'Kelompok berhasil diperbarui.' });
}));

app.patch('/api/admin/groups/:id/status', requireAdmin, asyncRoute(async (req, res) => {
    const [result] = await db.promise().query(
        'UPDATE kelompok SET status_aktif = ? WHERE id = ?',
        [req.body.aktif ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) {
        const [existing] = await db.promise().query(
            'SELECT id FROM kelompok WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (!existing.length) return res.status(404).json({ error: 'Kelompok tidak ditemukan.' });
    }
    res.json({ message: 'Status kelompok berhasil diperbarui.' });
}));
// Route: Ambil Semua Tugas
app.get('/api/tugas', requireStudent, asyncRoute(async (req, res) => {
    const [rows] = await db.promise().query(
        `SELECT t.*, u.nama AS nama_pic
         FROM tugas t
         JOIN anggota_kelompok a ON a.id_kelompok = t.kelompok_id AND a.id_user = ?
         LEFT JOIN users u ON u.id = t.id_pic
         ORDER BY t.deadline, t.id`,
        [req.account.id]
    );
    res.json(rows.map(row => ({
        ...row,
        penanggung_jawab: row.nama_pic || row.penanggung_jawab || ''
    })));
}));

app.post('/api/tugas', requireStudent, asyncRoute(async (req, res) => {
    const judul = String(req.body.judul || '').trim();
    const deskripsi = String(req.body.deskripsi || '').trim();
    const penanggungJawab = String(req.body.penanggung_jawab || '').trim();
    const deadline = req.body.deadline || null;
    if (!judul) return res.status(400).json({ error: 'Judul tugas wajib diisi.' });
    const [memberships] = await db.promise().query(
        'SELECT id_kelompok FROM anggota_kelompok WHERE id_user = ? LIMIT 1',
        [req.account.id]
    );
    if (!memberships.length) {
        return res.status(403).json({ error: 'Bergabung ke kelompok sebelum menambahkan tugas.' });
    }
    const groupId = memberships[0].id_kelompok;

    let idPic = null;
    if (penanggungJawab) {
        const [assignees] = await db.promise().query(
            `SELECT u.id FROM users u
             JOIN anggota_kelompok a ON a.id_user = u.id AND a.id_kelompok = ?
             WHERE u.status_aktif = 1 AND LOWER(TRIM(u.nama)) = LOWER(?)
             ORDER BY u.id LIMIT 2`,
            [groupId, penanggungJawab]
        );
        if (assignees.length === 1) idPic = assignees[0].id;
    }

    const [result] = await db.promise().query(
        `INSERT INTO tugas
         (kelompok_id, judul, deskripsi, penanggung_jawab, deadline, id_pembuat, id_pic)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [groupId, judul, deskripsi, penanggungJawab || null, deadline, req.account.id, idPic]
    );
    res.status(201).json({ message: 'Tugas berhasil ditambahkan.', id: result.insertId });
}));
app.use((error, req, res, next) => {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'Email atau kode tersebut sudah terdaftar.'
        });
    }
    console.error(error);
    res.status(500).json({
        error: 'Terjadi kesalahan pada server atau database.'
    });
});

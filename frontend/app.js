const { createApp } = Vue;
const API_BASE_URL =  window.location.origin;

async function requestApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = localStorage.getItem("teamsync-token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Permintaan ke server gagal.");
  }

  return payload;
}

const seedTasks = [
  {
    id: "t1",
    judul: "Analisis kebutuhan sistem",
    deskripsi:
      "Merangkum masalah koordinasi kelompok dan menyusun kebutuhan fungsional Teamsync.",
    penanggung_jawab: "Azmi Noval",
    deadline: "2026-10-28",
    status: "Selesai",
    category: "research",
    categoryLabel: "Riset",
    documentLink: "",
    submissionLink: "",
    submittedAt: "",
    comments: [
      {
        id: "c1",
        author: "Fitri Susanti",
        text: "Analisisnya sudah aku baca, poin kebutuhan utamanya sudah masuk.",
        createdAt: "2026-10-26T14:20:00",
      },
    ],
    createdAt: "2026-10-20T10:00:00",
  },
  {
    id: "t2",
    judul: "Rancangan antarmuka Teamsync",
    deskripsi:
      "Menyusun wireframe untuk dashboard, halaman kelompok, dan detail tugas.",
    penanggung_jawab: "Fitri Susanti",
    deadline: "2026-10-29",
    status: "Dikerjakan",
    category: "design",
    categoryLabel: "Perancangan",
    documentLink: "",
    submissionLink: "",
    submittedAt: "",
    comments: [
      {
        id: "c2",
        author: "Azmi Noval",
        text: "Untuk dashboard, kita tampilkan deadline terdekat di bagian kanan ya.",
        createdAt: "2026-10-27T08:15:00",
      },
      {
        id: "c3",
        author: "Fitri Susanti",
        text: "Siap, aku lanjutkan revisinya pagi ini.",
        createdAt: "2026-10-27T09:05:00",
      },
    ],
    createdAt: "2026-10-22T10:00:00",
  },
  {
    id: "t3",
    judul: "Dokumentasi rancangan sistem",
    deskripsi:
      "Mendokumentasikan alur kerja, struktur data, dan rancangan sistem pada laporan kemajuan.",
    penanggung_jawab: "Wahyu Hidayatullah",
    deadline: "2026-10-30",
    status: "Dikerjakan",
    category: "writing",
    categoryLabel: "Dokumentasi",
    documentLink: "",
    submissionLink: "",
    submittedAt: "",
    comments: [],
    createdAt: "2026-10-22T10:00:00",
  },
  {
    id: "t4",
    judul: "Menyusun ERD dan basis data",
    deskripsi:
      "Memetakan data pengguna, kelompok, tugas, diskusi, dan pengumpulan hasil.",
    penanggung_jawab: "M. Syaiful Munir",
    deadline: "2026-11-02",
    status: "Terjadwal",
    category: "design",
    categoryLabel: "Perancangan",
    documentLink: "",
    submissionLink: "",
    submittedAt: "",
    comments: [],
    createdAt: "2026-10-23T10:00:00",
  },
  {
    id: "t5",
    judul: "Materi presentasi capstone",
    deskripsi:
      "Mempersiapkan alur presentasi dan bahan demo aplikasi Teamsync.",
    penanggung_jawab: "Rizky Widi Prasetya",
    deadline: "2026-11-05",
    status: "Terjadwal",
    category: "presentation",
    categoryLabel: "Presentasi",
    documentLink: "",
    submissionLink: "",
    submittedAt: "",
    comments: [],
    createdAt: "2026-10-24T10:00:00",
  },
  {
    id: "t6",
    judul: "Pengumpulan referensi penelitian",
    deskripsi:
      "Mengumpulkan dan merapikan referensi penelitian terdahulu untuk tinjauan pustaka.",
    penanggung_jawab: "Fitri Susanti",
    deadline: "2026-10-25",
    status: "Selesai",
    category: "research",
    categoryLabel: "Riset",
    documentLink: "",
    submissionLink: "",
    submittedAt: "",
    comments: [],
    createdAt: "2026-10-18T10:00:00",
  },
];

const seedMembers = [
  {
    nama: "Azmi Noval",
    nim: "049153619",
    peran: "Ketua kelompok",
    color: "avatar-gold",
  },
  {
    nama: "Fitri Susanti",
    nim: "052004142",
    peran: "Anggota",
    color: "avatar-lilac",
  },
  {
    nama: "M. Syaiful Munir",
    nim: "049924184",
    peran: "Anggota",
    color: "avatar-blue",
  },
  {
    nama: "Rizky Widi Prasetya",
    nim: "049677916",
    peran: "Anggota",
    color: "avatar-green",
  },
  {
    nama: "Wahyu Hidayatullah",
    nim: "050564379",
    peran: "Anggota",
    color: "avatar-coral",
  },
];

const seedAnnouncements = [
  {
    id: "a1",
    judul: "Penyusunan laporan kemajuan",
    isi: "Mohon periksa kembali bagian metodologi dan rancangan sistem sebelum pertemuan kelompok berikutnya. Jika ada revisi, tulis langsung di dokumen bersama agar mudah ditinjau.",
    penulis: "Azmi Noval",
    peran: "Ketua kelompok",
    createdAt: "2026-10-27T08:00:00",
  },
];
const seedActivities = [
  {
    id: "act1",
    type: "comment",
    icon: "↗",
    title: "Fitri Susanti menambahkan komentar",
    description:
      "“Siap, aku lanjutkan revisinya pagi ini.” pada Rancangan antarmuka Teamsync",
    author: "27 Okt 2026 · 09.05",
    time: "2026-10-27T09:05:00",
  },
  {
    id: "act2",
    type: "task",
    icon: "▤",
    title: "Status tugas diperbarui",
    description: "Analisis kebutuhan sistem ditandai selesai.",
    author: "Azmi Noval",
    time: "2026-10-26T15:30:00",
  },
  {
    id: "act3",
    type: "announce",
    icon: "✦",
    title: "Pengumuman baru diterbitkan",
    description: "Penyusunan laporan kemajuan",
    author: "Azmi Noval",
    time: "2026-10-27T08:00:00",
  },
  {
    id: "act4",
    type: "task",
    icon: "+",
    title: "Tugas baru ditambahkan",
    description: "Materi presentasi capstone",
    author: "Rizky Widi Prasetya",
    time: "2026-10-24T14:10:00",
  },
];

function loadStore(key = "teamsync-data") {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function emptyWorkspace() {
  return { tasks: [], announcements: [], activities: [], groupLink: "", lecturerNotes: [] };
}

function loadSession() {
  try {
    const session = JSON.parse(
      localStorage.getItem("teamsync-session") || "null",
    );
    return session && session.email && session.role ? session : null;
  } catch {
    return null;
  }
}

createApp({
  data() {
    const saved = loadStore();
    const session = loadSession();
    return {
      authPage: "landing",
      authRole: "Mahasiswa",
      isLoggedIn: Boolean(session),
      user: session,
      currentView:
        session?.role === "Admin"
          ? "admin-dashboard"
          : session?.role === "Dosen"
            ? "lecturer"
            : "overview",
      mobileMenuOpen: false,
      loginForm: { email: "", password: "" },
      registerForm: { nama: "", email: "", password: "" },
      tasks: session?.role === "Dosen" || session?.role === "Mahasiswa"
        ? []
        : saved.tasks || structuredClone(seedTasks),
      members: [],
      lecturerNotes: [],
      group: null,
      groupCourses: [],
      groupModalMode: "choose",
      groupCodeInput: "",
      groupForm: { nama: "", id_matkul: "" },
      announcements: session?.role === "Dosen" || session?.role === "Mahasiswa"
        ? []
        : saved.announcements || structuredClone(seedAnnouncements),
      activities: session?.role === "Dosen" || session?.role === "Mahasiswa"
        ? []
        : saved.activities || structuredClone(seedActivities),
      lecturerGroups: [],
      lecturerCourseCount: 0,
      selectedLecturerGroupId: null,
      lecturerLoading: false,
      adminUsers: [],
      adminCourses: [],
      adminGroups: [],
      adminModalOpen: false,
      adminModalType: "user",
      adminEditingId: null,
      adminForm: {
        nama: "",
        email: "",
        password: "",
        role: "Mahasiswa",
        kode: "",
        dosen: "",
        mataKuliah: "",
        anggota: 0,
      },
      groupLink: session?.role === "Mahasiswa" ? "" : saved.groupLink || "",
      taskFilters: ["Semua", "Terjadwal", "Dikerjakan", "Selesai"],
      taskFilter: "Semua",
      sortTasksBy: "deadline",
      searchQuery: "",
      taskModalOpen: false,
      editingTaskId: null,
      taskForm: {
        judul: "",
        deskripsi: "",
        penanggung_jawab: "",
        deadline: "",
        status: "Terjadwal",
        category: "research",
        documentLink: "",
      },
      detailTaskId: null,
      submissionInput: "",
      commentInput: "",
      taskMenuId: null,
      announcementModalOpen: false,
      announcementForm: { judul: "", isi: "" },
      groupModalOpen: false,
      groupLinkModalOpen: false,
      savingGroupLink: false,
      groupLinkInput: "",
      feedbackModalOpen: false,
      feedbackInput: "",
      notificationsOpen: false,
      profileOpen: false,
      toast: null,
      toastTimer: null,
      mainNav: [
        {
          id: "admin-dashboard",
          icon: "A",
          label: "Dashboard Admin",
          role: "Admin",
        },
        {
          id: "admin-users",
          icon: "U",
          label: "Kelola pengguna",
          role: "Admin",
        },
        {
          id: "admin-courses",
          icon: "M",
          label: "Mata kuliah",
          role: "Admin",
        },
        {
          id: "admin-groups",
          icon: "K",
          label: "Kelola kelompok",
          role: "Admin",
        },
        { id: "overview", icon: "⌂", label: "Ringkasan" },
        { id: "tasks", icon: "▤", label: "Semua tugas" },
        { id: "announcements", icon: "✦", label: "Pengumuman" },
        { id: "activity", icon: "◷", label: "Aktivitas" },
        { id: "group", icon: "♧", label: "Anggota kelompok" },
        { id: "lecturer", icon: "◈", label: "Pemantauan dosen", role: "Dosen" },
      ],
    };
  },
  computed: {
    pageTitle() {
      return (
        {
          overview: "Ringkasan",
          tasks: "Semua tugas",
          group: "Anggota kelompok",
          announcements: "Pengumuman",
          activity: "Aktivitas",
          lecturer: "Pemantauan dosen",
          "admin-dashboard": "Dashboard Admin",
          "admin-users": "Kelola pengguna",
          "admin-courses": "Mata kuliah",
          "admin-groups": "Kelola kelompok",
        }[this.currentView] || "Ringkasan"
      );
    },
    authEyebrow() {
      return this.authPage === "login"
        ? `MASUK SEBAGAI ${this.authRole.toUpperCase()}`
        : `REGISTRASI ${this.authRole.toUpperCase()}`;
    },
    authTitle() {
      if (this.authPage === "login") {
        return this.authRole === "Mahasiswa" ? "Masuk ke Teamsync" : `Masuk ${this.authRole}`;
      }
      return this.authRole === "Mahasiswa" ? "Buat akun Mahasiswa" : "Registrasi Dosen";
    },
    authDescription() {
      if (this.authRole === "Admin") {
        return "Masuk dengan akun Admin yang sudah disediakan. Registrasi Admin tidak tersedia.";
      }
      if (this.authRole === "Dosen") {
        return this.authPage === "login"
          ? "Masuk dengan akun Dosen Anda atau daftar untuk membuat akun."
          : "Buat akun Dosen untuk mengakses pemantauan kelompok.";
      }
      return this.authPage === "login"
        ? "Masuk untuk melanjutkan pekerjaan bersama kelompok Anda."
        : "Buat akun Mahasiswa untuk mulai berkolaborasi.";
    },
    authSubmitLabel() {
      return this.authPage === "login" ? "Masuk ke akun" : "Daftar sekarang";
    },
    authPrompt() {
      return this.authPage === "login"
        ? `Belum punya akun ${this.authRole}?`
        : "Sudah terdaftar?";
    },
    authSwitchLabel() {
      return this.authPage === "login" ? "Daftar" : "Masuk";
    },
    showAuthSwitch() {
      return this.authRole !== "Admin";
    },
    visibleNav() {
      return this.mainNav.filter((item) => {
        if (this.user?.role === "Admin") return item.role === "Admin";
        if (this.user?.role === "Dosen") return item.role === "Dosen";
        return !item.role || item.role === "Mahasiswa";
      });
    },
    adminLecturers() {
      return this.adminUsers.filter((account) => account.role === "Dosen" && account.aktif);
    },
    adminLecturerIds() {
      return this.adminLecturers.map((lecturer) => String(lecturer.userId));
    },
    selectedLecturerGroup() {
      return this.lecturerGroups.find(
        (group) => Number(group.id) === Number(this.selectedLecturerGroupId),
      ) || null;
    },
    lecturerSelectedTasks() {
      return this.selectedLecturerGroup?.tasks || [];
    },
    lecturerCompletedCount() {
      return this.lecturerSelectedTasks.filter((task) => task.status === "Selesai").length;
    },
    lecturerProgress() {
      return this.lecturerSelectedTasks.length
        ? Math.round((this.lecturerCompletedCount / this.lecturerSelectedTasks.length) * 100)
        : 0;
    },
    lecturerTotalTasks() {
      return this.lecturerGroups.reduce((total, group) => total + group.tasks.length, 0);
    },
    lecturerClassProgress() {
      const groupsWithTasks = this.lecturerGroups.filter((group) => group.tasks.length);
      if (!groupsWithTasks.length) return 0;
      return Math.round(groupsWithTasks.reduce((total, group) => {
        const completed = group.tasks.filter((task) => task.status === "Selesai").length;
        return total + (completed / group.tasks.length) * 100;
      }, 0) / groupsWithTasks.length);
    },
    adminStats() {
      return {
        users: this.adminUsers.filter((item) => item.aktif).length,
        courses: this.adminCourses.filter((item) => item.aktif).length,
        groups: this.adminGroups.filter((item) => item.aktif).length,
        tasks: this.tasks.length,
      };
    },
    greeting() {
      const h = new Date().getHours();
      return h < 11
        ? "SELAMAT PAGI"
        : h < 15
          ? "SELAMAT SIANG"
          : h < 19
            ? "SELAMAT SORE"
            : "SELAMAT MALAM";
    },
    completedCount() {
      return this.tasks.filter((t) => t.status === "Selesai").length;
    },
    inProgressCount() {
      return this.tasks.filter((t) => t.status === "Dikerjakan").length;
    },
    todoCount() {
      return this.tasks.filter((t) => t.status === "Terjadwal").length;
    },
    groupProgress() {
      return this.tasks.length
        ? Math.round((this.completedCount / this.tasks.length) * 100)
        : 0;
    },
    overdueCount() {
      return this.tasks.filter(
        (t) => t.status !== "Selesai" && this.dayDifference(t.deadline) < 0,
      ).length;
    },
    upcomingTasks() {
      return this.tasks
        .filter(
          (t) =>
            t.status !== "Selesai" &&
            this.dayDifference(t.deadline) >= 0 &&
            this.dayDifference(t.deadline) <= 7,
        )
        .sort((a, b) => a.deadline.localeCompare(b.deadline));
    },
    upcomingCount() {
      return this.upcomingTasks.length;
    },
    submittedCount() {
      return this.tasks.filter((t) => t.submissionLink).length;
    },
    detailTask() {
      return this.tasks.find((t) => t.id === this.detailTaskId) || null;
    },
    filteredTasks() {
      const q = this.searchQuery.toLocaleLowerCase("id");
      return this.tasks.filter(
        (t) =>
          !q ||
          `${t.judul} ${t.deskripsi} ${t.penanggung_jawab}`
            .toLocaleLowerCase("id")
            .includes(q),
      );
    },
    taskViewList() {
      const list = this.filteredTasks.filter(
        (t) => this.taskFilter === "Semua" || t.status === this.taskFilter,
      );
      return list.sort((a, b) =>
        this.sortTasksBy === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : this.sortTasksBy === "title"
            ? a.judul.localeCompare(b.judul, "id")
            : a.deadline.localeCompare(b.deadline),
      );
    },
    activityFeed() {
      return [...this.activities].sort((a, b) => b.time.localeCompare(a.time));
    },
  },
  watch: {
    tasks: {
      deep: true,
      handler() {
        this.persist();
      },
    },
    announcements: {
      deep: true,
      handler() {
        this.persist();
      },
    },
    activities: {
      deep: true,
      handler() {
        this.persist();
      },
    },
    groupLink() {
      this.persist();
    },
  },
  mounted() {
    if (this.user && !localStorage.getItem("teamsync-token")) {
      this.logout();
      return;
    }
    if (this.user?.role === "Admin") this.loadAdminData();
    else if (this.user?.role === "Mahasiswa" && localStorage.getItem("teamsync-token")) this.loadGroupData();
    else if (this.user?.role === "Dosen" && localStorage.getItem("teamsync-token")) this.loadLecturerData();
  },
  methods: {
    openAuth(role, page = "login") {
      this.authRole = role;
      this.authPage = role === "Admin" ? "login" : page;
      this.loginForm = { email: "", password: "" };
      this.registerForm = { nama: "", email: "", password: "" };
      this.toast = null;
    },
    selectAuthRole(role) {
      this.authRole = role;
      if (role === "Admin") this.authPage = "login";
      this.loginForm = { email: "", password: "" };
      this.registerForm = { nama: "", email: "", password: "" };
      this.toast = null;
    },
    switchAuthMode() {
      if (this.authRole === "Admin") return;
      this.authPage = this.authPage === "login" ? "register" : "login";
      this.toast = null;
    },
    persist() {
      const storageKey = this.user?.role === "Mahasiswa"
        ? (this.group?.id ? `teamsync-group-data:${this.group.id}` : null)
        : this.user?.role === "Admin" ? "teamsync-data" : null;
      if (!storageKey) return;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          tasks: this.tasks,
          announcements: this.announcements,
          activities: this.activities,
          groupLink: this.groupLink,
        }),
      );
    },
    blankTaskForm() {
      return {
        judul: "",
        deskripsi: "",
        penanggung_jawab: "",
        deadline: "",
        status: "Terjadwal",
        category: "research",
        documentLink: "",
      };
    },
    initials(name = "") {
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    },
    async loadGroupData() {
      if (!localStorage.getItem("teamsync-token") || this.user?.role !== "Mahasiswa") {
        this.group = null;
        this.members = [];
        Object.assign(this, emptyWorkspace());
        return;
      }
      try {
        const result = await requestApi("/api/groups/me");
        this.group = result.group;
        this.members = (result.members || []).map((member, index) => ({
          ...member,
          color: ["avatar-gold", "avatar-lilac", "avatar-blue", "avatar-green", "avatar-coral"][index % 5],
        }));
        this.lecturerNotes = result.lecturerNotes || [];
        if (!this.group) {
          Object.assign(this, emptyWorkspace());
          return;
        }

        const storageKey = `teamsync-group-data:${this.group.id}`;
        const hasSavedWorkspace = Boolean(localStorage.getItem(storageKey));
        const savedWorkspace = loadStore(storageKey);
        let initialWorkspace = emptyWorkspace();
        if (hasSavedWorkspace) {
          initialWorkspace = {
            tasks: Array.isArray(savedWorkspace.tasks) ? savedWorkspace.tasks : [],
            announcements: Array.isArray(savedWorkspace.announcements) ? savedWorkspace.announcements : [],
            activities: Array.isArray(savedWorkspace.activities) ? savedWorkspace.activities : [],
            groupLink: savedWorkspace.groupLink || "",
          };
        } else if (this.group.kode_kelompok === "TS-B51-2026") {
          const legacyWorkspace = loadStore();
          initialWorkspace = {
            tasks: legacyWorkspace.tasks || structuredClone(seedTasks),
            announcements: legacyWorkspace.announcements || structuredClone(seedAnnouncements),
            activities: legacyWorkspace.activities || structuredClone(seedActivities),
            groupLink: legacyWorkspace.groupLink || "",
          };
        }
        initialWorkspace.groupLink = this.group.tautan_dokumen || "";
        Object.assign(this, initialWorkspace);
        localStorage.setItem(storageKey, JSON.stringify(initialWorkspace));
        try {
          await this.syncGroupTasks(initialWorkspace.tasks);
        } catch (error) {
          this.showToast(`Tugas belum tersinkron ke server: ${error.message}`, "error");
        }
      } catch (error) {
        this.group = null;
        this.members = [];
        Object.assign(this, emptyWorkspace());
        this.showToast(error.message, "error");
      }
    },
    mapTaskRecords(rows, localTasks = []) {
      const localByKey = new Map(
        localTasks.map((task) => [String(task.clientKey || task.id), task]),
      );
      const categoryLabels = {
        design: "Perancangan",
        research: "Riset",
        writing: "Dokumentasi",
        presentation: "Presentasi",
      };
      return rows.map((row) => {
        const clientKey = String(row.client_key || `db:${row.id}`);
        const localTask = localByKey.get(clientKey) || {};
        const createdAt = row.created_at ? new Date(row.created_at).toISOString() : localTask.createdAt || new Date().toISOString();
        return {
          ...localTask,
          id: Number(row.id),
          clientKey,
          judul: row.judul,
          deskripsi: row.deskripsi || "",
          penanggung_jawab: row.penanggung_jawab || "",
          deadline: row.deadline || "",
          status: row.status,
          category: row.category || "research",
          categoryLabel: categoryLabels[row.category] || "Riset",
          comments: Array.isArray(localTask.comments) ? localTask.comments : [],
          documentLink: localTask.documentLink || "",
          submissionLink: localTask.submissionLink || "",
          submittedAt: localTask.submittedAt || "",
          createdAt,
        };
      });
    },
    async syncGroupTasks(localTasks = []) {
      if (!this.group?.id) return;
      const result = await requestApi(`/api/groups/${this.group.id}/tasks/sync`, {
        method: "POST",
        body: JSON.stringify({
          tasks: localTasks.map((task) => ({
            ...task,
            clientKey: String(task.clientKey || task.id || ""),
          })),
        }),
      });
      this.tasks = this.mapTaskRecords(result, localTasks);
    },
    async loadLecturerData() {
      if (this.user?.role !== "Dosen" || !localStorage.getItem("teamsync-token")) return;
      this.lecturerLoading = true;
      try {
        const result = await requestApi("/api/lecturer/monitoring");
        this.lecturerCourseCount = result.courseCount || 0;
        this.lecturerGroups = (result.groups || []).map((group) => {
          const localGroup = loadStore(`teamsync-group-data:${group.id}`);
          const tasks = group.tasks?.length
            ? this.mapTaskRecords(group.tasks, localGroup.tasks || [])
            : Array.isArray(localGroup.tasks) ? localGroup.tasks : [];
          return {
            ...group,
            tasks,
            members: (group.members || []).map((member, index) => ({
              ...member,
              color: ["avatar-gold", "avatar-lilac", "avatar-blue", "avatar-green", "avatar-coral"][index % 5],
            })),
            notes: group.notes || [],
          };
        });
        const selectedExists = this.lecturerGroups.some(
          (group) => Number(group.id) === Number(this.selectedLecturerGroupId),
        );
        if (!selectedExists) this.selectedLecturerGroupId = this.lecturerGroups[0]?.id || null;
      } catch (error) {
        this.lecturerGroups = [];
        this.lecturerCourseCount = 0;
        this.showToast(error.message, "error");
      } finally {
        this.lecturerLoading = false;
      }
    },
    async loadGroupCourses() {
      try {
        this.groupCourses = await requestApi("/api/groups/courses");
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    goTo(view) {
      if (view.startsWith("admin-") && this.user?.role !== "Admin") {
        this.showToast("Menu administrasi hanya tersedia untuk Admin.", "error");
        return;
      }
      if (this.user?.role === "Dosen" && view !== "lecturer") {
        this.showToast("Akun Dosen hanya dapat membuka halaman pemantauan kelas.", "error");
        return;
      }
      if (view === "lecturer" && this.user?.role !== "Dosen") {
        this.showToast(
          "Menu pemantauan dosen hanya tersedia untuk akun dosen.",
        );
        return;
      }
      this.currentView = view;
      this.mobileMenuOpen = false;
      this.searchQuery = "";
    },
    async handleRegister() {
      try {
        const endpoint = this.authRole === "Dosen"
          ? "/api/lecturer/register"
          : "/api/register";
        const result = await requestApi(endpoint, {
          method: "POST",
          body: JSON.stringify(this.registerForm),
        });
        this.registerForm = { nama: "", email: "", password: "" };
        this.loginUser(result.user, result.token);
        if (result.user.role === "Mahasiswa") await this.loadGroupData();
        else if (result.user.role === "Dosen") await this.loadLecturerData();
        this.showToast(result.user.role === "Dosen"
          ? "Akun Dosen berhasil dibuat. Selamat datang!"
          : "Akun berhasil dibuat. Selamat datang!");
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    async handleLogin() {
      try {
        const endpoint = {
          Mahasiswa: "/api/login",
          Dosen: "/api/lecturer/login",
          Admin: "/api/admin/login",
        }[this.authRole];
        const result = await requestApi(endpoint, {
          method: "POST",
          body: JSON.stringify(this.loginForm),
        });
        this.loginForm = { email: "", password: "" };
        this.loginUser(result.user, result.token);
        if (result.user.role === "Admin") await this.loadAdminData();
        else if (result.user.role === "Mahasiswa") await this.loadGroupData();
        else if (result.user.role === "Dosen") await this.loadLecturerData();
        return;
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    async loginDemo(role) {
      if (role === "Admin") {
        try {
          const result = await requestApi("/api/admin/demo-login", {
            method: "POST",
          });
          this.loginUser(result.user, result.token);
          await this.loadAdminData();
        } catch (error) {
          this.showToast(error.message, "error");
        }
        return;
      }

      if (role === "Mahasiswa") {
        try {
          const result = await requestApi("/api/student/demo-login", { method: "POST" });
          this.loginUser(result.user, result.token);
          await this.loadGroupData();
        } catch (error) {
          this.showToast(error.message, "error");
        }
        return;
      }
    },
    loginUser(account, token = null) {
      if (token) {
        localStorage.setItem("teamsync-token", token);
      } else {
        localStorage.removeItem("teamsync-token");
      }
      this.user = {
        nama: account.nama,
        email: account.email,
        role: account.role || "Mahasiswa",
        nim:
          account.nim || (account.role === "Dosen" ? "Pengampu STSI4440" : ""),
      };
      this.group = null;
      this.members = [];
      if (this.user.role === "Mahasiswa") {
        Object.assign(this, emptyWorkspace());
      } else if (this.user.role === "Dosen") {
        Object.assign(this, emptyWorkspace());
        this.lecturerGroups = [];
        this.lecturerCourseCount = 0;
        this.selectedLecturerGroupId = null;
      } else {
        const savedWorkspace = loadStore();
        Object.assign(this, {
          tasks: savedWorkspace.tasks || structuredClone(seedTasks),
          announcements: savedWorkspace.announcements || structuredClone(seedAnnouncements),
          activities: savedWorkspace.activities || structuredClone(seedActivities),
          groupLink: savedWorkspace.groupLink || "",
        });
      }
      localStorage.setItem("teamsync-session", JSON.stringify(this.user));
      this.isLoggedIn = true;
      this.currentView =
        account.role === "Admin"
          ? "admin-dashboard"
          : account.role === "Dosen"
            ? "lecturer"
            : "overview";
      this.authPage = "landing";
      this.profileOpen = false;
    },
    logout() {
      localStorage.removeItem("teamsync-session");
      localStorage.removeItem("teamsync-token");
      this.isLoggedIn = false;
      this.user = null;
      this.group = null;
      this.members = [];
      Object.assign(this, emptyWorkspace());
      this.currentView = "overview";
      this.profileOpen = false;
      this.notificationsOpen = false;
      this.authPage = "landing";
    },
    async loadAdminData() {
      if (this.user?.role !== "Admin") return;
      try {
        const [users, courses, groups] = await Promise.all([
          requestApi("/api/admin/users"),
          requestApi("/api/admin/courses"),
          requestApi("/api/admin/groups"),
        ]);
        this.adminUsers = users;
        this.adminCourses = courses;
        this.adminGroups = groups;
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    openAdminModal(type, record = null) {
      this.adminModalType = type;
      this.adminEditingId = record?.id || null;
      this.adminForm = {
        nama: record?.nama || "",
        email: record?.email || "",
        password: "",
        role: record?.role || "Mahasiswa",
        kode: record?.kode || "",
        dosen: record?.id_dosen ? String(record.id_dosen) : record?.dosen || "",
        mataKuliah: record?.mataKuliah || "",
        anggota: record?.anggota || 0,
      };
      this.adminModalOpen = true;
    },
    closeAdminModal() {
      this.adminModalOpen = false;
      this.adminEditingId = null;
    },
    async saveAdminRecord() {
      const collectionName = {
        user: "adminUsers",
        course: "adminCourses",
        group: "adminGroups",
      }[this.adminModalType];
      const collection = this[collectionName];
      const previous = this.adminEditingId
        ? collection.find((item) => item.id === this.adminEditingId)
        : null;
      const record =
        this.adminModalType === "user"
          ? {
              nama: this.adminForm.nama.trim(),
              email: this.adminForm.email.trim().toLowerCase(),
              role: this.adminForm.role,
              password: this.adminForm.password,
            }
          : this.adminModalType === "course"
            ? {
                kode: this.adminForm.kode.trim().toUpperCase(),
                nama: this.adminForm.nama.trim(),
                dosen: this.adminForm.dosen.trim(),
              }
            : {
                nama: this.adminForm.nama.trim(),
                kode:
                  this.adminForm.kode.trim().toUpperCase() ||
                  `TS-${Date.now().toString().slice(-6)}`,
                mataKuliah: this.adminForm.mataKuliah.trim(),
                anggota: Number(this.adminForm.anggota) || 0,
              };
      if (!record.nama || (this.adminModalType === "user" && !record.email)) {
        this.showToast("Lengkapi nama dan data yang wajib diisi.", "error");
        return;
      }
      if (this.adminModalType === "course" && !record.kode) {
        this.showToast("Kode mata kuliah wajib diisi.", "error");
        return;
      }
      if (this.adminModalType === "user" && !previous && record.password.length < 6) {
        this.showToast("Kata sandi pengguna minimal 6 karakter.", "error");
        return;
      }

      const resource = { user: "users", course: "courses", group: "groups" }[
        this.adminModalType
      ];
      const identifier = previous
        ? this.adminModalType === "user"
          ? encodeURIComponent(previous.email)
          : previous.id
        : "";
      const endpoint = `/api/admin/${resource}${
        identifier ? `/${identifier}` : ""
      }`;

      try {
        await requestApi(endpoint, {
          method: previous ? "PUT" : "POST",
          body: JSON.stringify(record),
        });
        this.closeAdminModal();
        await this.loadAdminData();
        this.showToast("Data berhasil disimpan ke MySQL.");
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    async toggleAdminStatus(type, record) {
      if (type === "user" && record.email === this.user?.email && record.aktif) {
        this.showToast("Akun Admin yang sedang digunakan tidak dapat dinonaktifkan.", "error");
        return;
      }
      const resource = { user: "users", course: "courses", group: "groups" }[type];
      const identifier =
        type === "user" ? encodeURIComponent(record.email) : record.id;
      try {
        await requestApi(
          `/api/admin/${resource}/${identifier}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ aktif: !record.aktif }),
          },
        );
        await this.loadAdminData();
        this.showToast(
          record.aktif ? "Data dinonaktifkan." : "Data diaktifkan.",
        );
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    filterCount(filter) {
      return filter === "Semua"
        ? this.tasks.length
        : this.tasks.filter((t) => t.status === filter).length;
    },
    statusKey(status) {
      return status === "Selesai"
        ? "done"
        : status === "Dikerjakan"
          ? "active"
          : "todo";
    },
    dayDifference(date) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(`${date}T00:00:00`);
      return Math.round((target - today) / 86400000);
    },
    dateParts(date) {
      const d = new Date(`${date}T00:00:00`);
      return {
        day: String(d.getDate()).padStart(2, "0"),
        month: d
          .toLocaleDateString("id-ID", { month: "short" })
          .replace(".", "")
          .toUpperCase(),
      };
    },
    formatDate(date) {
      if (!date) return "Belum ditentukan";
      return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },
    formatShortDate(date) {
      if (!date) return "Belum ditentukan";
      return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    },
    formatRelative(date) {
      const n = this.dayDifference(date);
      if (n < 0) return `Lewat ${Math.abs(n)} hari`;
      if (n === 0) return "Hari ini";
      if (n === 1) return "Besok";
      return `${n} hari lagi`;
    },
    formatDateTime(time) {
      if (!time) return "";
      const date = new Date(time);
      return (
        date.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
        " · " +
        date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
    },
    deadlineClass(task) {
      const n = this.dayDifference(task.deadline);
      return task.status === "Selesai"
        ? ""
        : n < 0
          ? "deadline-overdue"
          : n <= 2
            ? "deadline-soon"
            : "";
    },
    openTaskModal(task = null) {
      this.detailTaskId = null;
      this.editingTaskId = task?.id || null;
      this.taskForm = task
        ? {
            judul: task.judul,
            deskripsi: task.deskripsi,
            penanggung_jawab: task.penanggung_jawab,
            deadline: task.deadline,
            status: task.status,
            category: task.category,
            documentLink: task.documentLink || "",
          }
        : this.blankTaskForm();
      if (!task && this.members.length)
        this.taskForm.penanggung_jawab = this.members[0].nama;
      this.taskModalOpen = true;
      this.taskMenuId = null;
    },
    closeTaskModal() {
      this.taskModalOpen = false;
      this.editingTaskId = null;
      this.taskForm = this.blankTaskForm();
    },
    async saveTask() {
      if (!this.group?.id) {
        this.showToast("Tugas hanya dapat disimpan setelah Anda bergabung ke kelompok.", "error");
        return;
      }
      const categoryLabels = {
        design: "Perancangan",
        research: "Riset",
        writing: "Dokumentasi",
        presentation: "Presentasi",
      };
      const editing = Boolean(this.editingTaskId);
      let savedTask = null;
      if (editing) {
        const task = this.tasks.find((t) => t.id === this.editingTaskId);
        if (!task) return;
        savedTask = task;
        Object.assign(task, this.taskForm, {
          categoryLabel: categoryLabels[this.taskForm.category],
        });
        this.addActivity(
          "task",
          "Tugas diperbarui",
          `${task.judul} diperbarui.`,
          this.user.nama,
        );
      } else {
        const task = {
          ...this.taskForm,
          id: `t${Date.now()}`,
          clientKey: `t${Date.now()}`,
          categoryLabel: categoryLabels[this.taskForm.category],
          comments: [],
          submissionLink: "",
          submittedAt: "",
          createdAt: new Date().toISOString(),
        };
        task.clientKey = task.id;
        savedTask = task;
        this.tasks.unshift(task);
        this.addActivity(
          "task",
          "Tugas baru ditambahkan",
          task.judul,
          this.user.nama,
        );
      }
      try {
        if (editing && typeof savedTask.id === "number") {
          const row = await requestApi(
            `/api/groups/${this.group.id}/tasks/${savedTask.id}`,
            { method: "PUT", body: JSON.stringify(savedTask) },
          );
          Object.assign(savedTask, this.mapTaskRecords([row], [savedTask])[0]);
        } else {
          await this.syncGroupTasks(this.tasks);
        }
      } catch (error) {
        this.showToast(`Tugas tersimpan di perangkat, tetapi belum tersinkron: ${error.message}`, "error");
        return;
      }
      this.closeTaskModal();
      this.showToast(
        editing ? "Perubahan tugas disimpan." : "Tugas baru berhasil dibuat.",
      );
    },
    async updateStatus(task, status) {
      const previous = task.status;
      task.status = status;
      try {
        if (this.group?.id && typeof task.id === "number") {
          const row = await requestApi(
            `/api/groups/${this.group.id}/tasks/${task.id}`,
            { method: "PUT", body: JSON.stringify(task) },
          );
          Object.assign(task, this.mapTaskRecords([row], [task])[0]);
        } else {
          await this.syncGroupTasks(this.tasks);
        }
      } catch (error) {
        task.status = previous;
        this.showToast(error.message, "error");
        return;
      }
      this.addActivity(
        "task",
        "Status tugas diperbarui",
        `${task.judul}: ${previous} → ${status}.`,
        this.user.nama,
      );
      this.showToast(`Status diperbarui menjadi “${status}”.`);
    },
    async deleteTask(task) {
      if (this.group?.id && typeof task.id === "number") {
        try {
          await requestApi(`/api/groups/${this.group.id}/tasks/${task.id}`, { method: "DELETE" });
        } catch (error) {
          this.showToast(error.message, "error");
          return;
        }
      }
      this.tasks = this.tasks.filter((t) => t.id !== task.id);
      this.taskMenuId = null;
      this.detailTaskId = null;
      this.addActivity("task", "Tugas dihapus", task.judul, this.user.nama);
      this.showToast("Tugas dihapus dari ruang kerja.");
    },
    openTaskDetail(task) {
      this.detailTaskId = task.id;
      this.submissionInput = task.submissionLink || "";
      this.commentInput = "";
      this.taskMenuId = null;
    },
    closeTaskDetail() {
      this.detailTaskId = null;
    },
    saveSubmission() {
      if (!this.submissionInput) return;
      const task = this.tasks.find((t) => t.id === this.detailTaskId);
      task.submissionLink = this.submissionInput;
      task.submittedAt = new Date().toISOString();
      this.addActivity(
        "task",
        "Hasil tugas dikumpulkan",
        `${this.user.nama} menambahkan tautan pada ${task.judul}.`,
        this.user.nama,
      );
      this.showToast("Tautan hasil tugas berhasil disimpan.");
    },
    addComment() {
      const task = this.tasks.find((t) => t.id === this.detailTaskId);
      if (!this.commentInput || !task) return;
      task.comments.push({
        id: `c${Date.now()}`,
        author: this.user.nama,
        text: this.commentInput,
        createdAt: new Date().toISOString(),
      });
      this.addActivity(
        "comment",
        "Komentar baru ditambahkan",
        `Pada ${task.judul}: “${this.commentInput}”`,
        this.user.nama,
      );
      this.commentInput = "";
    },
    publishAnnouncement() {
      const item = {
        id: `a${Date.now()}`,
        judul: this.announcementForm.judul,
        isi: this.announcementForm.isi,
        penulis: this.user.nama,
        peran:
          this.user.role === "Dosen" ? "Dosen pengampu" : "Anggota kelompok",
        createdAt: new Date().toISOString(),
      };
      this.announcements.unshift(item);
      this.addActivity(
        "announce",
        "Pengumuman baru diterbitkan",
        item.judul,
        item.penulis,
      );
      this.announcementForm = { judul: "", isi: "" };
      this.announcementModalOpen = false;
      this.showToast("Pengumuman berhasil diterbitkan.");
    },
    addActivity(type, title, description, author) {
      const icons = { task: "▤", comment: "↗", announce: "✦", feedback: "✎" };
      this.activities.unshift({
        id: `act${Date.now()}`,
        type,
        icon: icons[type] || "✦",
        title,
        description,
        author,
        time: new Date().toISOString(),
      });
    },
    async openGroupModal(mode = "choose") {
      if (this.user?.role !== "Mahasiswa" || !localStorage.getItem("teamsync-token")) {
        this.showToast("Masuk dengan akun mahasiswa untuk membuat atau bergabung ke kelompok.", "error");
        return;
      }
      this.groupModalMode = mode;
      this.groupCodeInput = "";
      this.groupForm = { nama: "", id_matkul: "" };
      this.groupModalOpen = true;
      await this.loadGroupCourses();
    },
    async createGroup() {
      try {
        const result = await requestApi("/api/groups", {
          method: "POST",
          body: JSON.stringify(this.groupForm),
        });
        await this.loadGroupData();
        this.groupModalOpen = false;
        this.showToast("Kelompok berhasil dibuat. Kode undangan: " + result.code);
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    async joinGroup() {
      try {
        const result = await requestApi("/api/groups/join", {
          method: "POST",
          body: JSON.stringify({ code: this.groupCodeInput }),
        });
        await this.loadGroupData();
        if (Array.isArray(result.members)) {
          this.members = result.members.map((member, index) => ({
            ...member,
            color: ["avatar-gold", "avatar-lilac", "avatar-blue", "avatar-green", "avatar-coral"][index % 5],
          }));
        }
        this.groupModalOpen = false;
        this.showToast("Berhasil bergabung ke kelompok.");
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    async leaveGroup() {
      if (!window.confirm("Keluar dari kelompok ini? Jika Anda ketua, anggota tertua berikutnya akan menjadi ketua.")) return;
      try {
        await requestApi("/api/groups/leave", { method: "POST" });
        this.group = null;
        this.members = [];
        this.currentView = "overview";
        this.showToast("Anda sudah keluar dari kelompok.");
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    editGroupLink() {
      if (this.groupLink) {
        this.openExternal(this.groupLink);
        return;
      }
      this.groupLinkInput = "";
      this.groupLinkModalOpen = true;
    },
    async saveGroupLink() {
      if (!this.group?.id || this.savingGroupLink) return;
      this.savingGroupLink = true;
      try {
        const result = await requestApi(`/api/groups/${this.group.id}/document-link`, {
          method: "PUT",
          body: JSON.stringify({ url: this.groupLinkInput.trim() }),
        });
        this.groupLink = result.tautan_dokumen;
        this.group.tautan_dokumen = result.tautan_dokumen;
        this.groupLinkModalOpen = false;
        this.showToast("Tautan dokumen kelompok disimpan.");
      } catch (error) {
        this.showToast(error.message, "error");
      } finally {
        this.savingGroupLink = false;
      }
    },
    copyInviteCode() {
      const code = this.group?.kode_kelompok;
      if (!code) return;
      if (navigator.clipboard)
        navigator.clipboard
          .writeText(code)
          .then(() => this.showToast("Kode undangan disalin: " + code))
          .catch(() => this.showToast("Kode undangan: " + code));
      else this.showToast("Kode undangan: " + code);
    },
    async sendFeedback() {
      if (!this.selectedLecturerGroup || !this.feedbackInput.trim()) return;
      try {
        const note = await requestApi(
          `/api/lecturer/groups/${this.selectedLecturerGroup.id}/notes`,
          { method: "POST", body: JSON.stringify({ isi: this.feedbackInput.trim() }) },
        );
        this.selectedLecturerGroup.notes.unshift(note);
        this.feedbackInput = "";
        this.feedbackModalOpen = false;
        this.showToast(`Catatan tersimpan untuk ${this.selectedLecturerGroup.nama_kelompok}.`);
      } catch (error) {
        this.showToast(error.message, "error");
      }
    },
    openExternal(url) {
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    },
    showToast(message, type = "success") {
      this.toast = { message, type };
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toast = null;
      }, 3200);
    },
  },
}).mount("#app");

export function initializeMarketing() {
  const controller = new AbortController();
  const listen = (node, event, callback) =>
    node.addEventListener(event, callback, { signal: controller.signal });
  ("use strict");
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const svg = (name) =>
    `<svg class="ic" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  // Navigation: usable with keyboard and screen readers.
  const menuToggle = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");
  listen(menuToggle, "click", () => {
    const open = mobileMenu.hidden;
    mobileMenu.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  });
  $$(".mobile-menu a").forEach((a) =>
    listen(a, "click", () => {
      mobileMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    }),
  );

  const data = {
    business: {
      title: "Ringkasan Bisnis",
      items: [
        [
          "users",
          "CRM & Prospek",
          "Kelola prospek dan tingkatkan konversi pendaftaran.",
        ],
        [
          "cal",
          "Booking & Enrollment",
          "Atur jadwal kunjungan, trial class, dan enrollment.",
        ],
        [
          "heart",
          "Kehadiran & Kelas",
          "Pantau okupansi dan kapasitas kelas secara real-time.",
        ],
        [
          "clipboard",
          "Tagihan & Pembayaran",
          "Kelola tagihan, multi kelas, dan laporan keuangan.",
        ],
      ],
    },
    care: {
      title: "Care & Family",
      items: [
        [
          "heart",
          "Aktivitas Harian",
          "Catat makan, tidur, mood, dan kegiatan anak.",
        ],
        [
          "clipboard",
          "Daily Story",
          "Kirim cerita kegiatan dan catatan harian anak.",
        ],
        [
          "message",
          "Komunikasi Orang Tua",
          "Informasi relevan langsung ke keluarga.",
        ],
        [
          "cal",
          "Jadwal Pengasuh",
          "Kelola kelas dan agenda pengasuhan harian.",
        ],
      ],
    },
    monitor: {
      title: "Smart Monitoring",
      items: [
        [
          "video",
          "CCTV Terintegrasi",
          "Tinjau area daycare dan kamera yang diizinkan.",
        ],
        ["eye", "Event Review", "Tinjau event video sesuai izin akses."],
        [
          "shield",
          "Area Terbatas",
          "Buat peringatan berbasis zona yang ditentukan.",
        ],
        [
          "activity",
          "Okupansi Area",
          "Bantu supervisor melihat kepadatan ruangan.",
        ],
      ],
    },
    leo: {
      title: "LEO Intelligence",
      items: [
        [
          "spark",
          "LEO untuk Owner",
          "Tanya okupansi, tagihan, dan ringkasan operasional.",
        ],
        [
          "message",
          "LEO untuk Orang Tua",
          "Jawaban dari Daily Story yang sudah dibagikan.",
        ],
        [
          "clipboard",
          "Laporan Otomatis",
          "Draf laporan dan ringkasan untuk diverifikasi.",
        ],
        [
          "shield",
          "Akses Berdasarkan Peran",
          "Data tetap mengikuti izin masing-masing pengguna.",
        ],
      ],
    },
  };
  const featureList = $("#featureList");
  function setSolution(id) {
    const selected = data[id] || data.business;
    $$("#solutionTabs button").forEach((btn) => {
      const active = btn.dataset.solution === id;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    featureList.innerHTML =
      selected.items
        .map(
          ([icon, title, desc]) =>
            `<div class="solution-feature"><span class="feature-icon">${svg(icon)}</span><div><h3>${title}</h3><p>${desc}</p></div></div>`,
        )
        .join("") +
      '<a class="btn btn-orange" href="#pengalaman">Lihat Pengalaman Daylio ' +
      svg("arrow") +
      "</a>";
    $("#dashboardTitle").textContent = selected.title;
    const metrics = {
      business: [
        ["Jumlah Anak Aktif", "28", "↑ 12% dari bulan lalu"],
        ["Kehadiran Hari Ini", "24 / 28", "● 86% hadir"],
        ["Pendapatan Bulan Ini", "Rp 24.500.000", "↑ 18% dari bulan lalu"],
      ],
      care: [
        ["Aktivitas Tercatat", "42", "Makan, tidur, dan kegiatan"],
        ["Daily Story Terkirim", "18 / 22", "Pembaruan hari ini"],
        ["Keluarga Terhubung", "28", "Komunikasi dalam aplikasi"],
      ],
      monitor: [
        ["Kamera Terhubung", "12 / 12", "Status koneksi contoh"],
        ["Event Ditinjau", "8", "Menunggu verifikasi staf"],
        ["Area Terpantau", "5", "Sesuai pengaturan akses"],
      ],
      leo: [
        ["Pertanyaan Dijawab", "47", "Berdasarkan data berizin"],
        ["Ringkasan Disiapkan", "12", "Memerlukan pemeriksaan staf"],
        ["Estimasi Waktu Hemat", "4,5 jam", "Simulasi saja"],
      ],
    };
    const m = metrics[id] || metrics.business;
    $$(".stats .stat").forEach((node, i) => {
      node.querySelector("small").textContent = m[i][0];
      node.querySelector("strong").textContent = m[i][1];
      node.querySelector("em").textContent = m[i][2];
    });
    const left = $(".graph-grid .graph-box:first-child>strong");
    const right = $(".graph-grid .graph-box:last-child>strong");
    if (left)
      left.textContent = {
        business: "Kehadiran Mingguan",
        care: "Aktivitas Harian",
        monitor: "Event Mingguan",
        leo: "Penggunaan LEO",
      }[id];
    if (right)
      right.textContent = {
        business: "Distribusi Kelas",
        care: "Kelompok Usia",
        monitor: "Area Pemantauan",
        leo: "Ringkasan Tim",
      }[id];
  }
  $$("#solutionTabs button").forEach((btn) =>
    listen(btn, "click", () => setSolution(btn.dataset.solution)),
  );
  setSolution("business");

  const aiStates = {
    area: {
      label: "Zona terbatas",
      message:
        "Contoh: pergerakan terdeteksi pada zona terbatas. Perlu diverifikasi staf.",
    },
    people: {
      label: "Estimasi okupansi",
      message:
        "Contoh: estimasi kepadatan ruang kegiatan. Jumlah orang perlu diperiksa supervisor.",
    },
    offline: {
      label: "Kamera perlu diperiksa",
      message:
        "Contoh: gangguan aliran video kamera. Tim dapat mengecek koneksi dan sumber daya.",
    },
  };
  function setEvent(id) {
    $$(".monitor-events button").forEach((btn) =>
      btn.classList.toggle("selected", btn.dataset.event === id),
    );
    $("#detectionOverlay").className =
      "detection-box " + (id === "area" ? "" : id);
    $("#detectionLabel").textContent = aiStates[id].label;
    $("#monitorStatus").textContent = aiStates[id].message;
  }
  $$(".monitor-events button").forEach((btn) =>
    listen(btn, "click", () => setEvent(btn.dataset.event)),
  );
  listen($("#tryAI"), "click", () => {
    const ids = ["area", "people", "offline"];
    const current = $(".monitor-events button.selected").dataset.event;
    const next = ids[(ids.indexOf(current) + 1) % ids.length];
    setEvent(next);
    document
      .querySelector(".monitor")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  const leoData = {
    owner: [
      [
        "Bagaimana okupansi bulan ini?",
        "Simulasi: okupansi rata-rata 82% bulan ini berdasarkan data kelas. Mohon verifikasi angka aktual di dashboard.",
      ],
      [
        "Anak mana yang sering tidak hadir?",
        "Data kehadiran per anak hanya tersedia bagi staf dengan izin yang sesuai.",
      ],
      [
        "Buat ringkasan aktivitas minggu ini.",
        "LEO dapat membantu membuat draf ringkasan aktivitas untuk diperiksa pengelola.",
      ],
      [
        "Berapa pendapatan per kelas?",
        "Tinjau breakdown pendapatan per kelas di laporan keuangan Daylio.",
      ],
    ],
    caregiver: [
      [
        "Siapa yang hadir hari ini?",
        "Lihat kehadiran anak kelas Anda berdasarkan daftar presensi hari ini.",
      ],
      [
        "Aktivitas mana yang belum dicatat?",
        "LEO dapat membantu mengidentifikasi care log yang belum lengkap.",
      ],
      [
        "Buat catatan serah terima.",
        "Draf catatan serah terima disusun dari input caregiver dan harus diverifikasi staf.",
      ],
      [
        "Apa agenda kelas hari ini?",
        "Jadwal kegiatan bisa dilihat dari agenda kelas yang sudah ditentukan.",
      ],
    ],
    parent: [
      [
        "Bagaimana aktivitas anak saya?",
        "Catatan aktivitas yang sudah dibagikan caregiver tersedia di Daily Story.",
      ],
      [
        "Apakah anak saya sudah makan?",
        "Lihat catatan makan yang sudah dipublikasikan oleh pengasuh.",
      ],
      [
        "Boleh lihat foto kegiatan hari ini?",
        "Foto kegiatan tersedia bila sudah diunggah dan diizinkan untuk keluarga Anda.",
      ],
      [
        "Bagaimana perkembangan anak saya?",
        "Laporan perkembangan hanya menampilkan informasi yang telah disetujui daycare.",
      ],
    ],
  };
  let leoRole = "owner";
  let leoQuestionIndex = 0;
  const roleLabels = {
    owner: "Pemilik",
    caregiver: "Pengasuh",
    parent: "Orang Tua",
  };
  const roleGreetings = {
    owner:
      "Halo! Saya LEO 👋 Mau melihat insight operasional daycare hari ini?",
    caregiver:
      "Halo! Saya LEO 👋 Ada kegiatan kelas atau catatan anak yang ingin Anda cek?",
    parent:
      "Halo! Saya LEO 👋 Mau tahu aktivitas anak yang sudah dibagikan daycare hari ini?",
  };
  const leoCards = {
    owner: [
      ["Rata-rata okupansi", "82%", "Contoh data · Oktober 2026"],
      ["Presensi", "Perlu review", "Data anak hanya untuk pihak berwenang"],
      ["Ringkasan mingguan", "Draf siap", "Periksa sebelum dibagikan"],
      ["Pendapatan", "Per kelas", "Buka laporan keuangan Daylio"],
    ],
    caregiver: [
      ["Presensi kelas", "24 / 28", "Contoh data yang tersedia"],
      ["Catatan harian", "Perlu dicek", "Periksa catatan yang belum lengkap"],
      ["Serah terima", "Draf siap", "Perlu verifikasi caregiver"],
      ["Jadwal kegiatan", "Hari ini", "Berdasarkan agenda kelas"],
    ],
    parent: [
      ["Daily Story", "Hari ini", "Informasi yang telah dibagikan"],
      ["Catatan makan", "Tercatat", "Sesuai pembaruan caregiver"],
      ["Galeri kegiatan", "Tersedia", "Hanya foto yang diizinkan"],
      ["Laporan anak", "Dibagikan", "Berdasarkan persetujuan daycare"],
    ],
  };
  function setLeoAnswer(role, index, customText) {
    leoQuestionIndex = index;
    $$("#leoQuestions button").forEach((btn) =>
      btn.classList.toggle(
        "active",
        Number(btn.dataset.q) === index && !customText,
      ),
    );
    const question = customText || leoData[role][index][0];
    const reply = customText
      ? "Terima kasih! Ini simulasi percakapan LEO. Untuk pertanyaan bebas, fitur AI perlu terhubung ke data Daylio dan hak akses Anda. Coba pilih salah satu pertanyaan yang tersedia."
      : leoData[role][index][1];
    $("#leoUserBubble").textContent = question;
    $("#leoResponse").textContent = reply;
    const card = $("#leoInsight");
    if (customText) {
      card.hidden = true;
    } else {
      card.hidden = false;
      const [label, value, footnote] = leoCards[role][index];
      card.innerHTML = `<div class="leo20-insight-top"><span></span><strong></strong></div>${role === "owner" && index === 0 ? '<div class="leo20-insight-bars" aria-hidden="true"><i style="height:37%"></i><i style="height:50%"></i><i style="height:62%"></i><i style="height:58%"></i><i style="height:78%"></i><i style="height:88%"></i></div>' : ""}<small></small>`;
      card.querySelector(".leo20-insight-top span").textContent = label;
      card.querySelector(".leo20-insight-top strong").textContent = value;
      card.querySelector("small").textContent = footnote;
      card.querySelector(".leo20-insight-top strong").style.fontSize =
        value.length > 8 ? "13px" : "";
    }
    const thread = $("#leoThread");
    if (thread) thread.scrollTop = thread.scrollHeight;
  }
  function setLeo(role) {
    leoRole = role;
    $$("#leoTabs button").forEach((btn) => {
      const active = btn.dataset.leo === role;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    $("#leoRoleLabel").textContent = roleLabels[role];
    $("#leoGreeting").textContent = roleGreetings[role];
    $("#leoQuestions").innerHTML = leoData[role]
      .map(
        (q, i) =>
          `<button type="button" data-q="${i}" class="${i === 0 ? "active" : ""}"><span>${q[0]}</span><span class="q-arrow" aria-hidden="true">↗</span></button>`,
      )
      .join("");
    setLeoAnswer(role, 0);
  }
  $$("#leoTabs button").forEach((btn) =>
    listen(btn, "click", () => setLeo(btn.dataset.leo)),
  );
  listen($("#leoQuestions"), "click", (e) => {
    const btn = e.target.closest("[data-q]");
    if (!btn) return;
    setLeoAnswer(leoRole, Number(btn.dataset.q));
  });
  listen($("#leoChatForm"), "submit", (e) => {
    e.preventDefault();
    const input = $("#leoMessageInput");
    const query = input.value.trim();
    if (!query) return;
    const idx = leoData[leoRole].findIndex(
      (q) => q[0].toLowerCase() === query.toLowerCase(),
    );
    if (idx >= 0) setLeoAnswer(leoRole, idx);
    else setLeoAnswer(leoRole, leoQuestionIndex, query);
    input.value = "";
  });
  setLeo("owner");

  const modal = $("#infoModal");
  function openModal(title, message, subject) {
    $("#modalTitle").textContent = title;
    $("#modalText").textContent = message;
    $("#modalLink").href =
      `https://wa.me/6281933328899?text=${encodeURIComponent("Halo tim ELENIO, saya ingin informasi dan demo mengenai " + subject + " di Daylio.")}`;
    if (!modal.open) modal.showModal();
  }
  $$("[data-role]").forEach((btn) =>
    listen(btn, "click", () =>
      openModal(
        "Aplikasi " + btn.dataset.role,
        "Preview di landing page ini menggunakan data simulasi. Hubungi tim kami untuk demo operasional selengkapnya.",
        "aplikasi " + btn.dataset.role,
      ),
    ),
  );
  $$("[data-plan]").forEach((btn) =>
    listen(btn, "click", () =>
      openModal(
        "Paket " + btn.dataset.plan,
        "Harga bersifat indikatif dalam prototipe. Paket dan biaya CCTV/AI akan disesuaikan dengan kebutuhan operasional daycare.",
        "paket " + btn.dataset.plan,
      ),
    ),
  );

  listen($("#closeModal"), "click", () => modal.close());
  listen(modal, "click", (e) => {
    if (e.target === modal) modal.close();
  });

  // Select camera label; each is a UI simulation with access constraints.
  document.querySelectorAll("[data-camera]").forEach((btn) =>
    listen(btn, "click", () => {
      document
        .querySelectorAll("[data-camera]")
        .forEach((el) => el.classList.toggle("current", el === btn));
      const name =
        btn.querySelector(".camera-item-name")?.textContent || "Ruang kegiatan";
      const el = document.querySelector(".monitor-header>span");
      if (el)
        el.innerHTML = '<span class="live-dot"></span> ' + name + " · Simulasi";
    }),
  );

  return () => {
    controller.abort();
    const modal = document.querySelector("#infoModal");
    if (modal?.open) modal.close();
  };
}

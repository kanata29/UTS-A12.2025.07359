/* =========================================================
   RideReady - script.js (vanilla JavaScript)
   Isi: 1) Ride Planner (moving time)  2) Checklist Essentials
        3) Pilih Ride Style  4) Animasi, navbar & video  5) Tahun footer
   ========================================================= */

// Aktifkan animasi "reveal" hanya kalau JavaScript berjalan
document.documentElement.classList.add("js");

// ---------- Data checklist per tipe perjalanan ----------
const baseItems = ["Helmet", "Water bottle", "Front and rear lights", "Phone and identification"];
const extraItems = {
    Leisure:  ["Sunscreen", "Light snack", "Camera or phone mount"],
    Fitness:  ["Sunscreen", "Spare tube and repair kit", "Towel", "Heart rate monitor"],
    Training: ["Repair kit and spare tube", "Energy gel or bar", "Extra water bottle", "Cyclocomp or app"]
};

// ---------- Elemen yang dipakai ----------
const form        = document.getElementById("plannerForm");
const inputDist   = document.getElementById("distance");
const inputTime   = document.getElementById("departure");
const errorBox    = document.getElementById("formError");
const resultBox   = document.getElementById("result");
const resDuration = document.getElementById("resDuration");
const resArrival  = document.getElementById("resArrival");
const resType     = document.getElementById("resType");
const resList     = document.getElementById("resChecklist");
const customSpeed = document.getElementById("customSpeed");
const inputWeight = document.getElementById("weight");
const resCalories = document.getElementById("resCalories");
const resCalNote  = document.getElementById("resCalNote");

// ---------- 1. RIDE PLANNER ----------
function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    resultBox.hidden = true;
}

// Ubah menit total menjadi teks "1 h 30 min"
function formatDuration(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return m + " min";
    if (m === 0) return h + " h";
    return h + " h " + m + " min";
}

// Nilai MET bersepeda menurut kecepatan rata-rata (rentang bawah - atas)
function getMetRange(speed) {
    if (speed < 16)  return { low: 4,  high: 6,  label: "Easy pace" };
    if (speed <= 22) return { low: 6,  high: 8,  label: "Moderate pace" };
    return                  { low: 10, high: 12, label: "Fast pace" };
}

// Tambah menit ke jam keberangkatan "HH:MM"
function calcArrival(timeValue, minutesToAdd) {
    const [h, m] = timeValue.split(":").map(Number);
    const total = h * 60 + m + minutesToAdd;
    const dayOffset = Math.floor(total / 1440);
    const inDay = total % 1440;
    const hh = String(Math.floor(inDay / 60)).padStart(2, "0");
    const mm = String(inDay % 60).padStart(2, "0");
    return hh + ":" + mm + (dayOffset > 0 ? " (+" + dayOffset + " day)" : "");
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const distance = parseFloat(inputDist.value);
    const speedInput = form.querySelector('input[name="speed"]:checked');
    const customRaw = customSpeed.value.trim();
    const typeInput = form.querySelector('input[name="type"]:checked');

    // Validasi
    if (isNaN(distance) || distance <= 0) {
        showError("Please enter a distance greater than 0 km.");
        inputDist.focus();
        return;
    }
    // Kecepatan: input manual diutamakan, kalau kosong pakai pilihan cepat
    let speed;
    if (customRaw !== "") {
        speed = parseFloat(customRaw);
        if (isNaN(speed) || speed <= 0 || speed > 80) {
            showError("Please enter an average speed between 1 and 80 km/h.");
            customSpeed.focus();
            return;
        }
    } else if (speedInput) {
        speed = Number(speedInput.value);
    } else {
        showError("Please choose or enter your average speed.");
        return;
    }
    if (!typeInput) {
        showError("Please choose a ride type.");
        return;
    }

    // Berat badan (opsional) harus masuk akal kalau diisi
    const weightRaw = inputWeight.value.trim();
    const weight = parseFloat(weightRaw);
    if (weightRaw !== "" && (isNaN(weight) || weight <= 0 || weight > 300)) {
        showError("Please enter a body weight between 1 and 300 kg, or leave it empty.");
        inputWeight.focus();
        return;
    }

    errorBox.hidden = true;

    // Rumus: durasi = jarak / kecepatan rata-rata
    const minutes = Math.round((distance / speed) * 60);
    const type = typeInput.value;

    resDuration.textContent = formatDuration(minutes);
    resType.textContent = type;
    resArrival.textContent = inputTime.value
        ? calcArrival(inputTime.value, minutes)
        : "Add a departure time";

    // Rumus kalori: MET x berat badan (kg) x durasi (jam)
    if (weightRaw !== "") {
        const hours = distance / speed;
        const met = getMetRange(speed);
        const low = Math.round(met.low * weight * hours);
        const high = Math.round(met.high * weight * hours);
        const mid = Math.round(((met.low + met.high) / 2) * weight * hours);
        resCalories.textContent = "≈ " + mid + " kcal";
        resCalNote.textContent = met.label + " (MET " + met.low + "–" + met.high + "): " + low + "–" + high + " kcal";
    } else {
        resCalories.textContent = "Add your weight";
        resCalNote.textContent = "";
    }

    // Checklist sesuai tipe
    resList.innerHTML = "";
    baseItems.concat(extraItems[type]).forEach(function (item) {
        const li = document.createElement("li");
        li.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
        li.append(item);
        resList.appendChild(li);
    });

    resultBox.hidden = false;
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// Pilihan cepat dan input manual saling menggantikan
customSpeed.addEventListener("input", function () {
    if (customSpeed.value.trim() !== "") {
        form.querySelectorAll('input[name="speed"]').forEach(function (r) { r.checked = false; });
    }
});
form.querySelectorAll('input[name="speed"]').forEach(function (r) {
    r.addEventListener("change", function () { customSpeed.value = ""; });
});

document.getElementById("resetPlanner").addEventListener("click", function () {
    form.reset();
    errorBox.hidden = true;
    resultBox.hidden = true;
    markSelectedStyle(null);
});

// ---------- 2. CHECKLIST ESSENTIALS ----------
const checkboxes = document.querySelectorAll("#essentialsList input[type='checkbox']");
const progressText = document.getElementById("progressText");
const progressPct = document.getElementById("progressPct");
const progressBar = document.getElementById("progressBar");

function updateProgress() {
    const total = checkboxes.length;
    const done = document.querySelectorAll("#essentialsList input:checked").length;
    const percent = Math.round((done / total) * 100);

    progressText.textContent = done + " of " + total + " essentials ready";
    progressPct.textContent = percent + "%";
    progressBar.style.width = percent + "%";
    progressBar.parentElement.setAttribute("aria-valuenow", percent);
}

checkboxes.forEach(function (box) {
    box.addEventListener("change", updateProgress);
});

document.getElementById("resetChecklist").addEventListener("click", function () {
    checkboxes.forEach(function (box) { box.checked = false; });
    updateProgress();
});

// ---------- 3. CHOOSE RIDE STYLE ----------
const styleCards = document.querySelectorAll(".style-card");

function markSelectedStyle(type) {
    styleCards.forEach(function (card) {
        const active = card.dataset.type === type;
        card.classList.toggle("selected", active);
        card.querySelector(".choose-btn").textContent = active ? "Selected" : "Choose This Ride";
    });
}

styleCards.forEach(function (card) {
    card.querySelector(".choose-btn").addEventListener("click", function () {
        const type = card.dataset.type;
        form.querySelector('input[name="type"][value="' + type + '"]').checked = true;
        markSelectedStyle(type);
        document.getElementById("planner").scrollIntoView({ behavior: "smooth" });
    });
});

// Kalau pengguna ganti ride type langsung di form, kartu ikut menyesuaikan
form.querySelectorAll('input[name="type"]').forEach(function (radio) {
    radio.addEventListener("change", function () { markSelectedStyle(radio.value); });
});

// ---------- 4. ANIMASI SCROLL & NAVBAR ----------
const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    revealItems.forEach(function (el) { observer.observe(el); });
} else {
    revealItems.forEach(function (el) { el.classList.add("show"); });
}

// Tutup menu mobile setelah link diklik
document.querySelectorAll(".rr-nav .nav-link, .rr-nav .btn-rr").forEach(function (link) {
    link.addEventListener("click", function () {
        const menu = document.getElementById("menuUtama");
        if (menu.classList.contains("show")) {
            bootstrap.Collapse.getOrCreateInstance(menu).hide();
        }
    });
});

// Tandai menu sesuai section yang sedang dilihat
const navLinks = document.querySelectorAll(".rr-nav .nav-link");
const sections = ["home", "about", "styles", "planner", "essentials"].map(function (id) {
    return document.getElementById(id);
});
window.addEventListener("scroll", function () {
    let current = "home";
    sections.forEach(function (sec) {
        if (sec.getBoundingClientRect().top <= 120) current = sec.id;
    });
    navLinks.forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
}, { passive: true });

// Navbar: transparan di atas foto hero, putih setelah di-scroll atau saat menu mobile terbuka
const nav = document.querySelector(".rr-nav");
const menuEl = document.getElementById("menuUtama");
function updateNav() {
    nav.classList.toggle("solid", window.scrollY > 40 || menuEl.classList.contains("show"));
}
window.addEventListener("scroll", updateNav, { passive: true });
menuEl.addEventListener("show.bs.collapse", function () { nav.classList.add("solid"); });
menuEl.addEventListener("hidden.bs.collapse", updateNav);
updateNav();

// ---------- 4b. VIDEO: putar saat terlihat, jeda saat keluar layar ----------
const video = document.getElementById("motionVideo");
const videoBtn = document.getElementById("videoToggle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let userPaused = reduceMotion;   // pengguna yang minta gerak dikurangi: tidak autoplay

function setVideoIcon() {
    const playing = !video.paused;
    videoBtn.innerHTML = '<i class="bi ' + (playing ? "bi-pause-fill" : "bi-play-fill") + '"></i>';
    videoBtn.setAttribute("aria-label", playing ? "Pause video" : "Play video");
}
videoBtn.addEventListener("click", function () {
    if (video.paused) { userPaused = false; video.play().catch(function () {}); }
    else { userPaused = true; video.pause(); }
});
video.addEventListener("play", setVideoIcon);
video.addEventListener("pause", setVideoIcon);
setVideoIcon();

if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !userPaused) video.play().catch(function () {});
            else video.pause();
        });
    }, { threshold: 0.35 }).observe(video);
}

// ---------- 4c. FORM PENDAFTARAN (Nama, Alamat, Kota, Hobi) ----------
const regForm   = document.getElementById("registerForm");
const regError  = document.getElementById("registerError");
const regResult = document.getElementById("registerResult");

regForm.addEventListener("submit", function (event) {
    event.preventDefault();   // jangan reload halaman

    const nama   = document.getElementById("nama").value.trim();
    const alamat = document.getElementById("alamat").value.trim();
    const kota   = document.getElementById("kota").value;
    const hobi   = Array.from(regForm.querySelectorAll('input[name="hobi"]:checked')).map(function (c) { return c.value; });

    let message = "";
    if (nama === "")        message = "Nama wajib diisi.";
    else if (alamat === "") message = "Alamat wajib diisi.";
    else if (kota === "")   message = "Silakan pilih kota.";
    else if (hobi.length === 0) message = "Pilih minimal satu hobi.";

    if (message) {
        regError.textContent = message;
        regError.hidden = false;
        regResult.hidden = true;
        return;
    }

    regError.hidden = true;
    document.getElementById("outNama").textContent   = nama;
    document.getElementById("outAlamat").textContent = alamat;
    document.getElementById("outKota").textContent   = kota;
    document.getElementById("outHobi").textContent   = hobi.join(", ");
    regResult.hidden = false;
});

regForm.addEventListener("reset", function () {
    regError.hidden = true;
    regResult.hidden = true;
});

// ---------- 5. TAHUN FOOTER ----------
document.getElementById("year").textContent = new Date().getFullYear();

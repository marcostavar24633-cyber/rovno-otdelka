/* =====================================================================
   «Ровно» — скрипты сайта.
   Все переключатели фишек и настройки — в объекте CONFIG ниже.
   Библиотеки (GSAP, ScrollTrigger, Lenis) подключены с CDN в index.html.
   Если они не загрузятся, сайт работает без анимаций.
   ===================================================================== */
const CONFIG = {
  // Адрес обработчика формы (например, https://formspree.io/f/xxxxxx). Пока пусто — форма предложит позвонить.
  formEndpoint: "",
  phone: "+7 963 128-25-58",
  phoneHref: "tel:+79631282558",

  // Включить / выключить фишки (true / false)
  features: {
    preloader: true,        // прелоадер со счётчиком 0–100 % и шторкой
    smoothScroll: true,     // инерционный скролл Lenis
    cursor: true,           // кастомный курсор (только мышь)
    magnet: true,           // магнитные кнопки [data-magnet]
    tilt: true,             // 3D-наклон карточек .tilt
    heroChars: true,        // заголовок первого экрана по буквам
    titleLines: true,       // заголовки секций по строкам из-под маски
    imageReveal: true,      // раскрытие картинок шторкой
    parallax: true,         // параллакс фото
    horizontalWorks: true,  // горизонтальный скролл проектов (десктоп)
    stackCards: true,       // накладывающиеся карточки гарантий
    marqueeVelocity: true,  // скорость бегущих строк зависит от скорости скролла
    pageTransition: true    // шторка при переходе на другие страницы
  },

  // Калькулятор: цены за м² работ берутся из значений радиокнопок «Вид отделки» в index.html.
  // Доп. опции: укажите цену (₽ за м² или фикс), пока 0 — опция не меняет сумму, а уходит в заявку.
  calc: {
    options: [
      { label: "Демонтаж старой отделки", price: 0, per: "m2" },
      { label: "Электрика", price: 0, per: "m2" },
      { label: "Сантехника", price: 0, per: "fix" },
      { label: "Вывоз мусора", price: 0, per: "fix" }
    ]
  },

  // Подарок в конце квиза. Пусто — блок не показывается. Пример: "Дизайн-раскладка плитки в санузле в подарок"
  quizGift: "",

  // Панель кейса. Пустые поля (площадь, срок, бюджет) на сайте не показываются — заполните, когда будут реальные данные.
  cases: [
    { title: "Гостиная", images: ["assets/vis-gostinaya.webp"], area: "", term: "", budget: "",
      text: "Что входит в такую отделку: выравнивание стен под покраску, декоративные рейки, многоуровневый потолок из ГКЛ с нишей под подсветку, напольное покрытие." },
    { title: "Кухня-столовая", images: ["assets/vis-kuhnya.webp"], area: "", term: "", budget: "",
      text: "Что входит: декоративная штукатурка на акцентной стене, керамогранит на полу, подготовка стен под кухонный гарнитур и фартук, точки под освещение." },
    { title: "Санузел", images: ["assets/vis-sanuzel.webp"], area: "", term: "", budget: "",
      text: "Что входит: гидроизоляция, короб и инсталляция, крупноформатная плитка с раскладкой по швам, ниша в душевой, трап." },
    { title: "Спальня", images: ["assets/vis-spalnya.webp"], area: "", term: "", budget: "",
      text: "Что входит: потолок с парящей подсветкой, рейки у изголовья, шпаклёвка и покраска стен, напольное покрытие и плинтус." },
    { title: "Прихожая", images: ["assets/vis-prihozhaya.webp"], area: "", term: "", budget: "",
      text: "Что входит: керамогранит под мрамор, подготовка ниш под встроенные шкафы, зеркало с подсветкой, потолок с треками." }
  ]
};

(function () {
  "use strict";
  const F = CONFIG.features;
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGSAP && !reduce;
  const fmt = n => Math.round(n).toLocaleString("ru-RU");
  let lenis = null;

  /* =================== Формы =================== */
  const digits = v => { let d = v.replace(/\D/g, ""); if (d.startsWith("8")) d = "7" + d.slice(1); if (!d.startsWith("7")) d = "7" + d; return d.slice(0, 11); };
  const maskPhone = d => { const p = d.slice(1); let s = "+7"; if (p.length) s += " (" + p.slice(0, 3); if (p.length >= 3) s += ")"; if (p.length > 3) s += " " + p.slice(3, 6); if (p.length > 6) s += "-" + p.slice(6, 8); if (p.length > 8) s += "-" + p.slice(8, 10); return s; };
  $$(".js-phone").forEach(ph => {
    ph.addEventListener("input", () => { ph.value = ph.value ? maskPhone(digits(ph.value)) : ""; });
    ph.addEventListener("focus", () => { if (!ph.value) ph.value = "+7 ("; });
    ph.addEventListener("blur", () => { if (digits(ph.value).length <= 1) ph.value = ""; });
  });
  const telLink = '<a href="' + CONFIG.phoneHref + '">' + CONFIG.phone + "</a>";
  $$("form[data-lead]").forEach(form => {
    const status = $(".form__status", form);
    const btn = $("button[type=submit]", form);
    const btnText = btn.textContent;
    const nameI = $("[name=name]", form), phoneI = $("[name=phone]", form), consentI = $("[name=consent]", form);
    const setErr = (n, on) => $('[data-field="' + n + '"]', form).classList.toggle("is-error", on);
    [nameI, phoneI, consentI].forEach(i => i.addEventListener("input", () => i.closest(".field").classList.remove("is-error")));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      status.textContent = ""; status.className = "form__status";
      const okName = nameI.value.trim().length >= 2, okPhone = digits(phoneI.value).length === 11, okConsent = consentI.checked;
      setErr("name", !okName); setErr("phone", !okPhone); setErr("consent", !okConsent);
      if (!(okName && okPhone && okConsent)) { $(".is-error input", form)?.focus(); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      data.form = form.id || form.className;
      if (!CONFIG.formEndpoint) { status.className = "form__status is-err"; status.innerHTML = "Онлайн-заявки пока не подключены. Позвоните нам: " + telLink; return; }
      btn.disabled = true; btn.textContent = "Отправляем…";
      try {
        const r = await fetch(CONFIG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        form.classList.add("is-sent");
      } catch (err) {
        status.className = "form__status is-err"; status.innerHTML = "Заявка не отправилась: нет связи с сервером. Попробуйте ещё раз или позвоните: " + telLink;
      } finally { btn.disabled = false; btn.textContent = btnText; }
    });
  });

  /* =================== Тема =================== */
  const tt = $("#theme-toggle");
  const syncTT = () => { const l = root.getAttribute("data-theme") === "light"; tt.setAttribute("aria-label", l ? "Включить тёмную тему" : "Включить светлую тему"); tt.setAttribute("aria-pressed", String(l)); };
  syncTT();
  tt.addEventListener("click", () => {
    const l = root.getAttribute("data-theme") !== "light";
    l ? root.setAttribute("data-theme", "light") : root.removeAttribute("data-theme");
    try { localStorage.setItem("rovno-theme", l ? "light" : "dark"); } catch (e) {}
    syncTT();
  });

  /* =================== Слои: меню и панели =================== */
  const header = $("#header"), burger = $("#burger");
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])';
  let active = null, lastTrigger = null;
  const lock = on => { root.classList.toggle("is-locked", on); if (lenis) on ? lenis.stop() : lenis.start(); };
  function openLayer(layer, trigger) {
    if (active && active !== layer) closeLayer(active, false);
    active = layer; lastTrigger = trigger || document.activeElement;
    if (layer.id === "menu") {
      const r = burger.getBoundingClientRect();
      layer.style.setProperty("--cx", (r.left + r.width / 2) + "px"); layer.style.setProperty("--cy", (r.top + r.height / 2) + "px");
      $$(".menu__list a", layer).forEach((a, i) => a.style.setProperty("--i", i));
      root.classList.add("menu-open"); burger.setAttribute("aria-label", "Закрыть меню");
    }
    layer.removeAttribute("inert"); layer.classList.add("is-open");
    $$('[aria-controls="' + layer.id + '"]').forEach(b => b.setAttribute("aria-expanded", "true"));
    header.classList.remove("is-hidden"); lock(true);
    setTimeout(() => { const t = $(".drawer__panel input:not([type=hidden])", layer) || $(".menu__list a", layer) || $(FOCUSABLE, layer); t && t.focus({ preventScroll: true }); }, reduce ? 0 : 250);
  }
  function closeLayer(layer, restore = true) {
    layer = layer || active; if (!layer) return;
    layer.classList.remove("is-open"); layer.setAttribute("inert", "");
    $$('[aria-controls="' + layer.id + '"]').forEach(b => b.setAttribute("aria-expanded", "false"));
    if (layer.id === "menu") { root.classList.remove("menu-open"); burger.setAttribute("aria-label", "Открыть меню"); }
    if (active === layer) active = null;
    if (!active) lock(false);
    if (restore && lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  }
  burger.addEventListener("click", () => { const m = $("#menu"); m.classList.contains("is-open") ? closeLayer(m) : openLayer(m, burger); });
  $$("[data-open]").forEach(b => b.addEventListener("click", () => openLayer($("#" + b.dataset.open), b)));
  $$(".layer").forEach(layer => layer.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) closeLayer(layer);
    else if (e.target.closest('a[href^="#"]')) closeLayer(layer, false);
  }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (active) { closeLayer(active); return; } setMega(false, true); }
    if (e.key !== "Tab" || !active) return;
    let items = $$(FOCUSABLE, active).filter(el => el.getClientRects().length);
    if (active.id === "menu") items = [burger, ...items];
    const first = items[0], last = items[items.length - 1];
    if (!items.includes(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // фото на фоне меню меняется при наведении на пункт
  const menuImgs = $$(".menu__bg img");
  $$(".menu__list a").forEach(a => ["mouseenter", "focus"].forEach(ev => a.addEventListener(ev, () => menuImgs.forEach(img => img.classList.toggle("is-active", img.dataset.key === a.dataset.key)))));

  /* =================== Mega-menu «Услуги» =================== */
  const mega = $("#mega-wrap"), megaBtn = $(".nav__dd-btn", mega), megaImg = $(".mega__preview img", mega);
  let megaTimer, hoverAt = 0;
  function setMega(open, focusBtn) { mega.classList.toggle("is-open", open); megaBtn.setAttribute("aria-expanded", String(open)); if (!open && focusBtn && mega.contains(document.activeElement)) megaBtn.focus(); }
  megaBtn.addEventListener("click", () => { if (performance.now() - hoverAt < 500) { setMega(true); return; } setMega(!mega.classList.contains("is-open")); });
  if (fine) {
    mega.addEventListener("mouseenter", () => { clearTimeout(megaTimer); if (!mega.classList.contains("is-open")) hoverAt = performance.now(); setMega(true); });
    mega.addEventListener("mouseleave", () => { megaTimer = setTimeout(() => setMega(false), 180); });
  }
  mega.addEventListener("focusout", e => { if (!mega.contains(e.relatedTarget)) setMega(false); });
  document.addEventListener("click", e => { if (!mega.contains(e.target)) setMega(false); });
  $$(".mega__link", mega).forEach(l => {
    ["mouseenter", "focus"].forEach(ev => l.addEventListener(ev, () => { if (megaImg.getAttribute("src") !== l.dataset.preview) { megaImg.style.opacity = 0; setTimeout(() => { megaImg.src = l.dataset.preview; megaImg.style.opacity = 1; }, 180); } }));
    l.addEventListener("click", () => setMega(false));
  });

  /* =================== Шапка и прогресс =================== */
  const progress = $("#progress");
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle("is-glass", y > 40);
    if (!active && !mega.classList.contains("is-open")) {
      if (y > lastY + 4 && y > 200) header.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 200) header.classList.remove("is-hidden");
    }
    progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    lastY = y; ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  onScroll();

  /* =================== Калькулятор =================== */
  const calcForm = $("#calc-form"), area = $("#area"), areaOut = $("#area-out"), sumEl = $("#calc-sum"), optsBox = $("#calc-opts");
  CONFIG.calc.options.forEach((o, i) => {
    const l = document.createElement("label"); l.className = "chip";
    l.innerHTML = '<input type="checkbox" name="opt" value="' + i + '"><span>' + o.label + (o.price ? " · " + fmt(o.price) + (o.per === "m2" ? " ₽/м²" : " ₽") : "") + "</span>";
    optsBox.appendChild(l);
  });
  let shown = 0;
  function calcTotal() {
    const a = +area.value, rate = +($("input[name=kind]:checked", calcForm)?.value || 0);
    let total = a * rate;
    $$("input[name=opt]:checked", calcForm).forEach(c => { const o = CONFIG.calc.options[c.value]; total += o.per === "m2" ? o.price * a : o.price; });
    return total;
  }
  function renderCalc(animate) {
    areaOut.textContent = area.value;
    area.style.setProperty("--fill", ((area.value - area.min) / (area.max - area.min) * 100) + "%");
    const t = calcTotal();
    if (animate && motion) { const o = { v: shown }; gsap.to(o, { v: t, duration: .9, ease: "power3.out", onUpdate: () => { sumEl.textContent = "от " + fmt(o.v) + " ₽"; } }); }
    else sumEl.textContent = "от " + fmt(t) + " ₽";
    shown = t;
  }
  calcForm.addEventListener("input", () => renderCalc(true));
  renderCalc(false);
  $("#calc-send").addEventListener("click", e => {
    const kind = $("input[name=kind]:checked", calcForm), opts = $$("input[name=opt]:checked", calcForm).map(c => CONFIG.calc.options[c.value].label);
    const summary = $("input[name=obj]:checked", calcForm).value + ", " + area.value + " м², " + kind.nextElementSibling.textContent.split(" · ")[0].toLowerCase() + (opts.length ? ", доп.: " + opts.join(", ").toLowerCase() : "") + " — " + sumEl.textContent;
    $("#cb-calc").value = summary;
    $("#cb-lead").textContent = "Ваш расчёт: " + summary + ". Оставьте телефон — уточним детали и приедем на замер.";
    openLayer($("#callback"), e.currentTarget);
  });

  /* =================== Квиз =================== */
  const quiz = $("#quiz"), steps = $$(".quiz__step", quiz), prev = $("#quiz-prev"), next = $("#quiz-next"), submit = $("#quiz-submit"), bar = $("#quiz-bar"), label = $("#quiz-label");
  let step = 0;
  if (CONFIG.quizGift) { const g = $("#quiz-gift"); g.textContent = "Подарок: " + CONFIG.quizGift; g.hidden = false; }
  const answered = i => i === steps.length - 1 || !!$("input:checked", steps[i]);
  function showStep(i) {
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    step = i; bar.style.transform = "scaleX(" + ((i + 1) / steps.length) + ")";
    label.textContent = "Шаг " + (i + 1) + " из " + steps.length;
    prev.disabled = i === 0; next.hidden = i === steps.length - 1; submit.hidden = i !== steps.length - 1; next.disabled = !answered(i);
  }
  quiz.addEventListener("change", e => {
    if (e.target.type !== "radio") return;
    next.disabled = false;
    if (step < steps.length - 1) setTimeout(() => { showStep(step + 1); $("legend", steps[step]).setAttribute("tabindex", "-1"); }, reduce ? 0 : 350);
  });
  next.addEventListener("click", () => { if (answered(step)) showStep(step + 1); });
  prev.addEventListener("click", () => showStep(Math.max(0, step - 1)));
  showStep(0);

  /* =================== До / После =================== */
  const ba = $("#ba"), baRange = $(".ba__range", ba);
  baRange.addEventListener("input", () => ba.style.setProperty("--pos", baRange.value + "%"));

  /* =================== Отзывы: перетаскивание =================== */
  const rv = $("#reviews");
  let down = false, sx = 0, sl = 0, moved = false;
  rv.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = rv.scrollLeft; });
  addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; rv.classList.add("is-drag"); } rv.scrollLeft = sl - dx; });
  addEventListener("pointerup", () => { if (!down) return; down = false; rv.classList.remove("is-drag"); });
  $$("[data-slide]").forEach(b => b.addEventListener("click", () => { const card = $(".review", rv); rv.scrollBy({ left: (+b.dataset.slide) * (card.offsetWidth + 20), behavior: reduce ? "auto" : "smooth" }); }));
  rv.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); rv.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * 440, behavior: "smooth" }); } });

  /* =================== Панель кейса =================== */
  $$("[data-case]").forEach(btn => btn.addEventListener("click", () => {
    if (btn.closest(".works__track")?.dataset.dragged === "1") return;
    const c = CONFIG.cases[btn.dataset.case];
    $("#case-title").textContent = c.title;
    $("#case-kicker").textContent = "Пример интерьера · " + String(+btn.dataset.case + 1).padStart(2, "0");
    $("#case-gallery").innerHTML = c.images.map(src => '<img src="' + src + '" alt="' + c.title + ' — визуализация" loading="lazy" width="1200" height="800">').join("");
    const facts = [["Площадь", c.area], ["Срок", c.term], ["Бюджет", c.budget]].filter(f => f[1]);
    $("#case-facts").innerHTML = facts.map(f => "<div><dt>" + f[0] + "</dt><dd>" + f[1] + "</dd></div>").join("");
    $("#case-facts").hidden = !facts.length;
    $("#case-text").textContent = c.text;
    openLayer($("#case"), btn);
  }));

  /* =================== FAQ: плавный аккордеон =================== */
  $$(".faq details").forEach(d => {
    const sum = $("summary", d), body = $(".faq__a", d); let anim = null;
    sum.addEventListener("click", e => {
      if (reduce) return;
      e.preventDefault(); if (anim) anim.cancel();
      const start = d.offsetHeight;
      if (!d.open) {
        d.open = true; const end = sum.offsetHeight + body.offsetHeight;
        anim = d.animate({ height: [start + "px", end + "px"] }, { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
        body.animate({ opacity: [0, 1], transform: ["translateY(-8px)", "none"] }, { duration: 520, easing: "ease-out" });
      } else {
        anim = d.animate({ height: [start + "px", sum.offsetHeight + "px"] }, { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
        anim.onfinish = () => { d.open = false; };
      }
      anim.addEventListener("finish", () => { anim = null; }); anim.addEventListener("cancel", () => { anim = null; });
    });
  });

  /* =================== Переход между страницами =================== */
  const curtain = $("#curtain");
  if (F.pageTransition && motion) $$('a[href$=".html"]:not([target])').forEach(a => a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); const href = a.href;
    gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: .7, ease: "expo.inOut", onComplete: () => { location.href = href; } });
  }));
  addEventListener("pageshow", e => { if (e.persisted && hasGSAP) gsap.set(curtain, { yPercent: 100 }); });

  /* =================== Без анимаций =================== */
  const preloader = $("#preloader");
  if (!motion || !F.preloader) preloader.remove();
  if (!motion) {
    $$(".tl").forEach(t => t.classList.add("is-active"));
    // якоря и так работают через нативную прокрутку
    return;
  }

  /* =================== Анимации (GSAP) =================== */
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("js-gsap");
  const EXPO = "expo.out", P3 = "power3.out";

  // Lenis: инерционный скролл
  if (F.smoothScroll && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // до конца прелоадера
  }
  // якорные ссылки
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href"); if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault();
    const go = () => lenis ? lenis.scrollTo(el, { offset: id === "#top" ? 0 : -8, duration: 1.4 }) : el.scrollIntoView({ behavior: "smooth" });
    active ? setTimeout(go, 350) : go();
    history.replaceState(null, "", id);
  }));

  // --- разбиение текста ---
  function splitChars(el) {
    const text = el.textContent; el.textContent = "";
    text.split(/( +)/).forEach(w => {
      if (!w) return;
      if (/^ +$/.test(w)) { el.appendChild(document.createTextNode(" ")); return; }
      const word = document.createElement("span"); word.style.display = "inline-block"; word.style.whiteSpace = "nowrap";
      [...w].forEach(ch => { const c = document.createElement("span"); c.className = "char"; c.textContent = ch; word.appendChild(c); });
      el.appendChild(word);
    });
    return $$(".char", el);
  }
  function splitLines(el) {
    const words = [];
    [...el.childNodes].forEach(n => {
      const cls = n.nodeType === 1 ? n.className : "";
      n.textContent.split(/(\s+)/).forEach(w => { if (w && !/^\s+$/.test(w)) words.push({ w, cls }); });
    });
    el.innerHTML = words.map(o => '<span class="wtmp ' + o.cls + '">' + o.w + "</span>").join(" ");
    const lines = []; let top = null;
    $$(".wtmp", el).forEach(s => { if (s.offsetTop !== top) { lines.push([]); top = s.offsetTop; } lines[lines.length - 1].push(s.outerHTML.replace("wtmp ", "").replace("wtmp", "")); });
    el.innerHTML = lines.map(l => '<span class="line-mask"><span>' + l.join(" ") + "</span></span>").join("");
    return $$(".line-mask > span", el);
  }

  // --- прелоадер → hero ---
  const heroLines = $$(".hero__line");
  heroLines.forEach(l => { const m = document.createElement("span"); m.className = "line-mask"; l.parentNode.insertBefore(m, l); m.appendChild(l); });
  const heroChars = F.heroChars ? heroLines.filter(l => !l.classList.contains("text-gold")).flatMap(splitChars) : [];
  const goldLine = heroLines.find(l => l.classList.contains("text-gold"));
  gsap.set(heroChars, { yPercent: 115 });
  gsap.set(goldLine, { yPercent: 115 });
  gsap.set("[data-hero]", { autoAlpha: 0, y: 30 });
  gsap.set(".hero__marquee", { autoAlpha: 0 });
  gsap.set(".hero__media img", { scale: 1.15 });

  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: EXPO } });
    tl.to(".hero__media img", { scale: 1, duration: 2.2, ease: "power2.out" }, 0)
      .to(heroChars, { yPercent: 0, duration: 1.2, stagger: .022 }, .1)
      .to(goldLine, { yPercent: 0, duration: 1.3 }, .1 + heroChars.length * .022 * .6)
      .to("[data-hero]", { autoAlpha: 1, y: 0, duration: 1.1, stagger: .12 }, .6)
      .to(".hero__marquee", { autoAlpha: 1, duration: 1 }, 1);
    if (lenis) lenis.start();
  }
  if (F.preloader) {
    const num = $("#pl-num"), o = { v: 0 };
    const loaded = new Promise(r => { if (document.readyState === "complete") r(); else addEventListener("load", r, { once: true }); setTimeout(r, 4000); });
    gsap.to(o, { v: 90, duration: 1.2, ease: "power2.out", onUpdate: () => { num.textContent = Math.round(o.v); gsap.set("#pl-bar", { scaleX: o.v / 100 }); } });
    Promise.all([loaded, new Promise(r => setTimeout(r, 1100)), document.fonts ? document.fonts.ready : null]).then(() => {
      gsap.to(o, { v: 100, duration: .4, ease: "power1.out", onUpdate: () => { num.textContent = Math.round(o.v); gsap.set("#pl-bar", { scaleX: o.v / 100 }); }, onComplete: () => {
        gsap.to(".preloader__in", { yPercent: -40, autoAlpha: 0, duration: .6, ease: "power3.in" });
        gsap.to(preloader, { yPercent: -100, duration: 1.1, ease: "expo.inOut", delay: .25, onComplete: () => preloader.remove() });
        gsap.delayedCall(.75, heroIntro);
      } });
    });
  } else heroIntro();

  // --- параллакс фона hero ---
  if (F.parallax) {
    gsap.to(".hero__media img", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    $$(".svc__img").forEach(w => { w.style.inset = "-10% 0"; gsap.fromTo(w, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: w.parentNode, start: "top bottom", end: "bottom top", scrub: true } }); });
  }

  // --- заголовки по строкам, подзаголовки ---
  const afterFonts = document.fonts ? document.fonts.ready : Promise.resolve();
  afterFonts.then(() => {
    if (F.titleLines) $$(".reveal-title").forEach(t => {
      const lines = splitLines(t);
      gsap.from(lines, { yPercent: 110, duration: 1.2, ease: EXPO, stagger: .1, scrollTrigger: { trigger: t, start: "top 85%" } });
    });
    ScrollTrigger.refresh();
  });
  $$(".head .eyebrow, .head__sub, .cta__lead, .cta__phone").forEach(el => gsap.from(el, { autoAlpha: 0, y: 24, duration: 1, ease: P3, scrollTrigger: { trigger: el, start: "top 88%" } }));

  // --- появление групп по очереди ---
  ScrollTrigger.batch(".stat, .review, .faq details, .calc__box, .quiz, .person figcaption, .cta .form, .footer__grid > *, .materials .marquee", {
    start: "top 88%", once: true,
    onEnter: els => gsap.fromTo(els, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, ease: P3, stagger: .1, overwrite: true })
  });
  gsap.set(".stat, .review, .faq details, .calc__box, .quiz, .person figcaption, .cta .form, .footer__grid > *, .materials .marquee", { autoAlpha: 0 });

  // --- счётчики ---
  $$(".count").forEach(c => {
    const to = +c.dataset.to; c.textContent = "0";
    ScrollTrigger.create({ trigger: c, start: "top 90%", once: true, onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: to, duration: 1.8, ease: "power2.out", onUpdate: () => { c.textContent = fmt(o.v); } }); } });
  });

  // --- картинки: шторка + масштаб ---
  if (F.imageReveal) {
    $$(".svc, .case__img, .person__ph, .ba").forEach(el => {
      const img = $("img", el);
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 88%" } });
      if (img && !el.classList.contains("svc")) gsap.fromTo(img, { scale: 1.3 }, { scale: 1.12, duration: 1.8, ease: EXPO, clearProps: "transform", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
  }

  // --- проекты: горизонтальный скролл ---
  const works = $(".works"), track = $("#works-track");
  const mm = gsap.matchMedia();
  if (F.horizontalWorks) mm.add("(min-width: 1024px)", () => {
    works.classList.add("is-pinned");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 80);
    const tw = gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: works, start: "top top", end: () => "+=" + dist(), pin: ".works__pin", scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
    return () => { works.classList.remove("is-pinned"); tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(track, { clearProps: "transform" }); };
  });
  // на тач-экранах трек свайпается нативно; мышью — можно тянуть
  let tdown = false, tsx = 0, tsl = 0;
  track.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || works.classList.contains("is-pinned")) return; tdown = true; tsx = e.clientX; tsl = track.scrollLeft; track.dataset.dragged = "0"; });
  addEventListener("pointermove", e => { if (!tdown) return; const dx = e.clientX - tsx; if (Math.abs(dx) > 5) track.dataset.dragged = "1"; track.scrollLeft = tsl - dx; });
  addEventListener("pointerup", () => { if (tdown) { tdown = false; setTimeout(() => { track.dataset.dragged = "0"; }, 50); } });

  // --- таймлайн ---
  const tlEl = $("#timeline");
  ScrollTrigger.create({ trigger: tlEl, start: "top 70%", end: "bottom 60%", scrub: true, onUpdate: s => tlEl.style.setProperty("--p", s.progress.toFixed(3)) });
  $$(".tl").forEach(t => {
    gsap.from(t, { autoAlpha: 0, x: 40, duration: 1, ease: P3, scrollTrigger: { trigger: t, start: "top 82%" } });
    ScrollTrigger.create({ trigger: t, start: "top 65%", onEnter: () => t.classList.add("is-active"), onLeaveBack: () => t.classList.remove("is-active") });
  });

  // --- гарантии: стопка карточек ---
  const cards = $$(".stack__card");
  cards.forEach((c, i) => c.style.setProperty("--i", i));
  if (F.stackCards) cards.forEach((c, i) => {
    const nextCard = cards[i + 1]; if (!nextCard) return;
    gsap.to(c, { scale: .92 - (cards.length - i) * .01, "--dim": .65, ease: "none", scrollTrigger: { trigger: nextCard, start: "top bottom", end: "top " + (100 + i * 18) + "px", scrub: true } });
  });

  // --- бегущие строки: скорость от скролла ---
  const marquees = $$(".marquee").map(m => {
    const rev = m.classList.contains("marquee--rev");
    const tracks = $$(".marquee__track", m);
    const tw = gsap.fromTo(tracks, { xPercent: rev ? -100 : 0 }, { xPercent: rev ? 0 : -100, duration: m.classList.contains("marquee--big") ? 50 : 40, ease: "none", repeat: -1 });
    return tw;
  });
  if (F.marqueeVelocity) {
    let dir = 1;
    ScrollTrigger.create({ onUpdate: s => {
      const v = s.getVelocity(); dir = v < 0 ? -1 : 1;
      const k = Math.min(4, 1 + Math.abs(v) / 500);
      marquees.forEach(tw => gsap.to(tw, { timeScale: k * dir, duration: .25, overwrite: true, onComplete: () => gsap.to(tw, { timeScale: dir, duration: 1.2 }) }));
    } });
  }

  if (!fine) return; // дальше — только для мыши

  // --- курсор ---
  if (F.cursor) {
    const cur = $("#cursor"), dot = $(".cursor__dot", cur), ring = $(".cursor__ring", cur), lab = $(".cursor__label", cur);
    root.classList.add("has-cursor");
    const dx = gsap.quickTo(dot, "x", { duration: .1 }), dy = gsap.quickTo(dot, "y", { duration: .1 });
    const rx = gsap.quickTo(ring, "x", { duration: .45, ease: P3 }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: P3 });
    addEventListener("pointermove", e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cur.classList.remove("is-hidden"); });
    document.addEventListener("mouseleave", () => cur.classList.add("is-hidden"));
    document.addEventListener("pointerover", e => {
      const ce = e.target.closest("[data-cursor]"), ie = e.target.closest("a, button, label, summary, input, select");
      cur.classList.remove("is-link", "is-label");
      if (ie && ie.matches("input[type=range]")) { cur.classList.add("is-label"); lab.textContent = "Тяни"; }
      else if (ce && (!ie || ie === ce)) { cur.classList.add("is-label"); lab.textContent = ce.dataset.cursor === "view" ? "Смотреть" : "Тяни"; }
      else if (ie) cur.classList.add("is-link");
    });
  }

  // --- магнитные кнопки ---
  if (F.magnet) $$("[data-magnet]").forEach(b => {
    const qx = gsap.quickTo(b, "x", { duration: .6, ease: "power3" }), qy = gsap.quickTo(b, "y", { duration: .6, ease: "power3" });
    b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .35); qy((e.clientY - r.top - r.height / 2) * .45); });
    b.addEventListener("pointerleave", () => { gsap.to(b, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, .4)" }); });
  });

  // --- 3D-наклон ---
  if (F.tilt) $$(".tilt").forEach(c => {
    gsap.set(c, { transformPerspective: 1000 });
    const qrx = gsap.quickTo(c, "rotationX", { duration: .6, ease: P3 }), qry = gsap.quickTo(c, "rotationY", { duration: .6, ease: P3 });
    c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(); qry(((e.clientX - r.left) / r.width - .5) * 8); qrx(-((e.clientY - r.top) / r.height - .5) * 8); });
    c.addEventListener("pointerleave", () => { qrx(0); qry(0); });
  });
})();

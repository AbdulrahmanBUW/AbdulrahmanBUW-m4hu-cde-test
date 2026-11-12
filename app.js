// DEAXO CDE course: end test. Questions come from questions.json (no answers inside); scoring runs in Supabase (submit_test).
(function () {
  "use strict";
  var T = {
    de: { title: "Abschlusstest", course: "CDE-Schulung · Projekt M4 Hook-Up",
          intro: "Beantworten Sie alle Fragen richtig, um den Test zu bestehen. Sie können ihn beliebig oft wiederholen.",
          name: "Vor- und Nachname", company: "Firma", email: "E-Mail (optional)", emailHint: "Nur für Rückfragen der DEAXO-Administratoren.",
          group: "Ihre Gruppe", designers: "DEAXO-Planung", subcontractors: "Nachunternehmer",
          consent: "Ich bin einverstanden, dass Name, Firma, Antworten und Ergebnis für die Schulungsdokumentation gespeichert werden. Nur DEAXO-Administratoren sehen die Ergebnisse.",
          start: "Test starten", next: "Weiter", back: "Zurück", submit: "Antworten abschicken", question: "Frage", of: "von",
          chapter: "Kapitel", passed: "Bestanden", failed: "Noch nicht bestanden", right: "richtig",
          failText: "Diese Fragen waren noch nicht richtig. Sehen Sie sich die genannten Kapitel noch einmal an und starten Sie den Test erneut.",
          passText: "Alle Antworten richtig. Vielen Dank! Hier sind die Antworten mit Erklärung.",
          retake: "Test wiederholen", rewatch: "Kapitel ansehen", sending: "Wird gesendet …",
          errSend: "Senden fehlgeschlagen. Bitte prüfen Sie die Verbindung und versuchen Sie es erneut.", errLoad: "Der Test konnte nicht geladen werden.",
          errConfig: "Der Test ist noch nicht eingerichtet (Supabase-Zugang fehlt in config.js).", pick: "Bitte eine Antwort wählen." },
    en: { title: "Final test", course: "CDE training · Project M4 Hook-Up",
          intro: "Answer every question correctly to pass. You can retake the test as often as you like.",
          name: "Full name", company: "Company", email: "E-mail (optional)", emailHint: "Only for questions from the DEAXO administrators.",
          group: "Your group", designers: "DEAXO design", subcontractors: "Subcontractor",
          consent: "I agree that my name, company, answers and result are stored for training records. Only DEAXO administrators see the results.",
          start: "Start test", next: "Next", back: "Back", submit: "Submit answers", question: "Question", of: "of",
          chapter: "Chapter", passed: "Passed", failed: "Not passed yet", right: "correct",
          failText: "These questions were not right yet. Watch the chapters named below again, then retake the test.",
          passText: "All answers correct. Thank you! Here are the answers with explanations.",
          retake: "Retake test", rewatch: "Watch chapter", sending: "Sending …",
          errSend: "Sending failed. Check your connection and try again.", errLoad: "The test could not be loaded.",
          errConfig: "The test is not set up yet (Supabase access missing in config.js).", pick: "Please choose an answer." },
    ru: { title: "Итоговый тест", course: "Обучение CDE · Проект M4 Hook-Up",
          intro: "Чтобы сдать тест, ответьте правильно на все вопросы. Тест можно проходить сколько угодно раз.",
          name: "Имя и фамилия", company: "Компания", email: "E-mail (необязательно)", emailHint: "Только для вопросов администраторов DEAXO.",
          group: "Ваша группа", designers: "Проектирование DEAXO", subcontractors: "Субподрядчик",
          consent: "Я согласен(на), что имя, компания, ответы и результат сохраняются для учёта обучения. Результаты видят только администраторы DEAXO.",
          start: "Начать тест", next: "Далее", back: "Назад", submit: "Отправить ответы", question: "Вопрос", of: "из",
          chapter: "Глава", passed: "Сдано", failed: "Пока не сдано", right: "верно",
          failText: "На эти вопросы ответ пока неверный. Посмотрите указанные главы ещё раз и пройдите тест заново.",
          passText: "Все ответы верны. Спасибо! Ниже ответы с пояснениями.",
          retake: "Пройти заново", rewatch: "Смотреть главу", sending: "Отправка …",
          errSend: "Не удалось отправить. Проверьте соединение и попробуйте ещё раз.", errLoad: "Не удалось загрузить тест.",
          errConfig: "Тест ещё не настроен (нет доступа к Supabase в config.js).", pick: "Выберите ответ." }
  };
  var S = { lang: "de", step: "start", data: null, who: { name: "", company: "", email: "", branch: "" }, consent: false, qs: [], i: 0, answers: {}, result: null, error: "" };
  try { var saved = localStorage.getItem("cdeTestLang"); if (saved && T[saved]) S.lang = saved; } catch (e) {}
  var app = document.getElementById("app"), bar = document.getElementById("bar");
  var cfg = window.TEST_CONFIG || {};
  var configured = cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.supabaseUrl.indexOf("YOUR-PROJECT") < 0;
  var sb = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false } }) : null;

  function t(k) { return T[S.lang][k]; }
  function L(o) { return o ? (o[S.lang] || o.de || "") : ""; }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function chapterName(id) { var c = S.data && S.data.chapters[id]; return c ? (t("chapter") + " " + c.label + " · " + L(c.title)) : id; }

  function render() {
    document.documentElement.lang = S.lang;
    document.title = t("title") + " · " + t("course");
    document.querySelectorAll(".langs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === S.lang)); });
    app.textContent = "";
    bar.style.width = S.step === "quiz" ? Math.round(100 * S.i / S.qs.length) + "%" : (S.step === "result" ? "100%" : "0");
    if (!S.data) { app.appendChild(el("p", { text: S.error || "…" })); return; }
    ({ start: viewStart, quiz: viewQuiz, result: viewResult })[S.step]();
    var h = app.querySelector("h1, h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  function viewStart() {
    var f = el("form", { class: "card", novalidate: "", onsubmit: function (e) { e.preventDefault(); begin(); } });
    function field(key, type) {
      var id = "f-" + key;
      f.appendChild(el("label", { for: id, text: t(key) }));
      f.appendChild(el("input", { id: id, type: type, value: S.who[key], autocomplete: key === "email" ? "email" : key === "name" ? "name" : "organization",
        oninput: function (e) { S.who[key] = e.target.value; update(); } }));
    }
    field("name", "text"); field("company", "text"); field("email", "email");
    f.appendChild(el("div", { class: "hint", text: t("emailHint") }));
    f.appendChild(el("label", { text: t("group") }));
    var grp = el("div", { class: "choice", role: "radiogroup" });
    ["designers", "subcontractors"].forEach(function (b) {
      var inp = el("input", { type: "radio", name: "branch", value: b, "aria-label": t(b), onchange: function () { S.who.branch = b; update(); } });
      if (S.who.branch === b) inp.checked = true;
      grp.appendChild(el("label", { class: "opt" }, [inp, el("span", { text: t(b) })]));
    });
    f.appendChild(grp);
    var c = el("input", { type: "checkbox", id: "f-consent", onchange: function (e) { S.consent = e.target.checked; update(); } });
    c.checked = S.consent;
    f.appendChild(el("label", { class: "consent", for: "f-consent" }, [c, el("span", { text: t("consent") })]));
    var go = el("button", { class: "btn", type: "submit", text: t("start") });
    f.appendChild(el("div", { class: "row" }, [el("span"), go]));
    if (!configured) f.appendChild(el("p", { class: "err", text: t("errConfig") }));
    function update() { go.disabled = !(S.who.name.trim().length >= 2 && S.who.company.trim().length >= 2 && S.who.branch && S.consent && configured); }
    update();
    app.appendChild(el("div", { class: "kick", text: t("course") }));
    app.appendChild(el("h1", { text: t("title") }));
    app.appendChild(el("p", { class: "lead", text: t("intro") }));
    app.appendChild(f);
  }

  function begin() {
    S.qs = S.data.questions.filter(function (q) { return q.audience === "shared" || q.audience === S.who.branch; });
    S.i = 0; S.answers = {}; S.result = null; S.error = ""; S.step = "quiz"; render();
  }

  function viewQuiz() {
    var q = S.qs[S.i], last = S.i === S.qs.length - 1;
    var card = el("form", { class: "card", onsubmit: function (e) { e.preventDefault(); if (S.answers[q.id] == null) return; if (last) send(); else { S.i++; render(); } } });
    card.appendChild(el("div", { class: "qmeta", text: t("question") + " " + (S.i + 1) + " " + t("of") + " " + S.qs.length + " · " + chapterName(q.chapter) }));
    card.appendChild(el("h2", { id: "qtext", text: L(q.q) }));
    var grp = el("div", { class: "choice", role: "radiogroup", "aria-labelledby": "qtext" });
    q.options.forEach(function (o, k) {
      var inp = el("input", { type: "radio", name: q.id, value: String(k), onchange: function () { S.answers[q.id] = k; nxt.disabled = false; } });
      if (S.answers[q.id] === k) inp.checked = true;
      grp.appendChild(el("label", { class: "opt" }, [inp, el("span", { text: L(o) })]));
    });
    card.appendChild(grp);
    var nxt = el("button", { class: "btn", type: "submit", text: last ? t("submit") : t("next") });
    nxt.disabled = S.answers[q.id] == null;
    var back = el("button", { class: "btn ghost", type: "button", text: t("back"), onclick: function () { if (S.i > 0) { S.i--; render(); } else { S.step = "start"; render(); } } });
    card.appendChild(el("div", { class: "row" }, [back, nxt]));
    if (S.error) card.appendChild(el("p", { class: "err", role: "alert", text: S.error }));
    app.appendChild(card);
  }

  function send() {
    S.error = "";
    var btn = app.querySelector("button[type=submit]"); if (btn) { btn.disabled = true; btn.textContent = t("sending"); }
    sb.rpc("submit_test", { p: { version: S.data.version, name: S.who.name.trim(), company: S.who.company.trim(), email: S.who.email.trim(),
                               branch: S.who.branch, lang: S.lang, answers: S.answers } })
      .then(function (r) {
        if (r.error) throw r.error;
        S.result = r.data; S.step = "result"; render();
      })
      .catch(function () { S.error = t("errSend"); render(); });
  }

  function viewResult() {
    var R = S.result;
    app.appendChild(el("span", { class: "badge " + (R.passed ? "ok" : "no"), text: R.passed ? t("passed") : t("failed") }));
    app.appendChild(el("h1", { text: t("title") }));
    app.appendChild(el("div", { class: "score", text: R.score + " / " + R.total }));
    app.appendChild(el("p", { class: "lead", text: R.passed ? t("passText") : t("failText") }));
    var ul = el("ul", { class: "list" });
    if (R.passed) {
      S.qs.forEach(function (q) {
        var ok = R.correct && R.correct[q.id] != null ? q.options[R.correct[q.id]] : null;
        ul.appendChild(el("li", { class: "good" }, [el("div", { text: L(q.q) }), ok ? el("div", { text: "✓ " + L(ok) }) : null,
          R.explain && R.explain[q.id] ? el("div", { class: "sm", text: L(R.explain[q.id]) }) : null]));
      });
    } else {
      var seen = {};
      S.qs.forEach(function (q) {
        if ((R.wrong || []).indexOf(q.id) < 0) return;
        var li = el("li", {}, [el("div", { text: L(q.q) }), el("div", { class: "sm", text: chapterName(q.chapter) })]);
        if (cfg.videoBaseUrl && !seen[q.chapter]) {
          li.appendChild(el("a", { href: cfg.videoBaseUrl.replace(/\/?$/, "/") + q.chapter + "_" + S.lang + ".mp4", target: "_blank", rel: "noopener", text: t("rewatch") }));
          seen[q.chapter] = 1;
        }
        ul.appendChild(li);
      });
    }
    app.appendChild(ul);
    app.appendChild(el("div", { class: "row" }, [el("span"), el("button", { class: "btn", type: "button", text: t("retake"), onclick: function () { S.step = "start"; render(); } })]));
  }

  document.querySelectorAll(".langs button").forEach(function (b) {
    b.addEventListener("click", function () { S.lang = b.dataset.lang; try { localStorage.setItem("cdeTestLang", S.lang); } catch (e) {} render(); });
  });
  fetch("questions.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) { S.data = d; render(); })
    .catch(function () { S.error = t("errLoad"); render(); });
  render();
})();

// Results view: e-mail magic-link sign-in; Supabase row-level security returns rows only to e-mails listed in public.admins.
(function () {
  "use strict";
  var cfg = window.TEST_CONFIG || {};
  var app = document.getElementById("app"), who = document.getElementById("who");
  if (!cfg.supabaseUrl || cfg.supabaseUrl.indexOf("YOUR-PROJECT") >= 0) { app.textContent = "config.js: Supabase-Zugang fehlt."; return; }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  var Q = null, rows = [], filter = { branch: "", passed: "" };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function qtext(id) { var q = Q && Q.questions.find(function (x) { return x.id === id; }); return q ? q.q.de : id; }

  function signIn() {
    app.textContent = "";
    var msg = el("p", { class: "hint", role: "status" });
    var inp = el("input", { type: "email", id: "mail", autocomplete: "username" });
    var pw = el("input", { type: "password", id: "pw", autocomplete: "current-password" });
    function mail() { return inp.value.trim().toLowerCase(); }
    var link = el("button", { class: "btn ghost", type: "button", text: "Stattdessen Anmeldelink per E-Mail", onclick: function () {
      if (!mail()) { msg.textContent = "Bitte zuerst die E-Mail-Adresse eingeben."; return; }
      sb.auth.signInWithOtp({ email: mail(), options: { emailRedirectTo: location.href.split("#")[0], shouldCreateUser: false } })
        .then(function (r) { msg.textContent = r.error ? "Fehler: " + r.error.message : "Link gesendet. Bitte E-Mail öffnen und den Link in diesem Browser anklicken."; });
    } });
    var f = el("form", { class: "card", onsubmit: function (e) {
      e.preventDefault();
      msg.textContent = "Anmeldung …";
      sb.auth.signInWithPassword({ email: mail(), password: pw.value })
        .then(function (r) { if (r.error) msg.textContent = "Anmeldung fehlgeschlagen: E-Mail oder Passwort falsch."; else pw.value = ""; });
    } }, [el("label", { for: "mail", text: "E-Mail-Adresse (Administrator)" }), inp,
         el("label", { for: "pw", text: "Passwort" }), pw,
         el("div", { class: "row" }, [link, el("button", { class: "btn", type: "submit", text: "Anmelden" })]), msg]);
    app.appendChild(el("h1", { text: "Testergebnisse" }));
    app.appendChild(el("p", { class: "lead", text: "Nur E-Mail-Adressen aus der Admin-Liste sehen Ergebnisse." }));
    app.appendChild(f);
  }

  function load(session) {
    who.textContent = session.user.email + " · ";
    who.appendChild(el("a", { href: "#", text: "Abmelden", onclick: function (e) { e.preventDefault(); sb.auth.signOut().then(function () { location.reload(); }); } }));
    Promise.all([fetch("questions.json", { cache: "no-store" }).then(function (r) { return r.json(); }),
                 sb.from("submissions").select("*").order("created_at", { ascending: false }).limit(5000)])
      .then(function (res) {
        Q = res[0];
        if (res[1].error) throw res[1].error;
        rows = res[1].data || [];
        render();
      })
      .catch(function (e) { app.textContent = "Laden fehlgeschlagen: " + (e.message || e); });
  }

  function render() {
    app.textContent = "";
    var vis = rows.filter(function (r) { return (!filter.branch || r.branch === filter.branch) && (!filter.passed || String(r.passed) === filter.passed); });
    app.appendChild(el("h1", { text: "Testergebnisse" }));
    if (!rows.length) { app.appendChild(el("p", { class: "lead", text: "Keine Ergebnisse sichtbar. Entweder hat noch niemand den Test abgeschickt, oder diese E-Mail steht nicht in der Admin-Liste." })); return; }
    var passedN = vis.filter(function (r) { return r.passed; }).length;
    var people = {}; vis.forEach(function (r) { var k = r.name + "|" + r.company; people[k] = people[k] || r.passed; });
    var pn = Object.keys(people).length, pp = Object.keys(people).filter(function (k) { return people[k]; }).length;
    app.appendChild(el("p", { class: "lead", text: vis.length + " Abgaben · " + passedN + " bestanden · " + pn + " Personen, davon " + pp + " mit bestandenem Test" }));
    // filters + export
    function sel(key, opts) {
      var s = el("select", { onchange: function (e) { filter[key] = e.target.value; render(); } });
      opts.forEach(function (o) { var op = el("option", { value: o[0], text: o[1] }); if (filter[key] === o[0]) op.selected = true; s.appendChild(op); });
      return s;
    }
    app.appendChild(el("div", { class: "row" }, [
      el("span", {}, [sel("branch", [["", "Alle Gruppen"], ["designers", "DEAXO-Planung"], ["subcontractors", "Nachunternehmer"]]), " ",
                      sel("passed", [["", "Alle"], ["true", "Bestanden"], ["false", "Nicht bestanden"]])]),
      el("button", { class: "btn ghost", type: "button", text: "CSV exportieren", onclick: function () { csv(vis); } })]));
    // questions most often wrong
    var miss = {}, asked = {};
    vis.forEach(function (r) { Object.keys(r.answers || {}).forEach(function (q) { asked[q] = (asked[q] || 0) + 1; }); (r.wrong || []).forEach(function (q) { miss[q] = (miss[q] || 0) + 1; }); });
    var top = Object.keys(miss).sort(function (a, b) { return miss[b] / asked[b] - miss[a] / asked[a]; }).slice(0, 8);
    if (top.length) {
      app.appendChild(el("h2", { text: "Am häufigsten falsch (Hinweis auf unklare Kapitel)", style: "margin-top:28px" }));
      var tb = el("table", {}, [el("tr", {}, [el("th", { text: "Frage" }), el("th", { text: "Kapitel" }), el("th", { text: "falsch" })])]);
      top.forEach(function (q) {
        var qq = Q.questions.find(function (x) { return x.id === q; });
        tb.appendChild(el("tr", {}, [el("td", { text: qtext(q) }), el("td", { text: qq ? qq.chapter : "" }), el("td", { text: miss[q] + " / " + (asked[q] || miss[q]) + " (" + Math.round(100 * miss[q] / (asked[q] || miss[q])) + " %)" })]));
      });
      app.appendChild(tb);
    }
    // submissions
    app.appendChild(el("h2", { text: "Abgaben", style: "margin-top:28px" }));
    var t = el("table", {}, [el("tr", {}, ["Datum", "Name", "Firma", "E-Mail", "Gruppe", "Sprache", "Ergebnis", "Falsch"].map(function (h) { return el("th", { text: h }); }))]);
    vis.forEach(function (r) {
      t.appendChild(el("tr", {}, [new Date(r.created_at).toLocaleString("de-DE"), r.name, r.company, r.email || "", r.branch === "designers" ? "DEAXO-Planung" : "Nachunternehmer",
        r.lang.toUpperCase(), r.score + "/" + r.total + (r.passed ? " ✓" : ""), (r.wrong || []).join(", ")].map(function (v) { return el("td", { text: String(v) }); })));
    });
    app.appendChild(t);
  }

  function csv(vis) {
    var head = ["created_at", "name", "company", "email", "branch", "lang", "score", "total", "passed", "wrong"];
    var esc = function (v) { v = v == null ? "" : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [head.join(";")].concat(vis.map(function (r) { return head.map(function (h) { return esc(h === "wrong" ? (r.wrong || []).join(" ") : r[h]); }).join(";"); }));
    var a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })), download: "testergebnisse.csv" });
    document.body.appendChild(a); a.click(); a.remove();
  }

  sb.auth.getSession().then(function (r) { if (r.data.session) load(r.data.session); else signIn(); });
  sb.auth.onAuthStateChange(function (ev, session) { if (ev === "SIGNED_IN" && session) load(session); });
})();

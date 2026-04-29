// ============================================================
// SOFIS HUB — script.js
// ============================================================

const html       = document.documentElement;
const menuBtn    = document.getElementById("mobileMenuBtn");
const mobilePanel  = document.getElementById("mobileMenuPanel");

// Tema único: site sempre escuro.
html.classList.add("dark-mode");
html.style.colorScheme = "dark";
localStorage.setItem("theme", "dark");

// ── MENU MOBILE ─────────────────────────────────────────────
if (menuBtn && mobilePanel) {
  // Abre / fecha ao clicar no botão hambúrguer
  menuBtn.addEventListener("click", () => {
    const isOpen = mobilePanel.classList.toggle("active");
    menuBtn.classList.toggle("active", isOpen);

    // CORREÇÃO: atualiza aria-expanded e aria-hidden para acessibilidade
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    menuBtn.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    mobilePanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  });

  // CORREÇÃO: fecha o menu ao clicar em qualquer link dentro do painel
  mobilePanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobilePanel.classList.remove("active");
      menuBtn.classList.remove("active");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Abrir menu");
      mobilePanel.setAttribute("aria-hidden", "true");
    });
  });

  // CORREÇÃO: fecha o menu ao pressionar Escape (acessibilidade por teclado)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobilePanel.classList.contains("active")) {
      mobilePanel.classList.remove("active");
      menuBtn.classList.remove("active");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Abrir menu");
      mobilePanel.setAttribute("aria-hidden", "true");
      menuBtn.focus(); // devolve o foco ao botão
    }
  });
}

// ── PREFETCH DE PÁGINAS INTERNAS ─────────────────────────────
// Aquece HTMLs internos ao passar o mouse/tocar nos links para reduzir espera.
const prefetchedPages = new Set();

function prefetchPage(url) {
  if (prefetchedPages.has(url)) return;
  prefetchedPages.add(url);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  link.as = "document";
  document.head.appendChild(link);
}

function setupInstantNavigation() {
  const links = [...document.querySelectorAll('a[href$=".html"], a[href="/"]')]
    .map((anchor) => anchor.getAttribute("href"))
    .filter((href) => href && !href.startsWith("http") && !href.startsWith("#"));

  document.querySelectorAll('a[href$=".html"], a[href="/"]').forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;

    anchor.addEventListener("pointerenter", () => prefetchPage(href), { once: true });
    anchor.addEventListener("touchstart", () => prefetchPage(href), { once: true, passive: true });
  });

  const warmPages = () => {
    links.forEach(prefetchPage);
    ["checkout.html", "checkout-mimos.html"].forEach(prefetchPage);
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(warmPages, { timeout: 1200 });
  } else {
    setTimeout(warmPages, 300);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupInstantNavigation, { once: true });
} else {
  setupInstantNavigation();
}
// ============================================================
// SOFIS HUB — script.js
// ============================================================

const html       = document.documentElement;
const themeToggle  = document.getElementById("themeToggle");
const menuBtn    = document.getElementById("mobileMenuBtn");
const mobilePanel  = document.getElementById("mobileMenuPanel");

// CORREÇÃO: bloco de leitura de tema REMOVIDO daqui.
// Ele já existe no <script> inline do <head> do HTML e precisa rodar
// antes do CSS para evitar flash. Duplicar aqui é redundante.

// ── TEMA ────────────────────────────────────────────────────
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = html.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

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

// ── PAGE READY ───────────────────────────────────────────────
// CORREÇÃO: usa "load" em vez de "DOMContentLoaded" para garantir que
// imagens como sofis.jpg já foram carregadas antes de exibir a página,
// evitando saltos visuais (layout shift).
window.addEventListener("load", () => {
  html.classList.add("page-ready");
});
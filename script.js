const html = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const menuBtn = document.getElementById("mobileMenuBtn");
const mobilePanel = document.getElementById("mobileMenuPanel");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  html.classList.add("dark-mode");
}

if (savedTheme === "light") {
  html.classList.remove("dark-mode");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    html.classList.toggle("dark-mode");

    localStorage.setItem(
      "theme",
      html.classList.contains("dark-mode") ? "dark" : "light"
    );
  });
}

if (menuBtn && mobilePanel) {
  menuBtn.addEventListener("click", () => {
    mobilePanel.classList.toggle("active");
    menuBtn.classList.toggle("active");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  html.classList.add("page-ready");
});
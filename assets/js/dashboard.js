document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("themeSwitch");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      document.documentElement.classList.toggle("light");
    });
  }

  document.querySelectorAll(".card[data-link]").forEach(card => {
    card.addEventListener("click", () => {
      location.href = card.dataset.link;
    });
  });
});

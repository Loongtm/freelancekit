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
// ========= Pro Dialog logic =========
const proDialog = document.getElementById("proDialog");
const unlockBtn = document.querySelector('a[href="pages/pro.html"], .btn[data-pro]');
const buyBtn = document.getElementById("buyPro");
const closeBtn = document.getElementById("closePro");

if (unlockBtn && proDialog) {
  unlockBtn.addEventListener("click", e => {
    e.preventDefault();
    proDialog.classList.add("show");
  });
}
if (closeBtn) closeBtn.addEventListener("click", ()=> proDialog.classList.remove("show"));
if (buyBtn) {
  buyBtn.addEventListener("click", () => {
    // 安全的 Stripe Checkout 跳转链接（测试用）
    window.open("https://buy.stripe.com/test_freelancekit_pro_example", "_blank");
  });
}

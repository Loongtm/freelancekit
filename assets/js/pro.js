// assets/js/pro.js
window.FK_PRO = (function(){
  const KEY = "fk_pro_token";
  const EMAIL = "fk_pro_email";

  function isPro(){ return !!localStorage.getItem(KEY); }
  function getEmail(){ return localStorage.getItem(EMAIL) || ""; }
  function setSession(token, email){
    localStorage.setItem(KEY, token);
    localStorage.setItem(EMAIL, email || "");
    renderBadge();
  }
  function clear(){
    localStorage.removeItem(KEY);
    localStorage.removeItem(EMAIL);
    renderBadge();
  }
  function renderBadge(){
    const nav = document.querySelector('.navbar .actions');
    if(!nav) return;
    let badge = document.getElementById('proBadge');
    if(isPro()){
      if(!badge){
        badge = document.createElement('span');
        badge.id = 'proBadge';
        badge.className = 'btn';
        badge.style.background = '#facc15';
        badge.style.color = '#111';
        badge.textContent = 'PRO';
        badge.title = getEmail();
        nav.prepend(badge);
      } else {
        badge.style.display = 'inline-block';
        badge.title = getEmail();
      }
      const unlock = document.querySelector('[data-pro], a[href*="pro.html"]');
      if (unlock) unlock.textContent = '✅ Pro Active';
    } else {
      if(badge) badge.style.display = 'none';
      const unlock = document.querySelector('[data-pro], a[href*="pro.html"]');
      if (unlock) unlock.textContent = '🔒 Unlock Pro';
    }
  }
  document.addEventListener('DOMContentLoaded', renderBadge);
  return { isPro, setSession, clear, getEmail };
})();

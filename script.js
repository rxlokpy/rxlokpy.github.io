// ── card entrance animation ──
const cards = document.querySelectorAll('.card');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay ?? 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay * 120);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

cards.forEach((card) => observer.observe(card));


// ── typewriter effect on name ──
const nameEl = document.querySelector('.name');
const fullName = 'DrHiroshima';
const cursor = '<span class="cursor">_</span>';

nameEl.innerHTML = cursor;

let i = 0;
const typeInterval = setInterval(() => {
  if (i < fullName.length) {
    nameEl.innerHTML = fullName.slice(0, i + 1) + cursor;
    i++;
  } else {
    clearInterval(typeInterval);
  }
}, 90);


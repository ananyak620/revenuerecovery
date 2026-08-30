/* ============================================
   ReviveAI — Animations
   Animated counters, transitions, and effects
   ============================================ */

const Animations = (() => {
  // Animate a number counting up from 0 to target
  function countUp(element, target, duration = 1500, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      element.textContent = prefix + (isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // Stagger children animations
  function staggerChildren(parent, delay = 80) {
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      children[i].style.opacity = '0';
      children[i].style.transform = 'translateY(16px)';
      children[i].style.transition = `all 0.4s ease-out ${i * delay}ms`;
      setTimeout(() => {
        children[i].style.opacity = '1';
        children[i].style.transform = 'translateY(0)';
      }, 50);
    }
  }

  // Fade in an element
  function fadeIn(element, duration = 400) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';
    element.style.transition = `all ${duration}ms ease-out`;
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  // Smooth remove
  function fadeOut(element, duration = 300) {
    return new Promise(resolve => {
      element.style.transition = `all ${duration}ms ease-in`;
      element.style.opacity = '0';
      element.style.transform = 'translateX(40px)';
      setTimeout(() => {
        element.remove();
        resolve();
      }, duration);
    });
  }

  // Typewriter effect
  function typeWriter(element, text, speed = 20) {
    return new Promise(resolve => {
      let i = 0;
      element.textContent = '';

      function type() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          resolve();
        }
      }
      type();
    });
  }

  // Pulse a glow effect
  function pulseGlow(element, color = 'rgba(99, 102, 241, 0.3)', duration = 1000) {
    element.style.boxShadow = `0 0 0 0 ${color}`;
    element.style.transition = `box-shadow ${duration}ms ease-out`;
    requestAnimationFrame(() => {
      element.style.boxShadow = `0 0 30px 10px transparent`;
    });
  }

  // Intersection observer for scroll animations
  function observeElements(selector, callback) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(selector).forEach(el => observer.observe(el));
  }

  return {
    countUp,
    staggerChildren,
    fadeIn,
    fadeOut,
    typeWriter,
    pulseGlow,
    observeElements
  };
})();

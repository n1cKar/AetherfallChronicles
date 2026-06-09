/** Device detection for mobile layout & performance. */

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
    || 'ontouchstart' in window
    || navigator.maxTouchPoints > 0;
}

export function isMobileDevice(): boolean {
  return isTouchDevice() && (
    window.innerWidth < 1024
    || /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent)
  );
}

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

export function applyMobileDocumentClass(): void {
  if (isMobileDevice()) document.body.classList.add('mobile-mode');
  else document.body.classList.remove('mobile-mode');
  document.body.classList.toggle('touch-device', isTouchDevice());
  document.body.classList.toggle('portrait', isPortrait());
}

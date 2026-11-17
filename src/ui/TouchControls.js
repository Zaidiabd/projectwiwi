export class TouchControls {
  constructor(onBurstTrigger) {
    this.root = document.getElementById('touch-controls');
    this.canvas = document.getElementById('game-canvas');
    this.burstBtn = document.getElementById('touch-burst');

    this.isTouchDevice =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    this.state = {
      left: false,
      right: false,
      boost: false,
      forward: false
    };

    // Track active pointerIds per control for rock-solid multi-touch on iOS & Android
    this.pointers = {
      left: new Set(),
      right: new Set(),
      boost: new Set()
    };
    this.elements = {
      left: document.getElementById('touch-left'),
      right: document.getElementById('touch-right'),
      boost: document.getElementById('touch-boost')
    };

    this.canvasPointers = new Map(); // pointerId -> 'left' | 'right'
    this.visible = false;
    this.onBurstTrigger = onBurstTrigger;

    this.bindHold('left');
    this.bindHold('right');
    this.bindHold('boost');
    this.bindBurst();
    this.bindCanvasTouch();

    window.addEventListener('pointerup', (e) => this.releasePointer(e.pointerId));
    window.addEventListener('pointercancel', (e) => this.releasePointer(e.pointerId));
    window.addEventListener('blur', () => this.reset());
  }

  bindHold(key) {
    const el = this.elements[key];
    el.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        this.pointers[key].add(e.pointerId);
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Non-fatal on browsers without capture support
        }
        this.syncStates();
      },
      { passive: false }
    );
  }

  bindBurst() {
    this.burstBtn.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        this.burstBtn.classList.add('active');
        this.state.forward = true;
        if (this.onBurstTrigger) this.onBurstTrigger();
      },
      { passive: false }
    );
    const clear = () => this.burstBtn.classList.remove('active');
    this.burstBtn.addEventListener('pointerup', clear);
    this.burstBtn.addEventListener('pointercancel', clear);
  }

  bindCanvasTouch() {
    if (!this.canvas) return;
    const handleCanvas = (e) => {
      if (!this.visible || e.pointerType === 'mouse') return;
      const side = e.clientX < window.innerWidth * 0.5 ? 'left' : 'right';
      this.canvasPointers.set(e.pointerId, side);
      this.syncStates();
    };

    this.canvas.addEventListener('pointerdown', handleCanvas, { passive: true });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.canvasPointers.has(e.pointerId)) {
        handleCanvas(e);
      }
    }, { passive: true });
  }

  releasePointer(pointerId) {
    let changed = false;
    for (const key of ['left', 'right', 'boost']) {
      if (this.pointers[key].delete(pointerId)) {
        changed = true;
      }
    }
    if (this.canvasPointers.delete(pointerId)) {
      changed = true;
    }
    if (changed) this.syncStates();
  }

  syncStates() {
    let canvasLeft = false;
    let canvasRight = false;
    for (const side of this.canvasPointers.values()) {
      if (side === 'left') canvasLeft = true;
      else canvasRight = true;
    }

    this.state.left = this.pointers.left.size > 0 || canvasLeft;
    this.state.right = this.pointers.right.size > 0 || canvasRight;
    this.state.boost = this.pointers.boost.size > 0;

    for (const key of ['left', 'right', 'boost']) {
      this.elements[key].classList.toggle('active', this.pointers[key].size > 0);
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    const show = this.visible && (this.isTouchDevice || window.innerWidth <= 820);
    this.root.classList.toggle('hidden', !show);
    // Mobile auto-runs forward cleanly when touch controls are active so players focus on steering, boost & burst
    this.state.forward = show;
  }

  updateBurstUI(state) {
    if (!this.visible) return;
    this.burstBtn.classList.remove('locked', 'ready', 'stage2');
    if (!state.burstUnlocked) {
      this.burstBtn.classList.add('locked');
      this.burstBtn.textContent = `${Math.max(0, Math.ceil(26 - state.runElapsed))}s`;
    } else if (state.stage2BurstActive || state.burstStage === 2) {
      this.burstBtn.classList.add(state.burstCharge >= 0.35 || state.stage2BurstActive ? 'stage2' : 'locked');
      this.burstBtn.textContent = state.stage2BurstActive ? 'MAX II' : 'BURST II';
    } else if (state.burstCharge >= 0.35) {
      this.burstBtn.classList.add('ready');
      this.burstBtn.textContent = 'BURST';
    } else {
      this.burstBtn.classList.add('locked');
      this.burstBtn.textContent = `${Math.round(state.burstCharge * 100)}%`;
    }
  }

  reset() {
    for (const key of ['left', 'right', 'boost']) {
      this.pointers[key].clear();
      this.elements[key].classList.remove('active');
    }
    this.canvasPointers.clear();
    this.state.left = false;
    this.state.right = false;
    this.state.boost = false;
    this.state.forward = false;
  }
}

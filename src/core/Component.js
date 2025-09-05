// src/core/Component.js - Base Component Class
export class Component {
  constructor(element, props = {}) {
    this.element = element;
    this.props = { ...props };
    this.state = {};
    this.children = new Set();
    this.eventListeners = new Map();
    this.isMounted = false;
    this.animationFrame = null;

    if (this.element) {
      this.mount();
    }
  }

  // Lifecycle methods
  mount() {
    if (this.isMounted) return;

    this.isMounted = true;
    this.onMount();
    this.render();
    this.bindEvents();

    console.log(`${this.constructor.name} mounted`);
  }

  unmount() {
    if (!this.isMounted) return;

    this.isMounted = false;

    // Cancel any pending animations
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Remove event listeners
    this.unbindEvents();

    // Unmount children
    this.children.forEach(child => {
      if (child.unmount) child.unmount();
    });
    this.children.clear();

    this.onUnmount();
    console.log(`${this.constructor.name} unmounted`);
  }

  update(changes) {
    if (!this.isMounted) return;

    // Check if this component should update
    if (this.shouldUpdate && !this.shouldUpdate(changes)) {
      return;
    }

    this.onUpdate(changes);
    this.render();
  }

  // State management
  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };

    if (this.shouldUpdate && !this.shouldUpdate({}, prevState, this.state)) {
      return;
    }

    this.onStateChange(prevState, this.state);
    this.render();
  }

  // Event handling
  addEventListener(element, event, handler, options = {}) {
    if (!element) return;

    const key = `${event}_${this.generateId()}`;
    element.addEventListener(event, handler, options);
    this.eventListeners.set(key, { element, event, handler, options });

    return key;
  }

  removeEventListener(key) {
    const listener = this.eventListeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      this.eventListeners.delete(key);
    }
  }

  unbindEvents() {
    this.eventListeners.forEach((listener, key) => {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    });
    this.eventListeners.clear();
  }

  // Child component management
  addChild(child) {
    this.children.add(child);
  }

  removeChild(child) {
    this.children.delete(child);
  }

  // DOM manipulation helpers
  querySelector(selector) {
    return this.element ? this.element.querySelector(selector) : null;
  }

  querySelectorAll(selector) {
    return this.element ? this.element.querySelectorAll(selector) : Array.from([]);
  }

  setAttribute(name, value) {
    if (this.element) {
      this.element.setAttribute(name, value);
    }
  }

  getAttribute(name) {
    return this.element ? this.element.getAttribute(name) : null;
  }

  addClass(className) {
    if (this.element) {
      this.element.classList.add(className);
    }
  }

  removeClass(className) {
    if (this.element) {
      this.element.classList.remove(className);
    }
  }

  toggleClass(className) {
    if (this.element) {
      this.element.classList.toggle(className);
    }
  }

  // Animation helpers
  animate(property, from, to, duration = 300, easing = 'ease-out') {
    return new Promise((resolve) => {
      if (!this.element) {
        resolve();
        return;
      }

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Apply easing
        const easedProgress = this.applyEasing(progress, easing);

        // Calculate current value
        const currentValue = from + (to - from) * easedProgress;

        // Apply the property
        this.element.style[property] = currentValue + (typeof from === 'number' ? 'px' : '');

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  applyEasing(progress, easing) {
    switch (easing) {
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 3);
      case 'ease-in':
        return Math.pow(progress, 3);
      case 'ease-in-out':
        return progress < 0.5 ? 4 * Math.pow(progress, 3) : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      default:
        return progress;
    }
  }

  // Utility methods
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Override these methods in subclasses
  render() {
    // Override in subclass
  }

  bindEvents() {
    // Override in subclass
  }

  onMount() {
    // Override in subclass
  }

  onUnmount() {
    // Override in subclass
  }

  onUpdate(changes) {
    // Override in subclass
  }

  onStateChange(prevState, newState) {
    // Override in subclass
  }

  shouldUpdate(changes, prevState, newState) {
    // Override in subclass - return true to update, false to skip
    return true;
  }
}



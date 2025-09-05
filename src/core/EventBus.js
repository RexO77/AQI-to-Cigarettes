// src/core/EventBus.js - Advanced Event Management System
export class EventBus {
  constructor() {
    this.events = new Map();
    this.middlewares = [];
    this.history = [];
    this.maxHistorySize = 100;
  }

  // Subscribe to an event
  on(event, callback, priority = 0) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event);
    const listener = { callback, priority, id: this.generateId() };

    // Insert based on priority (higher priority = executed first)
    const insertIndex = listeners.findIndex(l => l.priority < priority);
    if (insertIndex === -1) {
      listeners.push(listener);
    } else {
      listeners.splice(insertIndex, 0, listener);
    }

    return () => this.off(event, listener.id);
  }

  // Unsubscribe from an event
  off(event, listenerId) {
    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event);
    const index = listeners.findIndex(l => l.id === listenerId);

    if (index > -1) {
      listeners.splice(index, 1);
      return true;
    }

    return false;
  }

  // Emit an event
  emit(event, data = {}) {
    if (!this.events.has(event)) return;

    // Create event object
    const eventObj = {
      type: event,
      data,
      timestamp: Date.now(),
      id: this.generateId()
    };

    // Apply middlewares
    let processedEvent = eventObj;
    for (const middleware of this.middlewares) {
      try {
        processedEvent = middleware(processedEvent);
        if (!processedEvent) return; // Middleware can cancel event
      } catch (error) {
        console.error('EventBus middleware error:', error);
      }
    }

    // Add to history
    this.history.push(processedEvent);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Execute listeners
    const listeners = this.events.get(event);
    for (const listener of listeners) {
      try {
        listener.callback(processedEvent);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    }
  }

  // Emit event once (auto-unsubscribe after first execution)
  once(event, callback, priority = 0) {
    const unsubscribe = this.on(event, (eventObj) => {
      unsubscribe();
      callback(eventObj);
    }, priority);

    return unsubscribe;
  }

  // Add middleware for event processing
  use(middleware) {
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index > -1) {
        this.middlewares.splice(index, 1);
      }
    };
  }

  // Get all listeners for an event
  getListeners(event) {
    return this.events.get(event) || [];
  }

  // Get all registered events
  getEvents() {
    return Array.from(this.events.keys());
  }

  // Clear all listeners for an event or all events
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
      this.middlewares = [];
      this.history = [];
    }
  }

  // Wait for an event (Promise-based)
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event '${event}'`));
      }, timeout);

      const unsubscribe = this.once(event, (eventObj) => {
        clearTimeout(timeoutId);
        resolve(eventObj);
      });
    });
  }

  // Replay events from history
  replay(fromIndex = 0, toIndex = this.history.length) {
    const events = this.history.slice(fromIndex, toIndex);
    events.forEach(event => this.emit(event.type, event.data));
  }

  // Get event statistics
  getStats() {
    const stats = {
      totalEvents: this.history.length,
      eventsByType: {},
      listenersByType: {},
      middlewaresCount: this.middlewares.length
    };

    // Count events by type
    this.history.forEach(event => {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
    });

    // Count listeners by type
    this.events.forEach((listeners, eventType) => {
      stats.listenersByType[eventType] = listeners.length;
    });

    return stats;
  }

  // Generate unique ID for listeners
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Debug helper
  debug(enabled = true) {
    if (enabled) {
      this.use((event) => {
        console.log(`[EventBus] ${event.type}:`, event.data);
        return event;
      });
    } else {
      // Remove debug middleware
      this.middlewares = this.middlewares.filter(m => !m.toString().includes('EventBus'));
    }
  }
}



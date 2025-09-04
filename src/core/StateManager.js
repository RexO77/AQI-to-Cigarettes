// src/core/StateManager.js - Advanced State Management
export class StateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.history = [];
    this.maxHistorySize = 10;
    this.isUpdating = false;
  }

  getState() {
    return { ...this.state };
  }

  setState(updates) {
    if (this.isUpdating) {
      console.warn('State update already in progress');
      return;
    }

    this.isUpdating = true;

    try {
      // Deep clone current state for history
      const previousState = JSON.parse(JSON.stringify(this.state));

      // Apply updates
      const newState = this.applyUpdates(this.state, updates);

      // Validate state changes
      this.validateState(newState);

      // Update state
      this.state = newState;

      // Add to history for undo functionality
      this.history.push(previousState);
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }

      // Notify listeners of changes
      const changes = this.calculateChanges(previousState, newState);
      if (Object.keys(changes).length > 0) {
        this.notifyListeners(changes);
      }

    } catch (error) {
      console.error('State update failed:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  applyUpdates(currentState, updates) {
    const newState = { ...currentState };

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Deep merge for nested objects
        newState[key] = this.applyUpdates(newState[key] || {}, value);
      } else {
        newState[key] = value;
      }
    }

    return newState;
  }

  calculateChanges(oldState, newState) {
    const changes = {};

    // Find all keys in both states
    const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

    for (const key of allKeys) {
      const oldValue = oldState[key];
      const newValue = newState[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          previous: oldValue,
          current: newValue
        };
      }
    }

    return changes;
  }

  validateState(state) {
    // Add validation rules here
    if (state.currentAQI !== null && (state.currentAQI < 0 || state.currentAQI > 1000)) {
      throw new Error('Invalid AQI value');
    }

    if (state.currentPM25 !== null && state.currentPM25 < 0) {
      throw new Error('Invalid PM2.5 value');
    }
  }

  onChange(callback) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(changes) {
    this.listeners.forEach(callback => {
      try {
        callback(changes);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  // Undo functionality
  undo() {
    if (this.history.length === 0) {
      console.warn('No state history available for undo');
      return false;
    }

    const previousState = this.history.pop();
    const currentState = { ...this.state };

    this.state = previousState;
    this.notifyListeners(this.calculateChanges(currentState, previousState));

    return true;
  }

  // Computed properties
  getComputedValue(computeFn) {
    return computeFn(this.state);
  }

  // Batch updates for performance
  batchUpdate(updates) {
    if (this.isUpdating) {
      console.warn('Cannot batch update while another update is in progress');
      return;
    }

    this.isUpdating = true;
    const batchedUpdates = {};

    // Collect all updates
    const collectUpdates = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        batchedUpdates[fullPath] = value;
      }
    };

    collectUpdates(updates);

    // Apply all updates at once
    this.setState(updates);
  }

  // Subscribe to specific state changes
  subscribe(selector, callback) {
    let lastValue = selector(this.state);

    return this.onChange((changes) => {
      const newValue = selector(this.state);

      if (JSON.stringify(lastValue) !== JSON.stringify(newValue)) {
        callback(newValue, lastValue);
        lastValue = newValue;
      }
    });
  }

  // Reset to initial state
  reset(initialState = {}) {
    this.state = { ...initialState };
    this.history = [];
    this.notifyListeners({});
  }

  // Get state snapshot for debugging
  getSnapshot() {
    return {
      current: this.getState(),
      history: this.history,
      listenersCount: this.listeners.size
    };
  }
}


/**
 * Audio Manager Singleton
 * Manages audio playback across the app - only one preview plays at a time
 * Handles cleanup, fading, and state management
 */

type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface AudioInstance {
  url: string;
  audio: HTMLAudioElement;
  onStateChange?: (state: AudioState) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
}

class AudioManager {
  private currentInstance: AudioInstance | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;
  
  // Fade duration in ms
  private readonly FADE_DURATION = 300;
  private readonly FADE_STEPS = 10;
  
  /**
   * Play audio from URL, stopping any currently playing audio
   */
  async play(
    url: string,
    startMs: number = 0,
    options?: {
      onStateChange?: (state: AudioState) => void;
      onProgress?: (currentTime: number, duration: number) => void;
      onEnd?: () => void;
    }
  ): Promise<void> {
    // Stop any currently playing audio with fade
    await this.stop(true);
    
    // Create new audio element
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.volume = 0; // Start silent for fade in
    audio.preload = 'auto';
    
    this.currentInstance = {
      url,
      audio,
      onStateChange: options?.onStateChange,
      onProgress: options?.onProgress,
      onEnd: options?.onEnd,
    };
    
    // Notify loading state
    options?.onStateChange?.('loading');
    
    return new Promise((resolve, reject) => {
      // Handle successful load
      audio.oncanplay = () => {
        // Seek to start position (convert ms to seconds)
        if (startMs > 0) {
          audio.currentTime = startMs / 1000;
        }
        
        // Start playback
        audio.play()
          .then(() => {
            // Fade in
            this.fadeIn(audio);
            options?.onStateChange?.('playing');
            resolve();
          })
          .catch((error) => {
            console.error('Audio playback failed:', error);
            options?.onStateChange?.('error');
            this.cleanup();
            reject(error);
          });
      };
      
      // Handle errors
      audio.onerror = (e) => {
        console.error('Audio load error:', e);
        options?.onStateChange?.('error');
        this.cleanup();
        reject(new Error('Failed to load audio'));
      };
      
      // Handle track ending
      audio.onended = () => {
        options?.onEnd?.();
        options?.onStateChange?.('idle');
        this.cleanup();
      };
      
      // Progress updates
      audio.ontimeupdate = () => {
        if (this.currentInstance?.audio === audio) {
          options?.onProgress?.(audio.currentTime, audio.duration);
        }
      };
      
      // Trigger load
      audio.load();
    });
  }
  
  /**
   * Pause current playback
   */
  pause(): void {
    if (this.currentInstance?.audio && !this.currentInstance.audio.paused) {
      this.currentInstance.audio.pause();
      this.currentInstance.onStateChange?.('paused');
    }
  }
  
  /**
   * Resume paused playback
   */
  resume(): void {
    if (this.currentInstance?.audio && this.currentInstance.audio.paused) {
      this.currentInstance.audio.play()
        .then(() => {
          this.currentInstance?.onStateChange?.('playing');
        })
        .catch((error) => {
          console.error('Resume failed:', error);
          this.currentInstance?.onStateChange?.('error');
        });
    }
  }
  
  /**
   * Toggle play/pause
   */
  toggle(): void {
    if (this.currentInstance?.audio) {
      if (this.currentInstance.audio.paused) {
        this.resume();
      } else {
        this.pause();
      }
    }
  }
  
  /**
   * Stop playback with optional fade out
   */
  async stop(fade: boolean = true): Promise<void> {
    if (!this.currentInstance) return;
    
    const instance = this.currentInstance;
    const { audio, onStateChange } = instance;
    
    // Clear fade first to prevent conflicts
    this.clearFade();
    
    if (fade && !audio.paused && audio.volume > 0) {
      await this.fadeOut(audio);
    }
    
    // Ensure audio is stopped
    audio.pause();
    audio.currentTime = 0;
    
    // Notify state change before cleanup
    onStateChange?.('idle');
    
    // Only cleanup if this is still the current instance
    // (prevents race condition if new audio started during fade)
    if (this.currentInstance === instance) {
      this.cleanup();
    }
  }
  
  /**
   * Check if a specific URL is currently playing
   */
  isPlaying(url?: string): boolean {
    if (!this.currentInstance) return false;
    if (url && this.currentInstance.url !== url) return false;
    return !this.currentInstance.audio.paused;
  }
  
  /**
   * Check if a specific URL is the current track (playing or paused)
   */
  isCurrent(url: string): boolean {
    return this.currentInstance?.url === url;
  }
  
  /**
   * Get current playback state
   */
  getState(): AudioState {
    if (!this.currentInstance) return 'idle';
    if (this.currentInstance.audio.paused) return 'paused';
    return 'playing';
  }
  
  /**
   * Get current URL
   */
  getCurrentUrl(): string | null {
    return this.currentInstance?.url ?? null;
  }
  
  /**
   * Seek to position (0-1 normalized)
   */
  seek(position: number): void {
    if (this.currentInstance?.audio) {
      const duration = this.currentInstance.audio.duration;
      if (duration && isFinite(duration)) {
        this.currentInstance.audio.currentTime = position * duration;
      }
    }
  }
  
  /**
   * Fade in audio
   */
  private fadeIn(audio: HTMLAudioElement): void {
    this.clearFade();
    
    const targetVolume = 1;
    const step = targetVolume / this.FADE_STEPS;
    const interval = this.FADE_DURATION / this.FADE_STEPS;
    
    let currentStep = 0;
    
    this.fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(targetVolume, step * currentStep);
      
      if (currentStep >= this.FADE_STEPS) {
        this.clearFade();
      }
    }, interval);
  }
  
  /**
   * Fade out audio
   */
  private fadeOut(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      this.clearFade();
      
      const startVolume = audio.volume;
      const step = startVolume / this.FADE_STEPS;
      const interval = this.FADE_DURATION / this.FADE_STEPS;
      
      let currentStep = 0;
      
      this.fadeInterval = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(0, startVolume - step * currentStep);
        
        if (currentStep >= this.FADE_STEPS) {
          this.clearFade();
          resolve();
        }
      }, interval);
    });
  }
  
  /**
   * Clear fade interval
   */
  private clearFade(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }
  
  /**
   * Cleanup current instance
   */
  private cleanup(): void {
    this.clearFade();
    
    if (this.currentInstance) {
      const { audio } = this.currentInstance;
      // Stop playback completely
      audio.pause();
      audio.currentTime = 0;
      // Remove event listeners
      audio.oncanplay = null;
      audio.onerror = null;
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onpause = null;
      audio.onplay = null;
      // Clear source to release resources
      audio.src = '';
      audio.load(); // Force release
      this.currentInstance = null;
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Export for testing
export { AudioManager };
export type { AudioState };

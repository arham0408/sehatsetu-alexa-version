import { SUPPORTED_LANGUAGES, type IndianLanguageCode } from "./medical-types.ts";

// Type definitions for browser Web Speech API
interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export class MedicalAudioController {
  private recognition: SpeechRecognitionLike | null = null;
  private isListening = false;
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    const nav = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return !!(nav.SpeechRecognition || nav.webkitSpeechRecognition);
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /**
   * Starts listening to user microphone with the appropriate language tag.
   */
  public startListening(
    lang: IndianLanguageCode,
    callbacks: {
      onInterimResult: (text: string) => void;
      onFinalResult: (text: string) => void;
      onError: (errorType: string) => void;
      onEnd: () => void;
    },
  ): boolean {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError("not_supported");
      return false;
    }

    try {
      this.stopListening();

      const nav = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const RecognitionClass = nav.SpeechRecognition || nav.webkitSpeechRecognition;
      if (!RecognitionClass) {
        callbacks.onError("not_supported");
        return false;
      }

      const rec = new RecognitionClass();
      this.recognition = rec;
      rec.continuous = false;
      rec.interimResults = true;

      const langOption = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      rec.lang = langOption?.speechTag || "en-IN";

      rec.onstart = () => {
        this.isListening = true;
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let interimText = "";
        let finalText = "";

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        if (interimText) {
          callbacks.onInterimResult(interimText);
        }
        if (finalText) {
          callbacks.onFinalResult(finalText);
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        this.isListening = false;
        callbacks.onError(event.error || "recognition_error");
      };

      rec.onend = () => {
        this.isListening = false;
        callbacks.onEnd();
      };

      rec.start();
      return true;
    } catch {
      callbacks.onError("start_failed");
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        /* Ignore */
      }
    }
    this.isListening = false;
  }

  /**
   * Speaks the provided text using browser SpeechSynthesis in the target language.
   */
  public speak(
    text: string,
    lang: IndianLanguageCode,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: unknown) => void;
    },
  ): void {
    if (!this.isSpeechSynthesisSupported()) {
      callbacks?.onError?.("Speech synthesis not supported");
      return;
    }

    this.stopSpeaking();

    // Clean text: strip markdown symbols, asterisks, brackets, raw json
    const clean = text
      .replace(/[*#_`~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\{[^}]+\}/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;

    try {
      const utterance = new SpeechSynthesisUtterance(clean);
      this.currentUtterance = utterance;

      const langOption = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      const tag = langOption?.speechTag || "en-IN";
      utterance.lang = tag;
      utterance.rate = 0.95;

      // Try finding the best matched voice
      const voices = window.speechSynthesis.getVoices();
      const prefix = tag.split("-")[0];
      const match =
        voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (match) {
        utterance.voice = match;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        callbacks?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        callbacks?.onError?.(e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isSpeaking = false;
      callbacks?.onError?.(e);
    }
  }

  public stopSpeaking(): void {
    if (this.isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* Ignore */
      }
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }

  public getListeningState(): boolean {
    return this.isListening;
  }
}

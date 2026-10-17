import { useState, useRef, useEffect, useCallback, type ChangeEvent, type FormEvent } from "react";
import {
  FileText,
  Upload,
  Volume2,
  VolumeX,
  Mic,
  Send,
  Eye,
  Layers,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  ArrowRight,
  Sparkles,
  Bot,
  ListFilter,
} from "lucide-react";
import type { Atlas, SceneState } from "./anatomy.ts";
import { TRANSLATIONS } from "./medical-i18n.ts";
import { MedicalAudioController } from "./medical-audio.ts";
import { MedicalAnatomyController, type AnatomyVisualizationMode } from "./medical-anatomy-controller.ts";
import {
  SAMPLE_REPORTS,
  analyzeReport,
  sendChatMessage,
} from "./medical-report-service.ts";
import {
  SUPPORTED_LANGUAGES,
  type ChatMessage,
  type IndianLanguageCode,
  type MedicalFinding,
  type ReportAnalysisState,
  type VerifiedAnatomyTarget,
} from "./medical-types.ts";
import "./medical-report-explorer.css";

interface Props {
  atlas: Atlas;
  sceneState: SceneState;
  onUpdateSceneState: (update: Partial<SceneState> | ((current: SceneState) => SceneState)) => void;
  onClose: () => void;
}

export default function MedicalReportExplorer({
  atlas,
  sceneState,
  onUpdateSceneState,
  onClose,
}: Props) {
  const [language, setLanguage] = useState<IndianLanguageCode>("en");
  const [activeTab, setActiveTab] = useState<"findings" | "chat" | "upload">("upload");
  const [reportState, setReportState] = useState<ReportAnalysisState>({ status: "idle" });
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [visMode, setVisMode] = useState<AnatomyVisualizationMode>("highlight");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtrl = useRef(new MedicalAudioController());
  const anatomyCtrl = useRef(new MedicalAnatomyController());
  const chatStreamRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Cleanup on unmount: stop audio and restore baseline visual state
  useEffect(() => {
    const audio = audioCtrl.current;
    const anatomy = anatomyCtrl.current;

    return () => {
      audio.stopSpeaking();
      audio.stopListening();
      if (anatomy.hasBaseline()) {
        onUpdateSceneState((current) => ({
          ...current,
          ...anatomy.restoreBaseline(current),
        }));
      }
    };
  }, [onUpdateSceneState]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const processReport = useCallback(
    async (content: { file?: File; text?: string; filename: string }) => {
      anatomyCtrl.current.captureBaseline(sceneState);
      setReportState({
        status: "extracting",
        filename: content.filename,
        progressPercent: 20,
        progressMessage: t.extracting,
      });

      try {
        const result = await analyzeReport(content, atlas, language, (pct, msg) => {
          setReportState((prev) => ({
            ...prev,
            progressPercent: pct,
            progressMessage: msg,
          }));
        });

        setReportState({
          status: "ready",
          filename: content.filename,
          result,
          progressPercent: 100,
        });

        // Add welcome message in chat with report summary
        const initialGreeting: ChatMessage = {
          id: `init-${Date.now()}`,
          sender: "assistant",
          text: `${result.summary}\n\nYou can tap any finding to navigate to its 3D anatomy, or ask questions in ${SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name}.`,
          timestamp: Date.now(),
        };
        setChatMessages([initialGreeting]);

        // Auto highlight all verified findings initially
        const allTargets = result.findings.flatMap((f) => f.verifiedTargets);
        if (allTargets.length > 0) {
          const update = anatomyCtrl.current.focusAllTargets(allTargets, sceneState, visMode);
          onUpdateSceneState(update);
        }

        setActiveTab("findings");
      } catch (err) {
        setReportState({
          status: "failed",
          error: err instanceof Error ? err.message : "Failed to analyze medical report.",
        });
      }
    },
    [atlas, language, onUpdateSceneState, sceneState, t.extracting, visMode],
  );

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processReport({ file, filename: file.name });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processReport({ file, filename: file.name });
    }
  };

  const handleLoadSample = (key: "abdomen" | "chest" | "brain") => {
    const sample = SAMPLE_REPORTS[key];
    void processReport({ text: sample.text, filename: sample.filename });
  };

  const handlePastedSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pastedText.trim()) {
      void processReport({ text: pastedText.trim(), filename: "Pasted_Clinical_Report.txt" });
    }
  };

  const handleSelectFinding = (finding: MedicalFinding) => {
    setActiveFindingId(finding.findingId);

    if (finding.verifiedTargets.length > 0) {
      const primaryTarget = finding.verifiedTargets[0];
      const update = anatomyCtrl.current.focusTarget(primaryTarget, sceneState, visMode);
      onUpdateSceneState(update);
    }
  };

  const handleFocusTarget = (target: VerifiedAnatomyTarget, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const update = anatomyCtrl.current.focusTarget(target, sceneState, visMode);
    onUpdateSceneState(update);
  };

  const handleHighlightAll = () => {
    if (!reportState.result) return;
    const allTargets = reportState.result.findings.flatMap((f) => f.verifiedTargets);
    const update = anatomyCtrl.current.focusAllTargets(allTargets, sceneState, visMode);
    onUpdateSceneState(update);
    setActiveFindingId(null);
  };

  const handleVisModeChange = (nextMode: AnatomyVisualizationMode) => {
    setVisMode(nextMode);
    const update = anatomyCtrl.current.setVisualizationMode(nextMode, sceneState);
    onUpdateSceneState(update);
  };

  const handleResetView = () => {
    const update = anatomyCtrl.current.restoreBaseline(sceneState);
    onUpdateSceneState(update);
    setActiveFindingId(null);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    const reportContext = reportState.result?.extractedText || "";
    const assistantMsg = await sendChatMessage(
      textToSend,
      reportContext,
      atlas,
      language,
      chatMessages,
    );

    setChatMessages((prev) => [...prev, assistantMsg]);

    // If navigation intent is present, focus the mentioned targets in 3D
    if (assistantMsg.navigationIntent && assistantMsg.mentionedTargets?.length) {
      const target = assistantMsg.mentionedTargets[0];
      const update = anatomyCtrl.current.focusTarget(target, sceneState, visMode);
      onUpdateSceneState(update);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      audioCtrl.current.stopListening();
      setIsListening(false);
      return;
    }

    const started = audioCtrl.current.startListening(language, {
      onInterimResult: (interim) => {
        setChatInput(interim);
      },
      onFinalResult: (final) => {
        setChatInput(final);
        setIsListening(false);
        void handleSendMessage(final);
      },
      onError: (err) => {
        setIsListening(false);
        if (err === "not-allowed") {
          alert(t.micDenied);
        }
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (started) {
      setIsListening(true);
    } else {
      alert(t.voiceUnavailable);
    }
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (isSpeaking && activeSpeechId === msgId) {
      audioCtrl.current.stopSpeaking();
      setIsSpeaking(false);
      setActiveSpeechId(null);
      return;
    }

    setActiveSpeechId(msgId);
    setIsSpeaking(true);

    audioCtrl.current.speak(text, language, {
      onEnd: () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
      },
    });
  };

  const handleClose = () => {
    audioCtrl.current.stopSpeaking();
    audioCtrl.current.stopListening();
    if (anatomyCtrl.current.hasBaseline()) {
      onUpdateSceneState((current) => ({
        ...current,
        ...anatomyCtrl.current.restoreBaseline(current),
      }));
    }
    onClose();
  };

  return (
    <div className="sehatsetu-panel" role="region" aria-label="SehatSetu Medical Report Explorer">
      {/* Header */}
      <header className="sehatsetu-header">
        <div className="sehatsetu-header-title">
          <span className="sehatsetu-badge">SEHATSETU</span>
          <h2>Report Explorer</h2>
        </div>
        <div className="sehatsetu-header-controls">
          <select
            className="sehatsetu-lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as IndianLanguageCode)}
            aria-label="Select report language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="sehatsetu-icon-btn"
            onClick={handleClose}
            aria-label="Close report explorer"
            title="Exit report mode"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="sehatsetu-tabs" role="tablist">
        <button
          type="button"
          className={`sehatsetu-tab-btn ${activeTab === "findings" ? "active" : ""}`}
          onClick={() => setActiveTab("findings")}
          role="tab"
          aria-selected={activeTab === "findings"}
        >
          <ListFilter size={14} />
          <span>{t.findingsHeading}</span>
          {reportState.result?.findings.length ? (
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold">
              {reportState.result.findings.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`sehatsetu-tab-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
          role="tab"
          aria-selected={activeTab === "chat"}
        >
          <Bot size={14} />
          <span>{t.chatHeading}</span>
        </button>
        <button
          type="button"
          className={`sehatsetu-tab-btn ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
          role="tab"
          aria-selected={activeTab === "upload"}
        >
          <Upload size={14} />
          <span>{t.uploadHeading}</span>
        </button>
      </div>

      {/* Body Area */}
      <div className="sehatsetu-body">
        {/* Active Report Header if report is loaded */}
        {reportState.result && (
          <div className="sehatsetu-active-report-bar">
            <div className="sehatsetu-report-name" title={reportState.result.filename}>
              <FileText size={14} />
              <span>{reportState.result.filename}</span>
            </div>
            <button
              type="button"
              className="text-xs text-blue-700 hover:underline bg-transparent border-0 cursor-pointer p-0"
              onClick={() => setActiveTab("upload")}
            >
              {t.clearReport}
            </button>
          </div>
        )}

        {/* 3D Anatomy Viewport Toolbar (Visible when findings are present) */}
        {reportState.result && reportState.result.findings.length > 0 && (
          <div className="sehatsetu-viewer-toolbar" aria-label="Anatomical visualization controls">
            <button
              type="button"
              className={`sehatsetu-toolbar-btn ${visMode === "highlight" ? "active" : ""}`}
              onClick={() => handleVisModeChange("highlight")}
              title="Highlight target anatomy while keeping other structures visible"
            >
              <Eye size={12} />
              <span>Highlight Only</span>
            </button>
            <button
              type="button"
              className={`sehatsetu-toolbar-btn ${visMode === "isolate" ? "active" : ""}`}
              onClick={() => handleVisModeChange("isolate")}
              title="Isolate target anatomy and dim/hide unrelated structures"
            >
              <Layers size={12} />
              <span>{t.isolate}</span>
            </button>
            <button
              type="button"
              className="sehatsetu-toolbar-btn"
              onClick={handleHighlightAll}
              title="Highlight all verified findings from report simultaneously"
            >
              <Sparkles size={12} />
              <span>{t.highlightAll}</span>
            </button>
            <button
              type="button"
              className="sehatsetu-toolbar-btn"
              onClick={handleResetView}
              title="Reset 3D view and restore original anatomy state"
            >
              <RotateCcw size={12} />
              <span>{t.resetView}</span>
            </button>
          </div>
        )}

        {/* TAB 1: FINDINGS */}
        {activeTab === "findings" && (
          <div className="flex flex-col gap-3">
            {reportState.status === "extracting" || reportState.status === "analyzing" ? (
              <div className="sehatsetu-progress-box">
                <div className="sehatsetu-progress-header">
                  <span>{reportState.progressMessage || t.analyzing}</span>
                  <span>{reportState.progressPercent || 40}%</span>
                </div>
                <div className="sehatsetu-progress-track">
                  <div
                    className="sehatsetu-progress-bar"
                    style={{ width: `${reportState.progressPercent || 40}%` }}
                  />
                </div>
              </div>
            ) : !reportState.result || reportState.result.findings.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                <p>{t.noFindings}</p>
                <button
                  type="button"
                  className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold cursor-pointer border-0"
                  onClick={() => setActiveTab("upload")}
                >
                  {t.uploadHeading}
                </button>
              </div>
            ) : (
              <div className="sehatsetu-findings-list">
                {reportState.result.findings.map((f) => (
                  <article
                    key={f.findingId}
                    className={`sehatsetu-finding-card ${activeFindingId === f.findingId ? "active-target" : ""}`}
                    onClick={() => handleSelectFinding(f)}
                  >
                    <div className="sehatsetu-finding-header">
                      <div className="sehatsetu-finding-term">{f.term}</div>
                      <span
                        className={`sehatsetu-status-badge ${f.negation === "ruled_out" ? "ruled_out" : f.certainty === "suspected" ? "suspected" : "confirmed"}`}
                      >
                        {f.negation === "ruled_out"
                          ? t.negated
                          : f.certainty === "suspected"
                            ? t.suspected
                            : t.confirmed}
                      </span>
                    </div>

                    <p className="sehatsetu-finding-explanation">{f.explanation}</p>

                    {/* Targets row */}
                    <div className="sehatsetu-targets-row">
                      {f.verifiedTargets.map((target) => (
                        <span
                          key={target.targetId}
                          className={`sehatsetu-organ-pill ${target.relationshipType}`}
                        >
                          <CheckCircle2 size={11} />
                          <span>{target.name}</span>
                          <small className="opacity-75">
                            ({target.relationshipType === "direct" ? t.verifiedTag : t.conditionTag})
                          </small>
                        </span>
                      ))}

                      {f.verifiedTargets.length === 0 && (
                        <span className="sehatsetu-organ-pill unresolved">
                          <AlertCircle size={11} />
                          <span>{t.unresolvedTag}</span>
                        </span>
                      )}
                    </div>

                    {/* Evidence quote */}
                    <div className="sehatsetu-finding-evidence">
                      &ldquo;{f.source.evidenceText || f.reportPhrase}&rdquo;
                    </div>

                    {/* Actions */}
                    <div className="sehatsetu-finding-actions">
                      {f.verifiedTargets.length > 0 && (
                        <button
                          type="button"
                          className="sehatsetu-focus-btn"
                          onClick={(e) => handleFocusTarget(f.verifiedTargets[0], e)}
                        >
                          <Eye size={12} />
                          <span>{t.locateIn3D}</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI CHAT ASSISTANT */}
        {activeTab === "chat" && (
          <div className="flex flex-col gap-3 flex-1">
            <div className="sehatsetu-chat-stream" ref={chatStreamRef}>
              {chatMessages.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  <Bot size={28} className="mx-auto mb-2 text-blue-500 opacity-60" />
                  <p>Ask questions about your medical report, organs, or terminology in {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name}.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className={`sehatsetu-chat-msg ${msg.sender}`}>
                    <div className="sehatsetu-msg-bubble">
                      <p className="whitespace-pre-wrap m-0">{msg.text}</p>
                    </div>
                    {msg.sender === "assistant" && (
                      <div className="sehatsetu-msg-actions">
                        <button
                          type="button"
                          className="sehatsetu-audio-btn"
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          title={isSpeaking && activeSpeechId === msg.id ? t.stopSpeaking : t.speakResponse}
                          aria-label={isSpeaking && activeSpeechId === msg.id ? t.stopSpeaking : t.speakResponse}
                        >
                          {isSpeaking && activeSpeechId === msg.id ? (
                            <VolumeX size={13} className="text-red-500" />
                          ) : (
                            <Volume2 size={13} />
                          )}
                        </button>
                        {msg.mentionedTargets && msg.mentionedTargets.length > 0 && (
                          <button
                            type="button"
                            className="text-[11px] text-blue-600 font-semibold bg-transparent border-0 cursor-pointer hover:underline flex items-center gap-1 p-0"
                            onClick={() => handleFocusTarget(msg.mentionedTargets![0])}
                          >
                            <Eye size={11} />
                            <span>Locate {msg.mentionedTargets[0].name} in 3D</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <div className="sehatsetu-chat-input-bar">
              <input
                type="text"
                className="sehatsetu-chat-input"
                placeholder={isListening ? t.listening : t.chatPlaceholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
              />
              <button
                type="button"
                className={`sehatsetu-icon-btn ${isListening ? "listening" : ""}`}
                onClick={handleToggleVoice}
                title={isListening ? "Stop listening" : t.voiceInput}
                aria-label={isListening ? "Stop listening" : t.voiceInput}
              >
                <Mic size={16} />
              </button>
              <button
                type="button"
                className="sehatsetu-icon-btn sehatsetu-send-btn"
                onClick={() => handleSendMessage()}
                title={t.send}
                aria-label={t.send}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: UPLOAD & SAMPLES */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-4">
            {/* Drag & Drop Upload Zone */}
            <div
              className={`sehatsetu-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={handleFileUpload}
              />
              <div className="sehatsetu-dropzone-icon">
                <Upload size={20} />
              </div>
              <div className="sehatsetu-dropzone-text">{t.uploadPrompt}</div>
              <div className="sehatsetu-dropzone-sub">{t.uploadSubtext}</div>
            </div>

            {/* Instant Sample Reports */}
            <div className="sehatsetu-samples-section">
              <div className="sehatsetu-section-label">{t.sampleReports}</div>
              <button
                type="button"
                className="sehatsetu-sample-chip"
                onClick={() => handleLoadSample("abdomen")}
              >
                <span>{t.sampleAbdomen}</span>
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                className="sehatsetu-sample-chip"
                onClick={() => handleLoadSample("chest")}
              >
                <span>{t.sampleChest}</span>
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                className="sehatsetu-sample-chip"
                onClick={() => handleLoadSample("brain")}
              >
                <span>{t.sampleBrain}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Paste Text Fallback */}
            <div>
              <button
                type="button"
                className="text-xs text-slate-600 hover:text-blue-600 font-semibold flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                onClick={() => setShowPaste(!showPaste)}
              >
                <span>{t.pasteFallback}</span>
              </button>

              {showPaste && (
                <form onSubmit={handlePastedSubmit} className="mt-2 flex flex-col gap-2">
                  <textarea
                    className="w-full h-24 p-2 text-xs border border-slate-300 rounded-md resize-none outline-none focus:border-blue-500 font-sans"
                    placeholder={t.pastePlaceholder}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="self-end px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold cursor-pointer border-0"
                  >
                    {t.processPastedText}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Educational Disclaimer */}
        <footer className="sehatsetu-disclaimer">
          <HelpCircle size={14} className="shrink-0 text-slate-400 mt-0.5" />
          <span>{t.disclaimer}</span>
        </footer>
      </div>
    </div>
  );
}

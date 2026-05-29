import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StartScreen from './components/StartScreen.jsx';
import ConfirmScreen from './components/ConfirmScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Navbar from './components/Navbar.jsx';
import FileExplorer from './components/FileExplorer.jsx';
import CodeEditor from './components/CodeEditor.jsx';
import Terminal from './components/Terminal.jsx';
import ChatSidebar from './components/ChatSidebar.jsx';
import CheckpointDrawer from './components/CheckpointDrawer.jsx';
import NewProblemModal from './components/NewProblemModal.jsx';
import HistoryModal from './components/HistoryModal.jsx';
import DebriefScreen from './components/DebriefScreen.jsx';
import { MODES } from './api/generate.js';
import { fetchNextProblem, fetchProblemById, markProblemSolved } from './api/problems.js';
import { usePyodide, parseUnittestOutput } from './hooks/usePyodide.js';

const STAGES = {
  START: 'start',
  CONFIRM: 'confirm',
  GENERATING: 'generating',
  GEN_ERROR: 'gen_error',
  RUNNING: 'running',
  DEBRIEF: 'debrief',
};

const SESSION_SECONDS = 60 * 60; // 60 minutes

export default function App() {
  const [stage, setStage] = useState(STAGES.START);
  const [pendingModeId, setPendingModeId] = useState(null);
  const [pendingHint, setPendingHint] = useState('');
  const [genError, setGenError] = useState(null);

  // Active session
  const [modeId, setModeId] = useState(null);
  const [problem, setProblem] = useState(null); // { domain, files, test_file, checkpoints, bugs, stubs }
  const [problemId, setProblemId] = useState(null);
  const [problemGenerated, setProblemGenerated] = useState(false);
  const [files, setFiles] = useState([]); // [{name, content}]
  const [activeFile, setActiveFile] = useState(null);
  const [originalContent, setOriginalContent] = useState({}); // baseline for dirty indicator

  // Checkpoints
  const [checkpoints, setCheckpoints] = useState([]); // [{id, title, ai_enabled, task, complete}]
  const [currentCheckpointIdx, setCurrentCheckpointIdx] = useState(0);
  const [checkpointStartTime, setCheckpointStartTime] = useState(0);
  const [checkpointTimes, setCheckpointTimes] = useState({}); // id -> seconds

  // Timer
  const [sessionRemaining, setSessionRemaining] = useState(SESSION_SECONDS);
  const [checkpointElapsed, setCheckpointElapsed] = useState(0);

  // Tests / terminal
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [runningTests, setRunningTests] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);

  // Modal
  const [newProblemOpen, setNewProblemOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Pyodide
  const { status: pyodideStatus, error: pyodideError, runTests, runFile } = usePyodide();

  // Run-code output + Cmd+S toast
  const [runOutput, setRunOutput] = useState(null); // { stdout, stderr }
  const [runningCode, setRunningCode] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  // Timers — single interval drives both session countdown + checkpoint counter
  useEffect(() => {
    if (stage !== STAGES.RUNNING) return;
    const interval = setInterval(() => {
      setSessionRemaining((s) => {
        if (s <= 1) {
          // Time's up
          finishSession('time_up');
          return 0;
        }
        return s - 1;
      });
      setCheckpointElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Dirty file detection
  const dirtyFiles = useMemo(() => {
    const set = new Set();
    for (const f of files) {
      if (originalContent[f.name] !== undefined && originalContent[f.name] !== f.content) {
        set.add(f.name);
      }
    }
    return set;
  }, [files, originalContent]);

  const activeFileObj = files.find((f) => f.name === activeFile);
  const currentCheckpoint = checkpoints[currentCheckpointIdx];
  const aiEnabled = !!currentCheckpoint?.ai_enabled;
  const allComplete = checkpoints.length > 0 && checkpoints.every((c) => c.complete);

  // Auto-finish when all checkpoints complete
  useEffect(() => {
    if (stage === STAGES.RUNNING && allComplete) {
      finishSession('all_complete');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComplete, stage]);

  const finishSessionRef = useRef();
  async function finishSession(reason) {
    setStage(STAGES.DEBRIEF);
    setSessionReason(reason);
    if (modeId && problemId) {
      try {
        const totalElapsed = SESSION_SECONDS - sessionRemaining;
        await markProblemSolved(modeId, problemId, {
          domain: problem?.domain || '',
          totalTime: totalElapsed,
          checkpointTimes,
          generated: problemGenerated,
        });
      } catch (err) {
        console.warn('Failed to mark problem solved:', err);
      }
    }
  }
  const [sessionReason, setSessionReason] = useState('all_complete');
  finishSessionRef.current = finishSession;

  function handlePickMode(mid) {
    setPendingModeId(mid);
    setStage(STAGES.CONFIRM);
  }

  async function startGeneration(modeIdToUse, hint) {
    setStage(STAGES.GENERATING);
    setGenError(null);
    try {
      const { problem: data, generated } = await fetchNextProblem(modeIdToUse, hint);
      hydrateProblem(modeIdToUse, data, generated);
      setStage(STAGES.RUNNING);
    } catch (err) {
      console.error(err);
      setGenError(err.message || String(err));
      setStage(STAGES.GEN_ERROR);
    }
  }

  async function replayProblem(modeIdToUse, problemIdToReplay) {
    setHistoryOpen(false);
    setNewProblemOpen(false);
    setStage(STAGES.GENERATING);
    setGenError(null);
    try {
      const data = await fetchProblemById(modeIdToUse, problemIdToReplay);
      hydrateProblem(modeIdToUse, data, false);
      setStage(STAGES.RUNNING);
    } catch (err) {
      console.error(err);
      setGenError(err.message || String(err));
      setStage(STAGES.GEN_ERROR);
    }
  }

  function hydrateProblem(modeIdToUse, data, generated = false) {
    setModeId(modeIdToUse);
    setProblem(data);
    setProblemId(data.id || null);
    setProblemGenerated(generated);
    setFiles(data.files.map((f) => ({ name: f.name, content: f.content })));
    setActiveFile(data.files[0]?.name || null);
    const baseline = {};
    for (const f of data.files) baseline[f.name] = f.content;
    setOriginalContent(baseline);
    setCheckpoints(
      data.checkpoints.map((cp) => ({
        id: cp.id,
        title: cp.title,
        ai_enabled: cp.ai_enabled,
        task: cp.task,
        complete: false,
      }))
    );
    setCurrentCheckpointIdx(0);
    setCheckpointStartTime(Date.now());
    setCheckpointTimes({});
    setCheckpointElapsed(0);
    setSessionRemaining(SESSION_SECONDS);
    setTestResult(null);
    setTestError(null);
    setMessages([]);
    setTerminalCollapsed(false);
  }

  function handleConfirm(hint) {
    setPendingHint(hint);
    startGeneration(pendingModeId, hint);
  }

  function handleEditorChange(fileName, content) {
    setFiles((prev) => prev.map((f) => (f.name === fileName ? { ...f, content } : f)));
  }

  function handleMarkComplete() {
    if (!currentCheckpoint) return;
    const elapsedNow = checkpointElapsed;
    setCheckpointTimes((m) => ({ ...m, [currentCheckpoint.id]: elapsedNow }));
    setCheckpoints((prev) =>
      prev.map((cp, idx) => (idx === currentCheckpointIdx ? { ...cp, complete: true } : cp))
    );
    if (currentCheckpointIdx < checkpoints.length - 1) {
      setCurrentCheckpointIdx(currentCheckpointIdx + 1);
      setCheckpointElapsed(0);
    }
  }

  const handleRunTests = useCallback(async () => {
    if (!problem || pyodideStatus !== 'ready' || runningTests) return;
    setRunningTests(true);
    setTestError(null);
    setTerminalCollapsed(false);
    try {
      const fileMap = {};
      for (const f of files) fileMap[f.name] = f.content;
      const { stdout, stderr } = await runTests(fileMap, problem.test_file);
      const parsed = parseUnittestOutput(stderr);
      // If stderr has a traceback unrelated to tests (e.g., import error), surface it
      if (parsed.tests.length === 0 && /Traceback|SyntaxError|ImportError|ModuleNotFoundError/.test(stderr)) {
        setTestError(stderr);
      }
      setTestResult({ ...parsed, stdout, rawStderr: stderr });
    } catch (err) {
      setTestError(err.message || String(err));
    } finally {
      setRunningTests(false);
    }
  }, [problem, pyodideStatus, runningTests, files, runTests]);

  function handleClearTerminal() {
    setTestResult(null);
    setTestError(null);
    setRunOutput(null);
  }

  const handleRunCode = useCallback(async () => {
    if (!problem || pyodideStatus !== 'ready' || runningCode || runningTests) return;
    setRunningCode(true);
    setTestError(null);
    setTestResult(null);
    setTerminalCollapsed(false);
    try {
      const fileMap = {};
      for (const f of files) fileMap[f.name] = f.content;
      const entry = files.find((f) => f.name === 'main.py') ? 'main.py' : null;
      if (!entry) throw new Error('No main.py to run');
      const { stdout, stderr } = await runFile(fileMap, entry);
      setRunOutput({ stdout, stderr });
    } catch (err) {
      setTestError(err.message || String(err));
    } finally {
      setRunningCode(false);
    }
  }, [problem, pyodideStatus, runningCode, runningTests, files, runFile]);

  function handleSave(fileName) {
    setSaveToast(`Saved ${fileName}`);
    setTimeout(() => setSaveToast(null), 1400);
  }

  function handleNewProblem(newModeId, hint) {
    setNewProblemOpen(false);
    startGeneration(newModeId, hint);
  }

  function handleRestart() {
    setStage(STAGES.START);
    setProblem(null);
    setProblemId(null);
    setProblemGenerated(false);
    setModeId(null);
    setFiles([]);
    setCheckpoints([]);
    setMessages([]);
    setTestResult(null);
    setTestError(null);
  }

  // ---------- Render by stage ----------

  // Pyodide initial load gate
  if (pyodideStatus === 'loading' && stage === STAGES.START) {
    // Allow Start screen anyway; Pyodide loads in background. But show a banner if needed.
  }

  if (stage === STAGES.START) {
    return (
      <div className="h-full w-full flex flex-col">
        <StartScreen onPick={handlePickMode} />
        <PyodideStatusBanner status={pyodideStatus} error={pyodideError} />
      </div>
    );
  }

  if (stage === STAGES.CONFIRM) {
    return (
      <div className="h-full w-full flex flex-col">
        <ConfirmScreen
          modeId={pendingModeId}
          onConfirm={handleConfirm}
          onBack={() => setStage(STAGES.START)}
        />
        <PyodideStatusBanner status={pyodideStatus} error={pyodideError} />
      </div>
    );
  }

  if (stage === STAGES.GENERATING) {
    return <LoadingScreen message="Generating your codebase..." />;
  }

  if (stage === STAGES.GEN_ERROR) {
    return (
      <LoadingScreen
        error={genError}
        onRetry={() => startGeneration(pendingModeId, pendingHint)}
        onBack={() => setStage(STAGES.START)}
      />
    );
  }

  if (stage === STAGES.DEBRIEF) {
    return (
      <DebriefScreen
        session={{
          modeId,
          domain: problem?.domain || '',
          checkpoints,
          checkpointTimes,
          totalElapsed: SESSION_SECONDS - sessionRemaining,
          messages,
          reason: sessionReason,
        }}
        onRestart={handleRestart}
      />
    );
  }

  // RUNNING
  return (
    <div className="h-full w-full flex flex-col bg-bg-900">
      <Navbar
        modeId={modeId}
        sessionSeconds={sessionRemaining}
        checkpoints={checkpoints}
        currentCheckpointIdx={currentCheckpointIdx}
        onRunTests={handleRunTests}
        onRunCode={handleRunCode}
        onNewProblem={() => setNewProblemOpen(true)}
        onHistory={() => setHistoryOpen(true)}
        runningTests={runningTests}
        runningCode={runningCode}
        pyodideReady={pyodideStatus === 'ready'}
        hasMain={files.some((f) => f.name === 'main.py')}
      />

      <CheckpointDrawer
        checkpoint={currentCheckpoint}
        accent={MODES[modeId].accent}
        elapsed={checkpointElapsed}
        onComplete={handleMarkComplete}
        allComplete={allComplete}
      />

      <div className="flex-1 flex min-h-0">
        <div style={{ width: 240 }} className="flex-shrink-0">
          <FileExplorer
            files={files}
            activeFile={activeFile}
            onPick={setActiveFile}
            dirtyFiles={dirtyFiles}
            domain={problem?.domain}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              files={files}
              activeFile={activeFile}
              onChange={handleEditorChange}
              onTabPick={setActiveFile}
              dirtyFiles={dirtyFiles}
              onSave={handleSave}
            />
          </div>
          <Terminal
            result={testResult}
            runOutput={runOutput}
            collapsed={terminalCollapsed}
            onToggle={() => setTerminalCollapsed(!terminalCollapsed)}
            onClear={handleClearTerminal}
            running={runningTests || runningCode}
            runningLabel={runningCode ? 'Running main.py...' : 'Running tests...'}
            error={testError}
          />
        </div>

        <div style={{ width: 320 }} className="flex-shrink-0">
          <ChatSidebar
            enabled={aiEnabled}
            modeId={modeId}
            accent={MODES[modeId].accent}
            activeFileName={activeFile}
            activeFileContent={activeFileObj?.content || ''}
            messages={messages}
            setMessages={setMessages}
          />
        </div>
      </div>

      {pyodideStatus !== 'ready' && (
        <div className="absolute bottom-3 left-3 bg-bg-800 border border-bg-600 rounded px-3 py-2 text-xs text-gray-300 flex items-center gap-2 shadow-lg">
          {pyodideStatus === 'loading' && (
            <>
              <span className="spinner w-3 h-3" />
              Loading Python runtime...
            </>
          )}
          {pyodideStatus === 'error' && (
            <span className="text-red-400">Python runtime failed: {pyodideError}</span>
          )}
        </div>
      )}

      {newProblemOpen && (
        <NewProblemModal
          currentModeId={modeId}
          onClose={() => setNewProblemOpen(false)}
          onRegenerate={handleNewProblem}
        />
      )}

      {historyOpen && (
        <HistoryModal onClose={() => setHistoryOpen(false)} onReplay={replayProblem} />
      )}

      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-bg-700 border border-bg-600 px-4 py-2 rounded text-sm text-gray-200 shadow-lg z-50 animate-slideIn flex items-center gap-2">
          <span className="text-green-400">✓</span>
          <span>{saveToast}</span>
          <span className="text-[10px] text-gray-500 font-mono">⌘S</span>
        </div>
      )}
    </div>
  );
}

function PyodideStatusBanner({ status, error }) {
  if (status === 'ready') return null;
  return (
    <div className="absolute bottom-3 left-3 bg-bg-800 border border-bg-600 rounded px-3 py-2 text-xs text-gray-300 flex items-center gap-2 shadow-lg">
      {status === 'loading' && (
        <>
          <span className="spinner w-3 h-3" />
          Loading Python runtime in background...
        </>
      )}
      {status === 'error' && (
        <span className="text-red-400">Python runtime failed: {error}</span>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameRecord } from "../game/types";
import { loadRecords, deleteRecord } from "../services/gameRecords";
import styles from "./MenuScreen.module.css";

interface MenuScreenProps {
  onStartGame: (cfg: {
    size: number;
    komi: number;
    aiMode: "none" | "black" | "white" | "katago-black" | "katago-white";
    playerColor: 1 | -1;
  }) => void;
  onLoadRecord: (record: GameRecord) => void;
}

/** Keeps setup local until start and paginates records to fit their available viewport slot. */
export default function MenuScreen({
  onStartGame,
  onLoadRecord,
}: MenuScreenProps) {
  const [config, setConfig] = useState({
    size: 9,
    komi: 7.5,
    aiMode: "none" as
      "none" | "black" | "white" | "katago-black" | "katago-white",
    playerColor: 1 as 1 | -1,
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const historyListRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(historyPage, pageCount - 1);
  const visibleRecords = records.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  // Paginate by the actual list slot, including after rotation; controls never move below the viewport.
  useEffect(() => {
    const list = historyListRef.current;
    if (!showHistory || !list) return;
    const observer = new ResizeObserver(([entry]) => {
      setPageSize(Math.max(1, Math.floor((entry.contentRect.height + 8) / 80)));
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [showHistory]);

  /** Refreshes persisted records each time the history panel opens. */
  const openHistory = useCallback(() => {
    setRecords(loadRecords());
    setHistoryPage(0);
    setShowHistory(true);
  }, []);

  /** Deletes only the selected local record and refreshes the visible list. */
  const handleDelete = useCallback((id: string) => {
    deleteRecord(id);
    setRecords(loadRecords());
  }, []);

  return (
    <div
      className={styles.menu}
      data-view={showConfig ? "config" : showHistory ? "history" : "home"}
    >
      <header className={styles.menuHeader}>
        <strong>
          itsmygo<span>．</span>
        </strong>
        <span>围棋 · 一起下一局</span>
      </header>
      <div className={styles.menuLayout}>
        <section className={styles.hero}>
          <h1 className={styles.menuTitle}>
            一黑一白，
            <br />
            皆有<span>妙趣。</span>
          </h1>
          <p className={styles.menuSub}>
            9 路、13 路、19 路棋盘。双人对弈，或和 AI 下一局。
          </p>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.artGrid} />
            <div className={`${styles.artStone} ${styles.artBlack}`}>
              <span>
                ⌒ ⌒<small>ᴗ</small>
              </span>
            </div>
            <div className={`${styles.artStone} ${styles.artWhite}`}>
              <span>
                • •<small>ᴗ</small>
              </span>
            </div>
          </div>
          <div className={styles.heroTags}>
            <span>三种棋盘</span>
            <span>表情棋子</span>
            <span>复盘与摆棋</span>
            <span>SGF 导出</span>
          </div>
        </section>
        <section className={styles.menuContent} aria-label="棋室">
          {!showConfig && !showHistory && (
            <div className={styles.menuButtons}>
              <div className={styles.sectionIntro}>
                <h2>选择对局方式</h2>
                <p>四种模式，随时可以换。</p>
              </div>
              <button
                className={styles.menuBtn}
                onClick={() => {
                  setConfig((c) => ({ ...c, aiMode: "none" }));
                  setShowConfig(true);
                }}
              >
                <span className={styles.menuBtnIcon}>●</span>
                <span>
                  双人对弈<small>两人轮流落子，同一块棋盘</small>
                </span>
              </button>
              <button className={styles.menuBtn} onClick={openHistory}>
                <span className={styles.menuBtnIcon}>◇</span>
                <span>
                  对局历史<small>打开存过的棋谱，逐步复盘</small>
                </span>
              </button>
              <button
                className={styles.menuBtn}
                onClick={() => {
                  setConfig((c) => ({ ...c, aiMode: "white", playerColor: 1 }));
                  setShowConfig(true);
                }}
              >
                <span className={styles.menuBtnIcon}>☆</span>
                <span>
                  本地 AI<small>浏览器内置，无需联网</small>
                </span>
              </button>
              <button
                className={styles.menuBtn}
                onClick={() => {
                  setConfig((c) => ({
                    ...c,
                    aiMode: "katago-white",
                    playerColor: 1,
                  }));
                  setShowConfig(true);
                }}
              >
                <span className={styles.menuBtnIcon}>⚡</span>
                <span>
                  KataGo<small>需要后端引擎，棋力更强</small>
                </span>
              </button>
            </div>
          )}

          {showConfig && (
            <div className={styles.config}>
              <div className={styles.configTitle}>
                {config.aiMode === "none"
                  ? "新建对局"
                  : config.aiMode.startsWith("katago")
                    ? "KataGo对战"
                    : "AI对战"}
              </div>

              {config.aiMode !== "none" && (
                <div className={styles.configGroup}>
                  <span className={styles.configLabel}>执子</span>
                  <div className={styles.configOptions}>
                    <button
                      aria-pressed={config.playerColor === 1}
                      className={`${styles.configOpt} ${config.playerColor === 1 ? styles.configOptActive : ""}`}
                      onClick={() =>
                        setConfig((c) => ({ ...c, playerColor: 1 as const }))
                      }
                    >
                      <span className={`${styles.stoneDot} ${styles.stoneDotBlack}`} />
                      黑棋
                    </button>
                    <button
                      aria-pressed={config.playerColor === -1}
                      className={`${styles.configOpt} ${config.playerColor === -1 ? styles.configOptActive : ""}`}
                      onClick={() =>
                        setConfig((c) => ({ ...c, playerColor: -1 as const }))
                      }
                    >
                      <span className={`${styles.stoneDot} ${styles.stoneDotWhite}`} />
                      白棋
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.configGroup}>
                <span className={styles.configLabel}>棋盘</span>
                <div className={styles.configOptions}>
                  {[9, 13, 19].map((s) => (
                    <button
                      key={s}
                      aria-pressed={config.size === s}
                      className={`${styles.configOpt} ${config.size === s ? styles.configOptActive : ""}`}
                      onClick={() => setConfig((c) => ({ ...c, size: s }))}
                    >
                      {s}路
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.configGroup}>
                <span className={styles.configLabel}>贴目</span>
                <div className={styles.configOptions}>
                  {[5.5, 6.5, 7.5].map((k) => (
                    <button
                      key={k}
                      aria-pressed={config.komi === k}
                      className={`${styles.configOpt} ${config.komi === k ? styles.configOptActive : ""}`}
                      onClick={() => setConfig((c) => ({ ...c, komi: k }))}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.configButtons}>
                <button
                  className={styles.configStart}
                  onClick={() => onStartGame(config)}
                >
                  开始对局 →
                </button>
                <button
                  className={styles.configCancel}
                  onClick={() => setShowConfig(false)}
                >
                  返回
                </button>
              </div>
            </div>
          )}

          {showHistory && (
            <div className={styles.historyPanel}>
              <div className={styles.configTitle}>对局历史</div>
              <div ref={historyListRef} className={styles.historyList}>
                {records.length === 0 ? (
                  <div className={styles.historyEmpty}>暂无记录</div>
                ) : (
                  visibleRecords.map((rec) => (
                    <div key={rec.id} className={styles.historyItem}>
                      <button
                        className={styles.historyOpen}
                        onClick={() => onLoadRecord(rec)}
                        aria-label={`打开 ${rec.date} 的 ${rec.size} 路对局`}
                      >
                        <span className={styles.historyInfo}>
                          <span>
                            {rec.size}路 · {rec.date}
                          </span>
                          <span className={styles.historyResult}>
                            {rec.result}
                          </span>
                        </span>
                        <span className={styles.historyInfo}>
                          {rec.moves.length} 手
                        </span>
                      </button>
                      <button
                        className={styles.historyDel}
                        onClick={() => handleDelete(rec.id)}
                        aria-label={`删除 ${rec.date} 的对局`}
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className={styles.historyNavigation}>
                <button
                  className={styles.configCancel}
                  onClick={() => setShowHistory(false)}
                >
                  返回
                </button>
                <button
                  className={styles.pageButton}
                  aria-label="上一页对局"
                  disabled={currentPage === 0}
                  onClick={() => setHistoryPage(currentPage - 1)}
                >
                  ←
                </button>
                <span aria-live="polite">
                  {currentPage + 1} / {pageCount}
                </span>
                <button
                  className={styles.pageButton}
                  aria-label="下一页对局"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setHistoryPage(currentPage + 1)}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      <footer className={styles.menuFooter}>
        <span>本地保存最近 50 局</span>
        <span>itsmygo</span>
      </footer>
    </div>
  );
}

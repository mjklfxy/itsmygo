import { useState, useCallback } from "react";
import type { GameRecord } from "../game/types";
import { loadRecords, deleteRecord } from "../game/sgf";
import styles from "./MenuScreen.module.css";

interface MenuScreenProps {
  onStartGame: (cfg: {
    size: number;
    komi: number;
    aiMode: "none" | "black" | "white";
    playerColor: 1 | -1;
  }) => void;
  onLoadRecord: (record: GameRecord) => void;
}

export default function MenuScreen({ onStartGame, onLoadRecord }: MenuScreenProps) {
  const [config, setConfig] = useState({
    size: 9,
    komi: 7.5,
    aiMode: "none" as "none" | "black" | "white",
    playerColor: 1 as 1 | -1,
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [records, setRecords] = useState<GameRecord[]>([]);

  const openHistory = useCallback(() => {
    setRecords(loadRecords());
    setShowHistory(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteRecord(id);
    setRecords(loadRecords());
  }, []);

  return (
    <div className={styles.menu}>
      <h1 className={styles.menuTitle}>围棋</h1>
      <p className={styles.menuSub}>Go · Weiqi</p>

      {!showConfig && !showHistory && (
        <div className={styles.menuButtons}>
          <button
            className={styles.menuBtn}
            onClick={() => {
              setConfig((c) => ({ ...c, aiMode: "none" }));
              setShowConfig(true);
            }}
          >
            <span className={styles.menuBtnIcon}>●</span>
            <span>新建对局</span>
          </button>
          <button className={styles.menuBtn} onClick={openHistory}>
            <span className={styles.menuBtnIcon}>◇</span>
            <span>对局历史</span>
          </button>
          <button
            className={styles.menuBtn}
            onClick={() => {
              setConfig((c) => ({ ...c, aiMode: "white", playerColor: 1 }));
              setShowConfig(true);
            }}
          >
            <span className={styles.menuBtnIcon}>☆</span>
            <span>AI对战</span>
          </button>
        </div>
      )}

      {showConfig && (
        <div className={styles.config}>
          <div className={styles.configTitle}>
            {config.aiMode === "none" ? "新建对局" : "AI对战"}
          </div>

          {config.aiMode !== "none" && (
            <div className={styles.configGroup}>
              <span className={styles.configLabel}>执子</span>
              <div className={styles.configOptions}>
                <button
                  className={`${styles.configOpt} ${config.playerColor === 1 ? styles.configOptActive : ""}`}
                  onClick={() =>
                    setConfig((c) => ({ ...c, playerColor: 1 as const }))
                  }
                >
                  <span
                    style={{
                      background:
                        "radial-gradient(circle at 35% 35%, #666, #222)",
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      verticalAlign: "middle",
                      marginRight: 4,
                    }}
                  />
                  黑棋
                </button>
                <button
                  className={`${styles.configOpt} ${config.playerColor === -1 ? styles.configOptActive : ""}`}
                  onClick={() =>
                    setConfig((c) => ({ ...c, playerColor: -1 as const }))
                  }
                >
                  <span
                    style={{
                      background:
                        "radial-gradient(circle at 35% 35%, #fff, #f0e8ee)",
                      border: "1px solid #d8ccd0",
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      verticalAlign: "middle",
                      marginRight: 4,
                    }}
                  />
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
              开始
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
          <div className={styles.historyList}>
            {records.length === 0 ? (
              <div className={styles.historyEmpty}>暂无记录</div>
            ) : (
              records.map((rec) => (
                <div
                  key={rec.id}
                  className={styles.historyItem}
                  onClick={() => onLoadRecord(rec)}
                  style={{ cursor: "pointer" }}
                >
                  <div className={styles.historyInfo}>
                    <span>
                      {rec.size}路 · {rec.date}
                    </span>
                    <span className={styles.historyResult}>{rec.result}</span>
                  </div>
                  <div className={styles.historyInfo}>
                    <span>{rec.moves.length} 手</span>
                    <button
                      className={styles.historyDel}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rec.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            className={styles.configCancel}
            onClick={() => setShowHistory(false)}
          >
            返回
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useCallback } from "react";
import type { GameRecord } from "../game/types";
import { GameProvider } from "../context/GameContext";
import MenuScreen from "../screens/MenuScreen";
import GameScreen from "../screens/GameScreen";
import styles from "./App.module.css";

type Screen = "menu" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameConfig, setGameConfig] = useState({
    size: 19,
    komi: 7.5,
    aiMode: "none" as "none" | "black" | "white" | "katago-black" | "katago-white",
  });
  const [gameKey, setGameKey] = useState(0);
  const [pendingRecord, setPendingRecord] = useState<GameRecord | null>(null);

  const handleStartGame = useCallback(
    (cfg: {
      size: number;
      komi: number;
      aiMode: "none" | "black" | "white" | "katago-black" | "katago-white";
      playerColor: 1 | -1;
    }) => {
      let aiMode: "none" | "black" | "white" | "katago-black" | "katago-white"
      if (cfg.aiMode === "none") {
        aiMode = "none"
      } else if (cfg.aiMode === "katago-black" || cfg.aiMode === "katago-white") {
        aiMode = cfg.playerColor === 1 ? "katago-white" : "katago-black"
      } else {
        aiMode = cfg.playerColor === 1 ? "white" : "black"
      }
      setGameConfig({ size: cfg.size, komi: cfg.komi, aiMode });
      setPendingRecord(null);
      setScreen("game");
      setGameKey((k) => k + 1);
    },
    [],
  );

  const handleLoadRecord = useCallback((record: GameRecord) => {
    setPendingRecord(record);
    setScreen("game");
    setGameKey((k) => k + 1);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen("menu");
    setPendingRecord(null);
  }, []);

  return (
    <div className={styles.container}>
      {screen === "menu" ? (
        <MenuScreen
          onStartGame={handleStartGame}
          onLoadRecord={handleLoadRecord}
        />
      ) : (
        <GameProvider
          key={gameKey}
          size={gameConfig.size}
          komi={gameConfig.komi}
          aiMode={gameConfig.aiMode}
        >
          <GameScreen
            onBackToMenu={handleBackToMenu}
            pendingRecord={pendingRecord}
            onRecordLoaded={() => setPendingRecord(null)}
          />
        </GameProvider>
      )}
    </div>
  );
}

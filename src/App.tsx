import { useState, useCallback } from "react";
import type { GameRecord } from "./game/types";
import { GameProvider } from "./context/GameContext";
import MenuScreen from "./screens/MenuScreen";
import GameScreen from "./screens/GameScreen";
import styles from "./App.module.css";

type Screen = "menu" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameConfig, setGameConfig] = useState({
    size: 19,
    komi: 7.5,
    aiMode: "none" as "none" | "black" | "white",
  });
  const [gameKey, setGameKey] = useState(0);
  const [pendingRecord, setPendingRecord] = useState<GameRecord | null>(null);

  const handleStartGame = useCallback(
    (cfg: {
      size: number;
      komi: number;
      aiMode: "none" | "black" | "white";
      playerColor: 1 | -1;
    }) => {
      const aiMode =
        cfg.aiMode === "none"
          ? ("none" as const)
          : cfg.playerColor === 1
            ? ("white" as const)
            : ("black" as const);
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

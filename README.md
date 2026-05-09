# ItsMyGo — 可爱围棋游戏

一个基于 React + TypeScript + Vite 的浏览器围棋游戏，带有可爱的 kaomoji 棋子表情和流畅的 SVG 动画。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

## 功能

- **三种棋盘**：9 路、13 路、19 路
- **AI 对手**：启发式引擎，具备吃子/救子、棋形判断、位置评估
- **自动数子**：6 阶段流水线（棋组活力分析、双活检测、影响传播、领地估算）
- **Kaomoji 棋子**：根据气数动态切换表情 `♥‿♥` → `－_－` → `>_<` → `T_T`
- **放置动画**：落子时金色粒子爆炸效果
- **复盘 / 试下**：回放对局或自由摆棋探索变化
- **SGF 导出**：支持标准 Smart Game Format 格式
- **存档管理**：localStorage 保存最多 50 局对局记录
- **贴目可选**：5.5 / 6.5 / 7.5

## 快速开始

```bash
npm install
npm run dev
```

浏览器访问 http://localhost:5173

## 命令

| 命令              | 说明                    |
| ----------------- | ----------------------- |
| `npm run dev`     | 启动开发服务器          |
| `npm run build`   | 类型检查 + 构建生产版本 |
| `npm run preview` | 预览构建产物            |
| `npm run lint`    | ESLint 检查             |

## 项目结构

```
src/
├── main.tsx              # Vite HTML 入口转发
├── app/
│   ├── main.tsx          # React 挂载入口
│   ├── App.tsx           # 根组件（菜单 + 对局界面）
│   └── App.module.css
├── styles/
│   └── global.css        # 全局样式
├── screens/
│   ├── MenuScreen.tsx    # 主菜单、配置、历史载入
│   └── GameScreen.tsx    # 对局页面布局
├── components/
│   ├── board/            # SVG 棋盘、棋子表情、落子动画、领地覆盖层
│   └── panel/            # 侧边面板（控制、评估、对局历史）
├── context/              # React Context Provider 和 context value
├── hooks/                # UI 与 game/services 的连接层
├── services/
│   ├── gameRecords.ts    # localStorage 存档管理
│   └── sgfDownload.ts    # 浏览器文件下载
└── game/                 # 围棋领域层，不依赖 React/DOM/localStorage
    ├── types.ts          # 核心类型定义
    ├── board.ts          # 棋盘基础工具
    ├── logic.ts          # 规则引擎（落子、提子、计分）
    ├── reducer.ts        # useReducer 状态机
    ├── result.ts         # 结果格式化
    ├── sgf.ts            # 纯 SGF 编码
    ├── evaluate.ts       # 形势判断
    ├── ownership.ts      # 自动领地归属判定
    ├── ai/
    │   └── heuristicAi.ts # 启发式 AI 对手
    └── modes/            # play/review/try 模式处理器
```

## 架构

采用 Model-View-Update 模式，通过 React `useReducer` 驱动：

```
app/App.tsx (屏幕切换)
  └── GameProvider (useReducer 状态容器)
        ├── screens/GameScreen.tsx
        │     ├── components/board/GoBoard.tsx
        │     └── components/panel/GamePanel.tsx
        └── hooks/
              ├── useGameAI.ts
              ├── useGameAutoSave.ts
              └── useGamePersistence.ts
        │ dispatch(action)
  gameReducer (reducer.ts)
        ├── logic.ts      (规则)
        ├── ownership.ts  (数子)
        ├── result.ts     (结果)
        └── ai/heuristicAi.ts (AI)

services/
  ├── gameRecords.ts      (localStorage)
  └── sgfDownload.ts      (浏览器下载)
```

`game/` 是领域核心，保持纯 TypeScript：不直接访问 React、DOM、`localStorage` 或网络。  
`services/` 负责浏览器能力和外部集成；以后接 GTP 引擎时建议新增 `services/gtpClient.ts`，再在 `game/ai/` 下添加对应的 AI 适配器。

## License

MIT

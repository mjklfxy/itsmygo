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
├── main.tsx              # React 入口
├── App.tsx               # 根组件（菜单 + 对局界面）
├── components/
│   ├── GoBoard.tsx       # SVG 棋盘渲染（棋子、动画、领地覆盖层）
│   └── GamePanel.tsx     # 侧边面板（控制、评估、对局历史）
└── game/
    ├── types.ts          # 核心类型定义
    ├── logic.ts          # 纯函数规则引擎（落子、提子、计分、形势判断）
    ├── reducer.ts        # useReducer 状态机（14 种 action）
    ├── ai.ts             # AI 对手逻辑
    ├── ownership.ts      # 自动领地归属判定
    └── sgf.ts            # SGF 导出 + 存档持久化
```

## 架构

采用 Model-View-Update 模式，通过 React `useReducer` 驱动：

```
App.tsx (状态管理)
  ├── GoBoard.tsx   (SVG 棋盘视图)
  └── GamePanel.tsx (控制面板 UI)
        │ dispatch(action)
  gameReducer (reducer.ts)
        ├── logic.ts      (规则)
        ├── ownership.ts  (数子)
        └── ai.ts         (AI)
```

## License

MIT

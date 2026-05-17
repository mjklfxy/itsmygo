# ItsMyGo — 可爱围棋游戏

一个基于 React + TypeScript + Vite 的浏览器围棋游戏，带有可爱的 kaomoji 棋子表情和流畅的 SVG 动画。支持通过 KataGo GTP 引擎进行强 AI 对弈。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-latest-FBF0DF?logo=bun&logoColor=black)

## 功能

- **三种棋盘**：9 路、13 路、19 路
- **启发式 AI**：内置轻量 AI 对手，零延迟
- **KataGo 对弈**：通过后端 GTP 协议转发接入 KataGo 引擎
- **自动数子**：6 阶段流水线（棋组活力分析、双活检测、影响传播、领地估算）
- **Kaomoji 棋子**：根据气数动态切换表情 `♥‿♥` → `－_－` → `>_<` → `T_T`
- **放置动画**：落子时金色粒子爆炸效果
- **复盘 / 试下**：回放对局或自由摆棋探索变化
- **SGF 导出**：支持标准 Smart Game Format 格式
- **存档管理**：localStorage 保存最多 50 局对局记录
- **贴目可选**：5.5 / 6.5 / 7.5

## 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 http://localhost:5173

### 后端（可选，用于 KataGo 对弈）

```bash
cd backend
bun install
bun run dev
```

后端运行在 http://localhost:3001

### KataGo 配置

1. 下载 [KataGo](https://github.com/lightvector/KataGo) 二进制文件和神经网络模型
2. 将文件放到 `backend/katago/` 目录
3. 启动后端后，通过 API 启动 KataGo：

```bash
curl -X POST http://localhost:3001/api/katago/start \
  -H "Content-Type: application/json" \
  -d '{"katagoPath":"./katago/katago","modelPath":"./katago/model.bin.gz","configPath":"./katago/analysis.cfg"}'
```

4. 前端选择「KataGo对战」即可

## 命令

| 命令 | 说明 |
|------|------|
| `cd frontend && npm run dev` | 启动前端开发服务器 |
| `cd frontend && npm run build` | 构建前端生产版本 |
| `cd backend && bun run dev` | 启动后端开发服务器（热重载） |
| `cd backend && bun run start` | 启动后端生产模式 |

## 项目结构

```
.
├── frontend/               # 前端 React 应用
│   ├── package.json
│   ├── vite.config.ts      # Vite 配置 + 开发代理 → backend:3001
│   ├── index.html
│   └── src/
│       ├── app/            # React 入口和根组件
│       ├── screens/        # 菜单、对局页面
│       ├── components/     # SVG 棋盘、面板组件
│       ├── context/        # React Context
│       ├── hooks/          # UI-game 连接层（含 KataGo 调用）
│       ├── services/       # API 客户端、localStorage、下载
│       └── game/           # 围棋领域层（纯 TypeScript）
│           ├── types.ts
│           ├── logic.ts
│           ├── reducer.ts
│           ├── gtpCoords.ts  # GTP 坐标转换
│           ├── ai/
│           │   └── heuristicAi.ts
│           └── modes/
├── backend/                # 后端 Bun 服务器
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts        # HTTP 服务器入口 (port 3001)
│       ├── routes.ts       # API 路由
│       ├── gtp.ts          # GTP 协议编解码
│       └── katago.ts       # KataGo 进程管理
└── README.md
```

## 架构

```
Browser → Frontend (React/Vite) → HTTP API → Backend (Bun) → GTP → KataGo
                                        ↑
                                  启发式 AI（客户端直调，零延迟）
```

- **前端**：React + useReducer 状态机，游戏逻辑全部在浏览器运行
- **后端**：Bun HTTP 服务器，仅做 GTP 协议转发到 KataGo 子进程
- **启发式 AI**：客户端内置，无需后端，适合快速对弈
- **KataGo AI**：通过后端 `/api/move` 接口调用，需要 KataGo 二进制文件

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | KataGo 运行状态 |
| POST | `/api/katago/start` | 启动 KataGo 进程 |
| POST | `/api/katago/stop` | 停止 KataGo 进程 |
| POST | `/api/move` | 请求 KataGo 推荐着法 |
| POST | `/api/gtp` | 发送原始 GTP 命令 |
| POST | `/api/analyze` | 局面分析 |

## License

MIT

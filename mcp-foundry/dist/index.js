#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { execSync, spawn } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dist/index.js → mcp-foundry/ → project root → sc/
const PROJECT_ROOT = process.env.FOUNDRY_PROJECT_ROOT ?? path.resolve(__dirname, "../..");
const SC_DIR = process.env.FOUNDRY_SC_DIR ?? path.join(PROJECT_ROOT, "sc");
let anvilProcess = null;
// Merges stderr into stdout so all Foundry coloured output is captured.
// Returns Buffer and converts to string to avoid TS overload ambiguity with shell+encoding.
function run(cmd, cwd = SC_DIR) {
    try {
        const buf = execSync(`${cmd} 2>&1`, {
            cwd,
            timeout: 180_000,
            shell: "/bin/sh",
        });
        return buf.toString();
    }
    catch (err) {
        const out = err.stdout instanceof Buffer
            ? err.stdout.toString()
            : err.stdout ??
                err.message ??
                String(err);
        throw new Error(out.trim());
    }
}
// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
    {
        name: "forge_build",
        description: "Compile Solidity contracts with `forge build`.",
        inputSchema: {
            type: "object",
            properties: {
                extra_args: {
                    type: "string",
                    description: "Additional forge build flags (e.g. '--sizes')",
                },
            },
        },
    },
    {
        name: "forge_test",
        description: "Run the Foundry test suite. Supports filtering by test or contract name.",
        inputSchema: {
            type: "object",
            properties: {
                match_test: {
                    type: "string",
                    description: "Filter tests by function name (--match-test)",
                },
                match_contract: {
                    type: "string",
                    description: "Filter tests by contract name (--match-contract)",
                },
                verbosity: {
                    type: "number",
                    description: "Verbosity level 1-5 (default 3)",
                    default: 3,
                },
                gas_report: {
                    type: "boolean",
                    description: "Include gas report (--gas-report)",
                },
            },
        },
    },
    {
        name: "forge_coverage",
        description: "Run test coverage analysis with `forge coverage`.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "forge_deploy",
        description: "Deploy the SupplyChain contract using Deploy.s.sol via `forge script --broadcast`.",
        inputSchema: {
            type: "object",
            properties: {
                private_key: {
                    type: "string",
                    description: "Deployer private key (hex with 0x prefix)",
                },
                rpc_url: {
                    type: "string",
                    description: "Target RPC URL (default: http://localhost:8545)",
                    default: "http://localhost:8545",
                },
                script: {
                    type: "string",
                    description: "Foundry script file to run (default: script/Deploy.s.sol)",
                    default: "script/Deploy.s.sol",
                },
                broadcast: {
                    type: "boolean",
                    description: "Broadcast the transaction (default true)",
                    default: true,
                },
            },
            required: ["private_key"],
        },
    },
    {
        name: "anvil_start",
        description: "Start a local Anvil blockchain node.",
        inputSchema: {
            type: "object",
            properties: {
                port: {
                    type: "number",
                    description: "Port to listen on (default 8545)",
                    default: 8545,
                },
                chain_id: {
                    type: "number",
                    description: "Chain ID (default 31337)",
                    default: 31337,
                },
                block_time: {
                    type: "number",
                    description: "Seconds between blocks. Omit for instant mining.",
                },
                accounts: {
                    type: "number",
                    description: "Number of accounts to generate (default 10)",
                },
                silent: {
                    type: "boolean",
                    description: "Suppress Anvil output logs (default true)",
                    default: true,
                },
            },
        },
    },
    {
        name: "anvil_stop",
        description: "Stop the Anvil node started by this server.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "cast_call",
        description: "Call a read-only contract function with `cast call`. Returns the raw decoded output.",
        inputSchema: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Contract address (0x...)",
                },
                function_sig: {
                    type: "string",
                    description: "Function signature, e.g. 'isAdmin(address)'",
                },
                args: {
                    type: "array",
                    items: { type: "string" },
                    description: "Positional arguments for the function",
                },
                rpc_url: {
                    type: "string",
                    description: "RPC URL (default: http://localhost:8545)",
                    default: "http://localhost:8545",
                },
            },
            required: ["address", "function_sig"],
        },
    },
    {
        name: "cast_send",
        description: "Send a state-changing transaction to a contract with `cast send`.",
        inputSchema: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Contract address (0x...)",
                },
                function_sig: {
                    type: "string",
                    description: "Function signature, e.g. 'transfer(address,uint256)'",
                },
                args: {
                    type: "array",
                    items: { type: "string" },
                    description: "Positional arguments for the function",
                },
                private_key: {
                    type: "string",
                    description: "Sender private key (hex with 0x prefix)",
                },
                rpc_url: {
                    type: "string",
                    description: "RPC URL (default: http://localhost:8545)",
                    default: "http://localhost:8545",
                },
                value: {
                    type: "string",
                    description: "ETH value to send (e.g. '0.1ether')",
                },
            },
            required: ["address", "function_sig", "private_key"],
        },
    },
    {
        name: "cast_balance",
        description: "Get the ETH balance of an address in ether.",
        inputSchema: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Wallet or contract address (0x...)",
                },
                rpc_url: {
                    type: "string",
                    description: "RPC URL (default: http://localhost:8545)",
                    default: "http://localhost:8545",
                },
            },
            required: ["address"],
        },
    },
    {
        name: "cast_receipt",
        description: "Get the receipt of a transaction by hash.",
        inputSchema: {
            type: "object",
            properties: {
                tx_hash: {
                    type: "string",
                    description: "Transaction hash (0x...)",
                },
                rpc_url: {
                    type: "string",
                    description: "RPC URL (default: http://localhost:8545)",
                    default: "http://localhost:8545",
                },
            },
            required: ["tx_hash"],
        },
    },
];
// ── Request handlers ──────────────────────────────────────────────────────────
const server = new Server({ name: "mcp-foundry", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: a = {} } = request.params;
    try {
        switch (name) {
            // ── forge ──────────────────────────────────────────────────────────────
            case "forge_build": {
                const extra = a.extra_args ?? "";
                const out = run(`forge build ${extra}`.trim());
                return text(out);
            }
            case "forge_test": {
                let cmd = "forge test";
                if (a.match_test)
                    cmd += ` --match-test "${a.match_test}"`;
                if (a.match_contract)
                    cmd += ` --match-contract "${a.match_contract}"`;
                const v = a.verbosity ?? 3;
                cmd += ` -${"v".repeat(Math.min(Math.max(v, 1), 5))}`;
                if (a.gas_report)
                    cmd += " --gas-report";
                return text(run(cmd));
            }
            case "forge_coverage": {
                return text(run("forge coverage"));
            }
            case "forge_deploy": {
                const pk = a.private_key;
                const rpc = a.rpc_url ?? "http://localhost:8545";
                const script = a.script ?? "script/Deploy.s.sol";
                const broadcast = a.broadcast !== false;
                let cmd = `forge script ${script} --rpc-url ${rpc} --private-key ${pk}`;
                if (broadcast)
                    cmd += " --broadcast";
                return text(run(cmd));
            }
            // ── anvil ──────────────────────────────────────────────────────────────
            case "anvil_start": {
                if (anvilProcess) {
                    return text(`Anvil is already running (PID ${anvilProcess.pid}).`);
                }
                const port = a.port ?? 8545;
                const chainId = a.chain_id ?? 31337;
                const anvilArgs = [
                    "--port", String(port),
                    "--chain-id", String(chainId),
                ];
                if (a.block_time)
                    anvilArgs.push("--block-time", String(a.block_time));
                if (a.accounts)
                    anvilArgs.push("--accounts", String(a.accounts));
                if (a.silent !== false)
                    anvilArgs.push("--silent");
                anvilProcess = spawn("anvil", anvilArgs, {
                    detached: false,
                    stdio: ["ignore", "pipe", "pipe"],
                });
                // Wait until Anvil is ready or fail after 10 s
                await new Promise((resolve, reject) => {
                    const tid = setTimeout(() => reject(new Error("Anvil did not start within 10 s")), 10_000);
                    const ready = () => { clearTimeout(tid); resolve(); };
                    anvilProcess.stdout.on("data", ready); // --silent still emits one line
                    anvilProcess.stderr.on("data", ready);
                    anvilProcess.on("error", (e) => { clearTimeout(tid); reject(e); });
                    // If --silent, no output — resolve after short delay
                    setTimeout(ready, 1_500);
                });
                return text(`Anvil started — port ${port}, chainId ${chainId}, PID ${anvilProcess.pid}`);
            }
            case "anvil_stop": {
                if (!anvilProcess)
                    return text("No Anvil process is running.");
                anvilProcess.kill("SIGTERM");
                anvilProcess = null;
                return text("Anvil stopped.");
            }
            // ── cast ───────────────────────────────────────────────────────────────
            case "cast_call": {
                const rpc = a.rpc_url ?? "http://localhost:8545";
                const callArgs = (a.args ?? [])
                    .map((x) => JSON.stringify(x))
                    .join(" ");
                const cmd = `cast call ${a.address} "${a.function_sig}" ${callArgs} --rpc-url ${rpc}`;
                return text(run(cmd.trim(), PROJECT_ROOT));
            }
            case "cast_send": {
                const rpc = a.rpc_url ?? "http://localhost:8545";
                const sendArgs = (a.args ?? [])
                    .map((x) => JSON.stringify(x))
                    .join(" ");
                const value = a.value ? `--value ${a.value}` : "";
                const cmd = `cast send ${a.address} "${a.function_sig}" ${sendArgs} ` +
                    `--private-key ${a.private_key} --rpc-url ${rpc} ${value}`;
                return text(run(cmd.trim(), PROJECT_ROOT));
            }
            case "cast_balance": {
                const rpc = a.rpc_url ?? "http://localhost:8545";
                const out = run(`cast balance ${a.address} --ether --rpc-url ${rpc}`, PROJECT_ROOT);
                return text(`${out.trim()} ETH`);
            }
            case "cast_receipt": {
                const rpc = a.rpc_url ?? "http://localhost:8545";
                return text(run(`cast receipt ${a.tx_hash} --rpc-url ${rpc}`, PROJECT_ROOT));
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (err) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
});
// ── Helpers ───────────────────────────────────────────────────────────────────
function text(content) {
    return { content: [{ type: "text", text: content }] };
}
// ── Entry point ───────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

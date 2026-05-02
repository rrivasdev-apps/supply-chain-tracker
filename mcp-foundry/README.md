# mcp-foundry

Servidor MCP que expone las herramientas de Foundry CLI (`forge`, `anvil`, `cast`) como herramientas llamables por Claude.

## Herramientas disponibles

| Herramienta | Comando equivalente |
|---|---|
| `forge_build` | `forge build` |
| `forge_test` | `forge test --match-test ... -vvv` |
| `forge_coverage` | `forge coverage` |
| `forge_deploy` | `forge script ... --broadcast` |
| `anvil_start` | `anvil --port 8545 --chain-id 31337` |
| `anvil_stop` | `kill <anvil_pid>` |
| `cast_call` | `cast call <addr> "fn()" args` |
| `cast_send` | `cast send <addr> "fn()" args --private-key ...` |
| `cast_balance` | `cast balance <addr> --ether` |
| `cast_receipt` | `cast receipt <txhash>` |

## Instalación

```bash
cd mcp-foundry
npm install
npm run build
```

## Configuración en Claude Desktop

Edita `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "foundry": {
      "command": "node",
      "args": ["/ruta/absoluta/Supply-chain-tracker/mcp-foundry/dist/index.js"]
    }
  }
}
```

Reemplaza `/ruta/absoluta/` con la ruta real en tu máquina.

## Configuración en Claude Code (CLI)

```bash
claude mcp add foundry node /ruta/absoluta/Supply-chain-tracker/mcp-foundry/dist/index.js
```

## Variables de entorno opcionales

| Variable | Default | Descripción |
|---|---|---|
| `FOUNDRY_PROJECT_ROOT` | raíz del repositorio | Directorio raíz del proyecto |
| `FOUNDRY_SC_DIR` | `<PROJECT_ROOT>/sc` | Directorio donde está `foundry.toml` |

Útiles si usas el servidor desde fuera del repositorio.

## Ejemplos de uso con Claude

Una vez configurado, puedes pedirle a Claude:

- *"Compila el contrato y dime si hay errores de compilación"*
- *"Ejecuta todos los tests y muéstrame el resumen"*
- *"Ejecuta solo los tests de certificación con verbosidad máxima"*
- *"Inicia Anvil y despliega el contrato con la clave privada 0xac09..."*
- *"Llama a `isAdmin` con la dirección `0x1234...` en el contrato desplegado"*
- *"¿Cuánto ETH tiene la cuenta `0x5678...`?"*
- *"Muéstrame el gas report de los tests"*

## Verificar con MCP Inspector

```bash
npm run inspector
```

Abre el inspector en el navegador para probar cada herramienta manualmente.

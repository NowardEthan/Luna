# Add-on Luna Finanças (v2)

Gestão financeira integrada na Luna: contas, transações, orçamentos, metas, recorrentes, **contas a pagar**, **cartões**, **caixinhas**, analytics, alertas e **assistente Luna Gestora** com ferramentas para o modelo.

## Desenvolvimento

1. Instale o pacote no projeto e na pasta de plugins do utilizador:

   ```bash
   npm run addon:install-finances-dev
   ```

2. Reinicie a app (`npm run dev`).

3. Em **Definições → Add-ons**, active **Luna Finanças** (add-on de confiança; confirme o aviso de risco).

4. O botão **Finanças** aparece na barra lateral. Atalho: `Ctrl+Shift+F`. Comando na paleta: «Abrir Finanças».
5. Na vista Finanças, use o **chat integrado à direita** (mesmo pipeline do Luna IDE) — o modelo recebe contexto financeiro e tools `luna-finances__*`.
6. Personalidade **Gestora** disponível no seletor de tom do chat.

## Arquitectura

- Pacote fino: `addons/luna-finances/` (entry `index.js` + `plugin.json`).
- Lógica na app: `src/plugins/luna-finances/` (bridge, tools do agente).
- UI e dados: `src/features/finances/` (store local + sync Firestore na Conta Lunar).

## Sync na nuvem

Com Conta Lunar autenticada, os dados sincronizam em `users/{uid}/finance*`. Offline, tudo permanece em `localStorage` (`luna-finances-v1`).

Se aparecer «Missing or insufficient permissions», as regras Firestore ainda não incluem as coleções `finance*`. Publica:

```bash
npm run firebase:deploy-rules
```

Depois recarrega a app e clica em **Sincronizar agora** em Finanças.

## Ferramentas do agente (v2)

Com o add-on activo, o modelo pode usar entre outras: `list_accounts`, `get_summary`, `list_transactions`, `add_transaction`, `add_transfer`, `list_bills`, `add_bill`, `pay_bill`, `list_cards`, `list_recurring`, `generate_recurring`, `list_piggy_banks`, `piggy_deposit`, `categorize_transaction`, etc.

## Export

Na vista Finanças (com Conta Lunar): botão **Export CSV** na barra de sync.

#!/usr/bin/env python3
"""Sincroniza planos Firestore a partir de cobranças pagas no Asaas (webhook perdido)."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "backend"))

from luna.billing.sync import sync_all_recent_paid, sync_payment_by_id, sync_user_billing_from_asaas


async def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("Sincronizando cobranças RECEIVED/CONFIRMED recentes…")
        results = await sync_all_recent_paid()
        for row in results:
            print(row)
        ok = [r for r in results if r.get("ok") and r.get("plan")]
        print(f"\n{len(ok)} plano(s) atualizado(s).")
        return

    if args[0] == "--email" and len(args) >= 3:
        email = args[1]
        uid = args[2]
        result = await sync_user_billing_from_asaas(uid=uid, email=email)
        print(result)
        return

    if args[0].startswith("pay_"):
        result = await sync_payment_by_id(args[0])
        print(result)
        return

    print(
        "Uso:\n"
        "  python scripts/billing-sync-asaas.py\n"
        "  python scripts/billing-sync-asaas.py pay_XXXXX\n"
        "  python scripts/billing-sync-asaas.py --email user@mail.com FIREBASE_UID",
    )


if __name__ == "__main__":
    asyncio.run(main())

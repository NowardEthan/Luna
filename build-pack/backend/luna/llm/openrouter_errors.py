from __future__ import annotations


def format_openrouter_http_error(status: int, message: str) -> str:
    detail = str(message or "").strip() or "Provider returned error"
    if status == 402:
        return (
            "OpenRouter recusou o pedido (402 — créditos ou permissões).\n\n"
            "• Adiciona créditos em https://openrouter.ai/credits "
            "(modelos :free podem exigir saldo ou limite diário).\n"
            "• Em https://openrouter.ai/settings/privacy activa "
            "«Model training» para modelos gratuitos.\n"
            "• Experimenta desligar «Raciocínio» no compositor.\n\n"
            f"Detalhe técnico: HTTP {status}: {detail}"
        )
    if status == 429:
        return (
            "Limite de pedidos do OpenRouter (429). "
            "Aguarda alguns minutos ou adiciona créditos.\n\n"
            f"Detalhe técnico: HTTP {status}: {detail}"
        )
    return f"HTTP {status}: {detail}"

# Luna API — deploy Railway / Docker (billing + LLM cloud opcional)
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LUNA_DEPLOY_MODE=cloud \
    LUNA_SERVER_HOST=0.0.0.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Railway define PORT em runtime
CMD ["sh", "-c", "uvicorn luna.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

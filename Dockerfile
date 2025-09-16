FROM python:3.11-slim

RUN apt-get update && apt-get install -y stockfish

WORKDIR /app
COPY backend/ /app
COPY frontend/ /app/frontend

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000
CMD ["python", "app.py"]
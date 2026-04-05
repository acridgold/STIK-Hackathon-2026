def _get_pool():
    global _pool
    if _pool is None:
        # Пытаемся взять готовую строку подключения из переменных окружения
        db_url = os.getenv("DATABASE_URL")

        if db_url:
            # Если DATABASE_URL есть, используем его
            _pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=db_url
            )
        else:
            # Фолбэк для локальной разработки (оставляем как было)
            _pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", 5432)),
                dbname=os.getenv("DB_NAME", "global_erp_db"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
            )
    return _pool
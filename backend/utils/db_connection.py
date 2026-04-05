import psycopg2
import psycopg2.pool
import psycopg2.extras
from contextlib import contextmanager
import os

_pool = None

def _get_pool():
    global _pool
    if _pool is None:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            _pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=db_url)
        else:
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

# ВОТ ЭТА ФУНКЦИЯ ДОЛЖНА БЫТЬ ОБЯЗАТЕЛЬНО:
@contextmanager
def get_connection():
    conn = _get_pool().getconn()
    try:
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _get_pool().putconn(conn)
from typing import List, Dict, Optional

from repositories.base import CompanyRepositoryInterface
from utils.db_connection import get_connection


class CompanyRepository(CompanyRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM companies ORDER BY company_id;")
                return [dict(row) for row in cur.fetchall()]

    def create(self, data: Dict) -> Dict:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO companies (company_code, company_name)
                    VALUES (%(company_code)s, %(company_name)s)
                    RETURNING *;
                    """,
                    data,
                )
                return dict(cur.fetchone())

    def update(self, company_id: str, data: Dict) -> Optional[Dict]:
        fields = ", ".join(f"{k} = %({k})s" for k in data)
        if not fields:
            return None
        data["company_id"] = company_id
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE companies SET {fields} WHERE company_id = %(company_id)s RETURNING *;",
                    data,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, company_id: str) -> bool:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM companies WHERE company_id = %s;", (company_id,)
                )
                return cur.rowcount > 0


company_repository: CompanyRepositoryInterface = CompanyRepository()
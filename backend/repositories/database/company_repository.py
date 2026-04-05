from typing import List, Dict, Optional

from repositories.base import CompanyRepositoryInterface
from utils.convert_id_to_int import safe_int
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
        company_id_int = safe_int(company_id)
        if company_id_int is None:
            return None

        if not data:
            return self.get_by_id(company_id)

        fields = ", ".join(f"{k} = %({k})s" for k in data.keys())

        params = data.copy()
        params["company_id"] = company_id_int

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE companies 
                    SET {fields} 
                    WHERE company_id = %(company_id)s 
                    RETURNING *;
                    """,
                    params,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, company_id: str) -> bool:
        company_id_int = safe_int(company_id)
        if company_id_int is None:
            return False

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM companies WHERE company_id = %s;",
                    (company_id_int,)   # передаём как int
                )
                return cur.rowcount > 0


    def get_by_id(self, company_id: str) -> Optional[Dict]:
        company_id_int = safe_int(company_id)
        if company_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM companies WHERE company_id = %s;",
                    (company_id_int,)
                )
                row = cur.fetchone()
                return dict(row) if row else None


company_repository: CompanyRepositoryInterface = CompanyRepository()
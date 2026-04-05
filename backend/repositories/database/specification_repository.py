from typing import Dict, List, Optional

from repositories.base import SpecificationRepositoryInterface
from utils.db_connection import get_connection

class SpecificationRepository(SpecificationRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM v_specifications_full ORDER BY id;"
                )
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, spec_id: str) -> Optional[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM v_specifications_full WHERE id = %s;",
                    (spec_id,)
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(self, data: Dict) -> Dict:
        """
        Ожидаемые ключи data: doc_date (опционально), doc_number, company_id.
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO specifications (doc_date, doc_number, company_id)
                    VALUES (
                        COALESCE(%(doc_date)s, CURRENT_DATE),
                        %(doc_number)s,
                        %(company_id)s
                    )
                    RETURNING *;
                    """,
                    {
                        "doc_date": data.get("doc_date"),
                        "doc_number": data["doc_number"],
                        "company_id": data["company_id"],
                    },
                )
                return dict(cur.fetchone())

    def update(self, spec_id: str, data: Dict) -> Optional[Dict]:
        fields = ", ".join(f"{k} = %({k})s" for k in data)
        if not fields:
            return None
        data["spec_id"] = spec_id
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE specifications SET {fields} WHERE document_id = %(spec_id)s RETURNING *;",
                    data,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, spec_id: str) -> bool:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM specifications WHERE document_id = %s;", (spec_id,)
                )
                return cur.rowcount > 0

specification_repository: SpecificationRepositoryInterface = SpecificationRepository()

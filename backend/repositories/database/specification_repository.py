from typing import Dict, List, Optional

from repositories.base import SpecificationRepositoryInterface
from utils.convert_id_to_int import safe_int
from utils.db_connection import get_connection


class SpecificationRepository(SpecificationRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Временно используем базовую таблицу, пока нет view
                cur.execute(
                    """
                    SELECT 
                        document_id AS id,
                        doc_date,
                        doc_number,
                        company_id,
                        (SELECT company_name FROM companies c WHERE c.company_id = s.company_id) AS company_name
                    FROM specifications s
                    ORDER BY document_id;
                    """
                )
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, spec_id: str) -> Optional[Dict]:
        spec_id_int = safe_int(spec_id)
        if spec_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 
                        document_id AS id,
                        doc_date,
                        doc_number,
                        company_id,
                        (SELECT company_name FROM companies c WHERE c.company_id = s.company_id) AS company_name
                    FROM specifications s
                    WHERE document_id = %s;
                    """,
                    (spec_id_int,)
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(self, data: Dict) -> Dict:
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
                    RETURNING 
                        document_id AS id,
                        doc_date,
                        doc_number,
                        company_id;
                    """,
                    {
                        "doc_date": data.get("doc_date"),
                        "doc_number": data["doc_number"],
                        "company_id": data["company_id"],
                    },
                )
                return dict(cur.fetchone())

    def update(self, spec_id: str, data: Dict) -> Optional[Dict]:
        spec_id_int = safe_int(spec_id)
        if spec_id_int is None:
            return None

        if not data:
            return self.get_by_id(spec_id)

        fields = ", ".join(f"{k} = %({k})s" for k in data.keys())
        params = data.copy()
        params["spec_id"] = spec_id_int

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE specifications 
                    SET {fields} 
                    WHERE document_id = %(spec_id)s 
                    RETURNING 
                        document_id AS id,
                        doc_date,
                        doc_number,
                        company_id;
                    """,
                    params,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, spec_id: str) -> bool:
        spec_id_int = safe_int(spec_id)
        if spec_id_int is None:
            return False

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM specifications WHERE document_id = %s;",
                    (spec_id_int,)
                )
                return cur.rowcount > 0


specification_repository: SpecificationRepositoryInterface = SpecificationRepository()
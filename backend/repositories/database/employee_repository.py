from typing import Dict, List, Optional

from repositories.base import EmployeeRepositoryInterface
from utils.db_connection import get_connection

class EmployeeRepository(EmployeeRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM v_employees_full ORDER BY id;"
                )
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, employee_id: str) -> Optional[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM v_employees_full WHERE id = %s;",
                    (employee_id,)
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(self, data: Dict) -> Dict:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO employees (full_name, company_id, email)
                    VALUES (%(full_name)s, %(company_id)s, %(email)s)
                    RETURNING *;
                    """,
                    data,
                )
                return dict(cur.fetchone())

    def update(self, employee_id: str, data: Dict) -> Optional[Dict]:
        fields = ", ".join(f"{k} = %({k})s" for k in data)
        if not fields:
            return None
        data["employee_id"] = employee_id
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE employees SET {fields} WHERE employee_id = %(employee_id)s RETURNING *;",
                    data,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, employee_id: str) -> bool:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM employees WHERE employee_id = %s;", (employee_id,)
                )
                return cur.rowcount > 0

    def find_similar(self, full_name: str, company_id: int) -> List[Dict]:
        """Ищет сотрудников с тем же именем в той же компании."""
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM employees
                    WHERE full_name = %s AND company_id = %s;
                    """,
                    (full_name, company_id),
                )
                return [dict(row) for row in cur.fetchall()]

employee_repository: EmployeeRepositoryInterface = EmployeeRepository()

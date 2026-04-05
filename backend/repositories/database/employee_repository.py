from typing import Dict, List, Optional

from repositories.base import EmployeeRepositoryInterface
from utils.convert_id_to_int import safe_int
from utils.db_connection import get_connection


class EmployeeRepository(EmployeeRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM v_employees_full ORDER BY id;")
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, employee_id: str) -> Optional[Dict]:
        employee_id_int = safe_int(employee_id)
        if employee_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM v_employees_full WHERE id = %s;",
                    (employee_id_int,)
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
        employee_id_int = safe_int(employee_id)
        if employee_id_int is None:
            return None

        if not data:
            return self.get_by_id(employee_id)

        fields = ", ".join(f"{k} = %({k})s" for k in data.keys())
        params = data.copy()
        params["employee_id"] = employee_id_int

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE employees 
                    SET {fields} 
                    WHERE employee_id = %(employee_id)s 
                    RETURNING *;
                    """,
                    params,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, employee_id: str) -> bool:
        employee_id_int = safe_int(employee_id)
        if employee_id_int is None:
            return False

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM employees WHERE employee_id = %s;",
                    (employee_id_int,)
                )
                return cur.rowcount > 0

    def find_similar(self, full_name: str, company_id: int) -> List[Dict]:
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
from typing import List, Dict, Optional

from repositories.base import CourseRepositoryInterface
from utils.convert_id_to_int import safe_int
from utils.db_connection import get_connection


class CourseRepository(CourseRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT course_id AS id, course_name, description, duration_days, price_per_person FROM courses ORDER BY course_id;")
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, course_id: str) -> Optional[Dict]:
        course_id_int = safe_int(course_id)
        if course_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM courses WHERE course_id = %s;",
                    (course_id_int,)
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(self, data: Dict) -> Dict:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO courses (course_name, description, duration_days, price_per_person)
                    VALUES (%(course_name)s, %(description)s, %(duration_days)s, %(price_per_person)s)
                    RETURNING *;
                    """,
                    data,
                )
                return dict(cur.fetchone())

    def update(self, course_id: str, data: Dict) -> Optional[Dict]:
        course_id_int = safe_int(course_id)
        if course_id_int is None:
            return None

        if not data:
            return self.get_by_id(course_id)

        fields = ", ".join(f"{k} = %({k})s" for k in data.keys())
        params = data.copy()
        params["course_id"] = course_id_int

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE courses 
                    SET {fields} 
                    WHERE course_id = %(course_id)s 
                    RETURNING *;
                    """,
                    params,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, course_id: str) -> bool:
        course_id_int = safe_int(course_id)
        if course_id_int is None:
            return False

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM courses WHERE course_id = %s;",
                    (course_id_int,)
                )
                return cur.rowcount > 0

    def get_price_history(self, course_id: str) -> List[Dict]:
        course_id_int = safe_int(course_id)
        if course_id_int is None:
            return []

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        group_id,
                        start_date,
                        end_date,
                        actual_price_per_person,
                        status
                    FROM study_groups
                    WHERE course_id = %s
                    ORDER BY start_date;
                    """,
                    (course_id_int,),
                )
                return [dict(row) for row in cur.fetchall()]


course_repository: CourseRepositoryInterface = CourseRepository()
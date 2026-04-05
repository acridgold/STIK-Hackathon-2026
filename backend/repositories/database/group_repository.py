from typing import Dict, List, Optional

from repositories.base import GroupRepositoryInterface
from utils.convert_id_to_int import safe_int
from utils.db_connection import get_connection


class GroupRepository(GroupRepositoryInterface):

    def get_all(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM v_study_groups_full ORDER BY id;")
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, group_id: str) -> Optional[Dict]:
        group_id_int = safe_int(group_id)
        if group_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM v_study_groups_full WHERE id = %s;",
                    (group_id_int,)
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(self, data: Dict) -> Dict:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO study_groups
                        (course_id, start_date, end_date, actual_price_per_person, status, specification_id)
                    VALUES (
                        %(course_id)s,
                        %(start_date)s,
                        %(end_date)s,
                        (SELECT price_per_person FROM courses WHERE course_id = %(course_id)s),
                        COALESCE(%(status)s, 'Планируется'),
                        %(specification_id)s
                    )
                    RETURNING *;
                    """,
                    {
                        "course_id": data["course_id"],
                        "start_date": data["start_date"],
                        "end_date": data["end_date"],
                        "status": data.get("status"),
                        "specification_id": data.get("specification_id"),
                    },
                )
                return dict(cur.fetchone())

    def update(self, group_id: str, data: Dict) -> Optional[Dict]:
        group_id_int = safe_int(group_id)
        if group_id_int is None:
            return None

        if not data:
            return self.get_by_id(group_id)

        fields = ", ".join(f"{k} = %({k})s" for k in data.keys())
        params = data.copy()
        params["group_id"] = group_id_int

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE study_groups 
                    SET {fields} 
                    WHERE group_id = %(group_id)s 
                    RETURNING *;
                    """,
                    params,
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def delete(self, group_id: str) -> bool:
        group_id_int = safe_int(group_id)
        if group_id_int is None:
            return False

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM study_groups WHERE group_id = %s;",
                    (group_id_int,)
                )
                return cur.rowcount > 0


group_repository: GroupRepositoryInterface = GroupRepository()
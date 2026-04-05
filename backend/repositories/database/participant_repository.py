from typing import Dict, List, Optional

from repositories.base import ParticipantRepositoryInterface
from utils.convert_id_to_int import safe_int
from utils.db_connection import get_connection


class ParticipantRepository(ParticipantRepositoryInterface):

    def get_all_by_group(self, group_id: str) -> List[Dict]:
        group_id_int = safe_int(group_id)
        if group_id_int is None:
            return []

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        gp.participant_id,
                        gp.group_id,
                        gp.employee_id,
                        e.full_name,
                        e.email,
                        gp.completion_percentage
                    FROM group_participants gp
                    JOIN employees e ON gp.employee_id = e.employee_id
                    WHERE gp.group_id = %s
                    ORDER BY gp.participant_id;
                    """,
                    (group_id_int,),
                )
                return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, group_id: str, participant_id: str) -> Optional[Dict]:
        group_id_int = safe_int(group_id)
        participant_id_int = safe_int(participant_id)
        if group_id_int is None or participant_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        gp.participant_id,
                        gp.group_id,
                        gp.employee_id,
                        e.full_name,
                        e.email,
                        gp.completion_percentage
                    FROM group_participants gp
                    JOIN employees e ON gp.employee_id = e.employee_id
                    WHERE gp.group_id = %s AND gp.participant_id = %s;
                    """,
                    (group_id_int, participant_id_int),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def add(self, group_id: str, employee_id: str) -> Optional[Dict]:
        group_id_int = safe_int(group_id)
        employee_id_int = safe_int(employee_id)
        if group_id_int is None or employee_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                # Проверяем существование группы и сотрудника
                cur.execute(
                    "SELECT 1 FROM study_groups WHERE group_id = %s;", (group_id_int,)
                )
                if not cur.fetchone():
                    return None

                cur.execute(
                    "SELECT 1 FROM employees WHERE employee_id = %s;", (employee_id_int,)
                )
                if not cur.fetchone():
                    return None

                cur.execute(
                    """
                    INSERT INTO group_participants (group_id, employee_id)
                    VALUES (%s, %s)
                    ON CONFLICT (group_id, employee_id) DO NOTHING
                    RETURNING *;
                    """,
                    (group_id_int, employee_id_int),
                )
                row = cur.fetchone()
                return dict(row) if row else None   # None если уже существовал

    def remove(self, group_id: str, participant_id: str) -> bool:
        group_id_int = safe_int(group_id)
        participant_id_int = safe_int(participant_id)
        if group_id_int is None or participant_id_int is None:
            return False

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM group_participants
                    WHERE group_id = %s AND participant_id = %s;
                    """,
                    (group_id_int, participant_id_int),
                )
                return cur.rowcount > 0

    def update_progress(
        self, group_id: str, participant_id: str, progress: float
    ) -> Optional[Dict]:
        group_id_int = safe_int(group_id)
        participant_id_int = safe_int(participant_id)
        if group_id_int is None or participant_id_int is None:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE group_participants
                    SET completion_percentage = %s
                    WHERE group_id = %s AND participant_id = %s
                    RETURNING *;
                    """,
                    (progress, group_id_int, participant_id_int),
                )
                row = cur.fetchone()
                return dict(row) if row else None


participant_repository: ParticipantRepositoryInterface = ParticipantRepository()
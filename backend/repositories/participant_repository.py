import uuid
from typing import Dict, List, Optional

from repositories.base import ParticipantRepositoryInterface


class ParticipantRepository(ParticipantRepositoryInterface):
    def __init__(self):
        # participant_id -> dict
        self.participants: Dict[str, Dict] = {}

    # ------------------------------------------------------------------ #
    #  Основные операции                                                   #
    # ------------------------------------------------------------------ #

    def get_all_by_group(self, group_id: str) -> List[Dict]:
        return [p for p in self.participants.values() if p["group_id"] == group_id]

    def get_by_id(self, group_id: str, participant_id: str) -> Optional[Dict]:
        p = self.participants.get(participant_id)
        if not p or p["group_id"] != group_id:
            return None
        return p

    def add(self, group_id: str, employee_id: str) -> Optional[Dict]:
        # Проверяем дубликат: один сотрудник — один раз в группе
        duplicate = next(
            (p for p in self.participants.values()
             if p["group_id"] == group_id and p["employee_id"] == employee_id),
            None
        )
        if duplicate:
            return duplicate

        participant_id = str(uuid.uuid4())
        participant = {
            "id": participant_id,
            "group_id": group_id,
            "employee_id": employee_id,
            "progress": 0.0,
        }

        self.participants[participant_id] = participant
        return participant

    def remove(self, group_id: str, participant_id: str) -> bool:
        p = self.participants.get(participant_id)
        if not p or p["group_id"] != group_id:
            return False
        self.participants.pop(participant_id)
        return True

    def update_progress(
        self, group_id: str, participant_id: str, progress: float
    ) -> Optional[Dict]:
        p = self.participants.get(participant_id)
        if not p or p["group_id"] != group_id:
            return None
        p["progress"] = progress
        return p


# Singleton
participant_repository: ParticipantRepositoryInterface = ParticipantRepository()
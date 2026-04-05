import uuid
from typing import Dict, List, Optional

from repositories.base import GroupRepositoryInterface
from repositories.plug.course_repository import course_repository


class GroupRepository(GroupRepositoryInterface):
    def __init__(self):
        # Учебные группы: id -> dict
        self.groups: Dict[str, Dict] = {}
        # Участники группы: group_id -> { participant_id -> dict }
        self.participants: Dict[str, Dict[str, Dict]] = {}

    # ------------------------------------------------------------------ #
    #  Вспомогательный метод: вычисляемые поля группы                     #
    # ------------------------------------------------------------------ #
    def _enrich(self, group: Dict) -> Dict:
        """Добавляет вычисляемые поля к объекту группы."""
        group_id = group["id"]
        members = list(self.participants.get(group_id, {}).values())

        # Цена курса за человека берётся из репозитория курсов
        course = course_repository.get_by_id(group.get("course_id", ""))
        price_per_person = course["price"] if course else 0

        participant_count = len(members)
        group_cost = price_per_person * participant_count

        avg_progress = (
            round(sum(m["progress"] for m in members) / participant_count, 2)
            if participant_count > 0
            else 0.0
        )

        return {
            **group,
            "price_per_person": price_per_person,
            "participant_count": participant_count,
            "group_cost": group_cost,
            "average_progress": avg_progress,
            "participants": members,
        }

    # ------------------------------------------------------------------ #
    #  CRUD групп                                                          #
    # ------------------------------------------------------------------ #
    def get_all(self) -> List[Dict]:
        return [self._enrich(g) for g in self.groups.values()]

    def get_by_id(self, group_id: str) -> Optional[Dict]:
        group = self.groups.get(group_id)
        if not group:
            return None
        return self._enrich(group)

    def create(self, data: Dict) -> Dict:
        group_id = str(uuid.uuid4())

        group = {
            "id": group_id,
            "course_id": data.get("course_id"),
            "start_date": str(data.get("start_date", "")),
            "end_date": str(data.get("end_date", "")),
            "status": data.get("status", "planned"),
            "specification_id": data.get("specification_id"),
        }

        self.groups[group_id] = group
        self.participants[group_id] = {}
        return self._enrich(group)

    def update(self, group_id: str, data: Dict) -> Optional[Dict]:
        group = self.groups.get(group_id)
        if not group:
            return None

        for key, value in data.items():
            if value is not None:
                # Даты сериализуем в строку
                group[key] = str(value) if key in ("start_date", "end_date") else value

        return self._enrich(group)

    def delete(self, group_id: str) -> bool:
        if group_id not in self.groups:
            return False
        self.groups.pop(group_id)
        self.participants.pop(group_id, None)
        return True

    # ------------------------------------------------------------------ #
    #  Участники группы                                                    #
    # ------------------------------------------------------------------ #
    def add_participant(self, group_id: str, employee_id: str) -> Optional[Dict]:
        """Добавляет участника в группу. Возвращает объект участника или None."""
        if group_id not in self.groups:
            return None

        # Проверяем дубликат
        if employee_id in self.participants[group_id]:
            return self.participants[group_id][employee_id]

        participant_id = str(uuid.uuid4())
        participant = {
            "id": participant_id,
            "group_id": group_id,
            "employee_id": employee_id,
            "progress": 0.0,
        }

        self.participants[group_id][employee_id] = participant
        return participant

    def remove_participant(self, group_id: str, participant_id: str) -> bool:
        """Удаляет участника по его ParticipantID."""
        members = self.participants.get(group_id, {})

        # Ищем по participant_id (значение словаря)
        key_to_delete = next(
            (emp_id for emp_id, p in members.items() if p["id"] == participant_id),
            None
        )
        if key_to_delete is None:
            return False

        members.pop(key_to_delete)
        return True

    def update_participant_progress(
        self, group_id: str, participant_id: str, progress: float
    ) -> Optional[Dict]:
        """Обновляет прогресс участника. Возвращает обновлённый объект или None."""
        members = self.participants.get(group_id, {})

        for participant in members.values():
            if participant["id"] == participant_id:
                participant["progress"] = progress
                return participant

        return None


# Singleton
group_repository: GroupRepositoryInterface = GroupRepository()

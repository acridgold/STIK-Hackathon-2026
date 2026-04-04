from abc import ABC, abstractmethod
from typing import List, Dict, Optional


class CompanyRepositoryInterface(ABC):
    @abstractmethod
    def get_all(self) -> List[Dict]:
        pass

    @abstractmethod
    def create(self, data: Dict) -> Dict:
        pass

    @abstractmethod
    def update(self, company_id: str, data: Dict) -> Optional[Dict]:
        pass

    @abstractmethod
    def delete(self, company_id: str) -> bool:
        pass


class CourseRepositoryInterface(ABC):
    @abstractmethod
    def get_all(self) -> List[Dict]:
        pass

    @abstractmethod
    def get_by_id(self, course_id: str) -> Optional[Dict]:
        pass

    @abstractmethod
    def create(self, data: Dict) -> Dict:
        pass

    @abstractmethod
    def update(self, course_id: str, data: Dict) -> Optional[Dict]:
        pass

    @abstractmethod
    def delete(self, course_id: str) -> bool:
        pass

    @abstractmethod
    def get_price_history(self, course_id: str) -> List[Dict]:
        pass


class EmployeeRepositoryInterface(ABC):
    @abstractmethod
    def get_all(self) -> List[Dict]:
        pass

    @abstractmethod
    def get_by_id(self, employee_id: str) -> Optional[Dict]:
        pass

    @abstractmethod
    def create(self, data: Dict) -> Dict:
        pass

    @abstractmethod
    def update(self, employee_id: str, data: Dict) -> Optional[Dict]:
        pass

    @abstractmethod
    def delete(self, employee_id: str) -> bool:
        pass


class GroupRepositoryInterface(ABC):
    @abstractmethod
    def get_all(self) -> List[Dict]:
        pass

    @abstractmethod
    def get_by_id(self, group_id: str) -> Optional[Dict]:
        pass

    @abstractmethod
    def create(self, data: Dict) -> Dict:
        pass

    @abstractmethod
    def update(self, group_id: str, data: Dict) -> Optional[Dict]:
        pass

    @abstractmethod
    def delete(self, group_id: str) -> bool:
        pass


class ParticipantRepositoryInterface(ABC):

    @abstractmethod
    def get_all_by_group(self, group_id: str) -> List[Dict]:
        """Получить всех участников группы"""
        pass

    @abstractmethod
    def get_by_id(self, group_id: str, participant_id: str) -> Optional[Dict]:
        """Получить участника группы по ID"""
        pass

    @abstractmethod
    def add(self, group_id: str, employee_id: str) -> Optional[Dict]:
        """
        Добавить участника в группу.
        Создаёт связь между сотрудником (employee_id) и группой (group_id).
        Возвращает None если группа или сотрудник не найдены.
        """
        pass

    @abstractmethod
    def remove(self, group_id: str, participant_id: str) -> bool:
        """
        Удалить участника из группы.
        Возвращает False если участник не найден.
        """
        pass

    @abstractmethod
    def update_progress(
            self, group_id: str, participant_id: str, progress: float
    ) -> Optional[Dict]:
        """
        Обновить процент завершения курса участником.
        progress — число от 0.0 до 100.0.
        Возвращает None если участник не найден.
        """
        pass


class SpecificationRepositoryInterface(ABC):
    @abstractmethod
    def get_all(self) -> List[Dict]:
        pass

    @abstractmethod
    def get_by_id(self, spec_id: str) -> Optional[Dict]:
        pass

    @abstractmethod
    def create(self, data: Dict) -> Dict:
        pass

    @abstractmethod
    def update(self, spec_id: str, data: Dict) -> Optional[Dict]:
        pass

    @abstractmethod
    def delete(self, spec_id: str) -> bool:
        pass

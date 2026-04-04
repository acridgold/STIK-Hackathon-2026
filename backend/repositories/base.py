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

    @abstractmethod
    def add_participant(self, group_id: str, employee_id: str) -> Optional[Dict]:
        pass

    @abstractmethod
    def remove_participant(self, group_id: str, participant_id: str) -> bool:
        pass

    @abstractmethod
    def update_participant_progress(
        self, group_id: str, participant_id: str, progress: float
    ) -> Optional[Dict]:
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

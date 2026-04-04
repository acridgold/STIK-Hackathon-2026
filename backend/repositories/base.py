from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


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
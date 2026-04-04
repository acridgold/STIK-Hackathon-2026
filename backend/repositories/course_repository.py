import uuid
from datetime import datetime
from typing import Dict, List, Optional
from repositories.base import CourseRepositoryInterface


class CourseRepository(CourseRepositoryInterface):
    def __init__(self):
        self.courses: Dict[str, Dict] = {}
        self.price_history: Dict[str, List[Dict]] = {}

    def get_all(self) -> List[Dict]:
        return list(self.courses.values())

    def get_by_id(self, course_id: str) -> Optional[Dict]:
        return self.courses.get(course_id)

    def create(self, data: Dict) -> Dict:
        course_id = str(uuid.uuid4())

        course = {
            "id": course_id,
            "title": data.get("title"),
            "description": data.get("description"),
            "duration": data.get("duration"),
            "price": data.get("price"),
        }

        self.courses[course_id] = course

        # Инициализируем историю цен
        self.price_history[course_id] = [{
            "price": data.get("price"),
            "date": datetime.utcnow().isoformat()
        }]

        return course

    def update(self, course_id: str, data: Dict) -> Optional[Dict]:
        course = self.courses.get(course_id)
        if not course:
            return None

        # Проверяем изменение цены
        new_price = data.get("price")
        if new_price is not None and new_price != course.get("price"):
            if course_id not in self.price_history:
                self.price_history[course_id] = []

            self.price_history[course_id].append({
                "price": new_price,
                "date": datetime.utcnow().isoformat()
            })

        # Обновляем только переданные поля (частичное обновление)
        for key, value in data.items():
            if value is not None:
                course[key] = value

        return course

    def delete(self, course_id: str) -> bool:
        if course_id not in self.courses:
            return False

        self.courses.pop(course_id)
        self.price_history.pop(course_id, None)
        return True

    def get_price_history(self, course_id: str) -> List[Dict]:
        return self.price_history.get(course_id, [])


# Singleton
course_repository: CourseRepositoryInterface = CourseRepository()
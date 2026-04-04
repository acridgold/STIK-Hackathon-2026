from flask import Blueprint, request, jsonify
from repositories.database.course_repository import course_repository
from schemas.course_schema import CourseCreate, CourseUpdate
from pydantic import ValidationError

courses_bp = Blueprint("courses", __name__)


@courses_bp.route("", methods=["GET"])
def get_courses():
    """Получить все курсы"""
    courses = course_repository.get_all()
    return jsonify(courses)

@courses_bp.route("/<course_id>", methods=["GET"])
def get_course(course_id: str):
    course = course_repository.get_by_id(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    return jsonify(course)

@courses_bp.route("", methods=["POST"])
def create_course():
    """Создать новый курс"""
    try:
        data = CourseCreate.model_validate(request.json)
        course = course_repository.create(data.model_dump())
        return jsonify(course), 201
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@courses_bp.route("/<course_id>", methods=["PUT"])
def update_course(course_id: str):
    """Обновить курс"""
    try:
        data = CourseUpdate.model_validate(request.json)
        # exclude_unset=True — обновляем только те поля, которые пришли в запросе
        course = course_repository.update(course_id, data.model_dump(exclude_unset=True))

        if not course:
            return jsonify({"message": "Course not found"}), 404

        return jsonify(course)
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@courses_bp.route("/<course_id>", methods=["DELETE"])
def delete_course(course_id: str):
    """Удалить курс"""
    success = course_repository.delete(course_id)

    if not success:
        return jsonify({"message": "Course not found"}), 404

    return jsonify({"message": "Course successfully deleted"}), 200


@courses_bp.route("/<course_id>/price-history", methods=["GET"])
def get_price_history(course_id: str):
    """Получить историю изменения цены курса"""
    history = course_repository.get_price_history(course_id)
    return jsonify(history)
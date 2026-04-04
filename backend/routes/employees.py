from flask import Blueprint, request, jsonify
from repositories.plug.employee_repository import employee_repository
from schemas.employee_schema import EmployeeCreate, EmployeeUpdate
from pydantic import ValidationError

employees_bp = Blueprint("employees", __name__)


@employees_bp.route("", methods=["GET"])
def get_employees():
    """Получить всех сотрудников"""
    employees = employee_repository.get_all()
    return jsonify(employees)


@employees_bp.route("", methods=["POST"])
def create_employee():
    """Создать сотрудника"""
    try:
        data = EmployeeCreate.model_validate(request.json)
        employee = employee_repository.create(data.model_dump())
        return jsonify(employee), 201
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@employees_bp.route("/<employee_id>", methods=["PUT"])
def update_employee(employee_id: str):
    """Обновить сотрудника"""
    try:
        data = EmployeeUpdate.model_validate(request.json)
        employee = employee_repository.update(employee_id, data.model_dump(exclude_unset=True))

        if not employee:
            return jsonify({"message": "Employee not found"}), 404

        return jsonify(employee)
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@employees_bp.route("/<employee_id>", methods=["DELETE"])
def delete_employee(employee_id: str):
    """Удалить сотрудника"""
    result = employee_repository.delete(employee_id)

    if not result:
        return jsonify({"message": "Employee not found"}), 404

    return jsonify({"message": "Employee successfully deleted"}), 200

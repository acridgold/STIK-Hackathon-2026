from flask import Blueprint, request, jsonify
from repositories.plug.group_repository import group_repository
from schemas.group_schema import (
    GroupCreate, GroupUpdate,
    ParticipantAdd, ParticipantProgressUpdate,
)
from pydantic import ValidationError

groups_bp = Blueprint("groups", __name__)


# ------------------------------------------------------------------ #
#  CRUD групп                                                          #
# ------------------------------------------------------------------ #

@groups_bp.route("", methods=["GET"])
def get_groups():
    """Получить все группы"""
    groups = group_repository.get_all()
    return jsonify(groups)


@groups_bp.route("/<group_id>", methods=["GET"])
def get_group(group_id: str):
    """Получить конкретную группу"""
    group = group_repository.get_by_id(group_id)

    if not group:
        return jsonify({"message": "Group not found"}), 404

    return jsonify(group)


@groups_bp.route("", methods=["POST"])
def create_group():
    """Создать группу"""
    try:
        data = GroupCreate.model_validate(request.json)
        group = group_repository.create(data.model_dump())
        return jsonify(group), 201
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@groups_bp.route("/<group_id>", methods=["PUT"])
def update_group(group_id: str):
    """Обновить группу"""
    try:
        data = GroupUpdate.model_validate(request.json)
        group = group_repository.update(group_id, data.model_dump(exclude_unset=True))

        if not group:
            return jsonify({"message": "Group not found"}), 404

        return jsonify(group)
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@groups_bp.route("/<group_id>", methods=["DELETE"])
def delete_group(group_id: str):
    """Удалить группу"""
    result = group_repository.delete(group_id)

    if not result:
        return jsonify({"message": "Group not found"}), 404

    return jsonify({"message": "Group successfully deleted"}), 200


# ------------------------------------------------------------------ #
#  Участники группы                                                    #
# ------------------------------------------------------------------ #

@groups_bp.route("/<group_id>/participants", methods=["POST"])
def add_participant(group_id: str):
    """Добавить участника в группу"""
    try:
        data = ParticipantAdd.model_validate(request.json)
        participant = group_repository.add_participant(group_id, data.employee_id)

        if participant is None:
            return jsonify({"message": "Group not found"}), 404

        return jsonify(participant), 201
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@groups_bp.route("/<group_id>/participants/<participant_id>", methods=["DELETE"])
def remove_participant(group_id: str, participant_id: str):
    """Удалить участника из группы"""
    result = group_repository.remove_participant(group_id, participant_id)

    if not result:
        return jsonify({"message": "Participant not found"}), 404

    return jsonify({"message": "Participant successfully removed"}), 200


@groups_bp.route("/<group_id>/participants/<participant_id>/progress", methods=["PATCH"])
def update_participant_progress(group_id: str, participant_id: str):
    """Обновить прогресс участника"""
    try:
        data = ParticipantProgressUpdate.model_validate(request.json)
        participant = group_repository.update_participant_progress(
            group_id, participant_id, data.progress
        )

        if not participant:
            return jsonify({"message": "Participant not found"}), 404

        return jsonify(participant)
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400

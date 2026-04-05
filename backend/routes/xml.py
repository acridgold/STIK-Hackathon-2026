from flask import Blueprint, request, jsonify, Response
import xmltodict
from repositories.database.course_repository import course_repository
from repositories.database.employee_repository import employee_repository
from repositories.database.group_repository import group_repository

from utils.xml_parser import XMLParser   # ← импортируем новый класс

xml_bp = Blueprint("xml", __name__)


@xml_bp.route('/upload', methods=['POST'])
def upload_xml():
    file = request.files.get('file')
    data_type = request.form.get('type')

    if not file or not data_type:
        return jsonify({"error": "Missing file or type"}), 400

    try:
        xml_data = xmltodict.parse(file.read())

        if data_type == 'courses':
            count = XMLParser.save_courses_from_xml(xml_data, course_repository)
        elif data_type == 'employees':
            count = XMLParser.save_employees_from_xml(xml_data, employee_repository)
        elif data_type == 'groups':
            count = XMLParser.save_groups_from_xml(xml_data, group_repository)
        else:
            return jsonify({"error": "Invalid type"}), 400

        return jsonify({"success": True, "count": count}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# @xml_bp.route('/export/<data_type>', methods=['GET'])
# def export_xml(data_type):
#     try:
#         if data_type == 'courses':
#             data = XMLParser.fetch_to_xml(course_repository)
#         elif data_type == 'employees':
#             data = XMLParser.fetch_to_xml(employee_repository)
#         elif data_type == 'groups':
#             data = XMLParser.fetch_to_xml(group_repository)
#         else:
#             return jsonify({"error": "Invalid type"}), 400
#
#         xml_data = xmltodict.unparse({"root": {data_type: data}}, pretty=True)
#         return Response(xml_data, content_type='application/xml')
#
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#

@xml_bp.route('/sync', methods=['POST'])
def sync_xml():
    courses_file = request.files.get('courses')
    employees_file = request.files.get('employees')
    groups_file = request.files.get('groups')

    if not courses_file or not employees_file or not groups_file:
        return jsonify({"error": "Missing one or more files"}), 400

    try:
        courses_data = xmltodict.parse(courses_file.read())
        employees_data = xmltodict.parse(employees_file.read())
        groups_data = xmltodict.parse(groups_file.read())

        XMLParser.save_courses_from_xml(courses_data, course_repository)
        XMLParser.save_employees_from_xml(employees_data, employee_repository)
        XMLParser.save_groups_from_xml(groups_data, group_repository)

        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Импорт фреймворка Flask и функций для работы с HTTP запросами
from flask import Blueprint, request, jsonify, Response
# Импорт репозиториев для сохранения и извлечения данных XML в БД
from repositories.database.xml_repository import (
    xml_course_repository,
    xml_employee_repository,
    xml_group_repository,
)
# Библиотека для преобразования между XML и Python словарями
import xmltodict

# Создание Blueprint для всех XML маршрутов
xml_bp = Blueprint("xml", __name__)

# Маршрут для загрузки одного типа данных из XML файла
@xml_bp.route('/upload', methods=['POST'])
def upload_xml():
    # Получение XML файла и типа данных из запроса
    file = request.files.get('file')
    data_type = request.form.get('type')

    if not file or not data_type:
        return jsonify({"error": "Missing file or type"}), 400

    try:
        # Преобразование XML в Python словарь
        xml_data = xmltodict.parse(file.read())
        # Выбор репозитория в зависимости от типа данных и сохранение
        if data_type == 'courses':
            xml_course_repository.save_from_xml(xml_data)
        elif data_type == 'employees':
            xml_employee_repository.save_from_xml(xml_data)
        elif data_type == 'groups':
            xml_group_repository.save_from_xml(xml_data)
        else:
            return jsonify({"error": "Invalid type"}), 400
        # Возврат успешного ответа с количеством записей
        return jsonify({"success": True, "count": len(xml_data)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Маршрут для экспорта данных в XML формате
@xml_bp.route('/export/<data_type>', methods=['GET'])
def export_xml(data_type):
    try:
        # Выбор репозитория и извлечение данных из БД
        if data_type == 'courses':
            data = xml_course_repository.fetch_to_xml()
        elif data_type == 'employees':
            data = xml_employee_repository.fetch_to_xml()
        elif data_type == 'groups':
            data = xml_group_repository.fetch_to_xml()
        else:
            return jsonify({"error": "Invalid type"}), 400

        # Преобразование Python словаря в XML строку
        xml_data = xmltodict.unparse({"root": data}, pretty=True)
        # Возврат XML в ответе с правильным типом контента
        return Response(xml_data, content_type='application/xml')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Маршрут для синхронизации трех типов данных одновременно из трех XML файлов
@xml_bp.route('/sync', methods=['POST'])
def sync_xml():
    # Получение трех XML файлов из запроса
    courses_file = request.files.get('courses')
    employees_file = request.files.get('employees')
    groups_file = request.files.get('groups')

    # Проверка наличия всех трех обязательных файлов
    if not courses_file or not employees_file or not groups_file:
        return jsonify({"error": "Missing one or more files"}), 400

    try:
        # Преобразование всех трех XML файлов в Python словари
        courses_data = xmltodict.parse(courses_file.read())
        employees_data = xmltodict.parse(employees_file.read())
        groups_data = xmltodict.parse(groups_file.read())

        # Сохранение данных всех трех типов через репозитории
        xml_course_repository.save_from_xml(courses_data)
        xml_employee_repository.save_from_xml(employees_data)
        xml_group_repository.save_from_xml(groups_data)

        # Возврат успешного ответа
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
